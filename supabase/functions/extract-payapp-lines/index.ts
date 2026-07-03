// Parse an AIA G703 continuation sheet from a pay-application PDF into structured
// line items + progress, and upsert them into sov_line_items / pay_app_line_progress.
// This is what makes the Quantities & Progress dashboard auto-update: build/attach
// a new pay app PDF, call this, and the latest quantities-to-date flow through.
//
// Input:  { payAppId }
// Uses Claude (document vision) for robust table extraction. Service-role upserts.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const TOOL = {
  name: "g703_lines",
  description: "Return every line item from the AIA G703 continuation sheet(s).",
  input_schema: {
    type: "object",
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_no: { type: "string", description: "Item number, e.g. '1', '15', '17', '17.1'" },
            section: { type: "string", enum: ["base", "change_order"], description: "Contract Lines = base; Change Orders section = change_order" },
            description: { type: "string", description: "Description of work / budget code (cleaned)" },
            unit: { type: "string", description: "Unit of measure if shown or clearly implied (LF, EA, LS, TON, CY); else empty" },
            scheduled_qty: { type: "number", description: "Column C QTY (scheduled quantity)" },
            unit_price: { type: "number", description: "Column C UNIT PRICE" },
            scheduled_value: { type: "number", description: "Column C VALUE (scheduled value)" },
            qty_to_date: { type: "number", description: "Column G QTY (total completed & stored to date)" },
            value_to_date: { type: "number", description: "Column G VALUE (total completed & stored to date)" },
            pct_complete: { type: "number", description: "Column G % (0-100)" },
            retainage: { type: "number", description: "Column I retainage" },
            co_reference: { type: "string", description: "For change_order lines, the PCO/CE reference e.g. 'PCO #001'; else empty" },
          },
          required: ["item_no", "section", "description", "scheduled_qty", "unit_price", "scheduled_value", "qty_to_date", "value_to_date", "pct_complete"],
        },
      },
    },
    required: ["lines"],
  },
};

const SYSTEM = `You extract the line items from an AIA G703 Continuation Sheet inside a pay application PDF.
- There are two sections: "Contract Lines" (base contract) and "Change Orders". Tag each line with section accordingly.
- For each numbered line item return the SCHEDULED VALUE block (column C: qty, unit price, value), the TOTAL COMPLETED AND STORED TO DATE block (column G: qty, value, %), and retainage (column I).
- Skip header rows, SUBTOTAL/TOTALS/GRAND TOTALS rows, and any blank rows.
- In the Change Orders section a CO often appears as a header row (e.g. "PCCO#001") plus a priced sub-row (e.g. "17.1.1"); return ONE line per change order using the priced sub-row's figures, item_no = the top CO item number (e.g. "17"), and co_reference = the PCO/CO label.
- Infer a unit of measure only when obvious from the description (pipe → LF, manholes → EA, lump-sum services → LS); otherwise leave unit empty.
- Percentages are 0-100. Always call the g703_lines tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { payAppId } = await req.json();
    if (!payAppId) return json({ error: "payAppId required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve the pay app + its contract/project/tenant + PDF.
    const { data: pa, error: paErr } = await admin
      .from("prime_contract_pay_apps")
      .select("id, pay_app_no, pdf_path, prime_contract_id, prime_contracts!inner(project_id, tenant_id)")
      .eq("id", payAppId).single();
    if (paErr || !pa) return json({ error: `Pay app not found: ${paErr?.message ?? ""}` }, 404);
    if (!pa.pdf_path) return json({ error: "Pay app has no PDF to extract from." }, 400);
    const primeId = pa.prime_contract_id as string;
    const projectId = (pa as any).prime_contracts.project_id as string;
    const tenantId = (pa as any).prime_contracts.tenant_id as string;

    // Fetch the PDF and base64 it for Claude.
    const pdfRes = await fetch(pa.pdf_path);
    if (!pdfRes.ok) return json({ error: `Could not fetch pay-app PDF (${pdfRes.status})` }, 502);
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: "Extract every G703 continuation-sheet line item (base + change orders)." },
        ] }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "g703_lines" },
      }),
    });
    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    await logAiUsage({ req, skill: "payapp_lines_extract", model: MODEL, anthropicJson: data, projectId: null });
    const toolUse = (data?.content ?? []).find((c: any) => c.type === "tool_use");
    const lines = toolUse?.input?.lines as any[] | undefined;
    if (!Array.isArray(lines) || lines.length === 0) return json({ error: "No lines extracted" }, 502);

    // Prime change orders, to link CO lines by scheduled value.
    const { data: cos } = await admin.from("change_orders")
      .select("id, amount").eq("project_id", projectId).eq("co_type", "PCO");
    const matchCo = (val: number) => (cos ?? []).find((c: any) => Math.abs(Number(c.amount) - val) < 0.5)?.id ?? null;

    let upLines = 0, upProg = 0;
    for (const [i, ln] of lines.entries()) {
      const kind = ln.section === "change_order" ? "change_order" : "base";
      // Upsert the scheduled line item (constant across pay apps; later apps add COs).
      const { data: li, error: liErr } = await admin.from("sov_line_items").upsert({
        tenant_id: tenantId, project_id: projectId, prime_contract_id: primeId,
        item_no: String(ln.item_no), kind,
        change_order_id: kind === "change_order" ? matchCo(Number(ln.scheduled_value)) : null,
        budget_code: ln.co_reference || null,
        description: ln.description, unit: ln.unit || null,
        scheduled_qty: Number(ln.scheduled_qty) || 0, unit_price: Number(ln.unit_price) || 0,
        scheduled_value: Number(ln.scheduled_value) || 0, sort_order: i,
        updated_at: new Date().toISOString(),
      }, { onConflict: "prime_contract_id,item_no" }).select("id").single();
      if (liErr || !li) continue;
      upLines++;

      const { error: pErr } = await admin.from("pay_app_line_progress").upsert({
        tenant_id: tenantId, pay_app_id: pa.id, sov_line_item_id: li.id,
        qty_to_date: Number(ln.qty_to_date) || 0, value_to_date: Number(ln.value_to_date) || 0,
        pct_complete: Number(ln.pct_complete) || 0, retainage: Number(ln.retainage) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "pay_app_id,sov_line_item_id" });
      if (!pErr) upProg++;
    }

    return json({ ok: true, pay_app_no: pa.pay_app_no, lines_extracted: lines.length, sov_lines_upserted: upLines, progress_upserted: upProg });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
