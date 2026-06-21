// Parse the priced line items from a change-order's signed PDF into
// change_order_line_items, powering the per-CO drill-down on the Quantities &
// Progress dashboard. Input: { changeOrderId }.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const TOOL = {
  name: "co_lines",
  description: "Return the priced line items from the change-order proposal's pricing table.",
  input_schema: {
    type: "object",
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            line_no: { type: "number", description: "1-based order in the pricing table" },
            description: { type: "string" },
            unit: { type: "string", description: "Unit of measure (EA/LS/LF/DAY/MO/HMO…); empty if none" },
            qty: { type: "number" },
            unit_price: { type: "number" },
            extended_value: { type: "number", description: "Extended/line total in dollars" },
            basis: { type: "string", description: "Firm / Allowance / Nominal / No charge etc.; empty if none" },
          },
          required: ["line_no", "description", "qty", "unit_price", "extended_value"],
        },
      },
    },
    required: ["lines"],
  },
};

const SYSTEM = `You extract the priced line items from a construction change-order proposal PDF.
- Read the PRICING / cost table. Return one entry per priced row with description, unit, qty, unit price, extended (line total) and basis.
- INCLUDE markup rows that carry a dollar amount (e.g. Overhead, Profit) as their own lines so the lines sum to the grand total. INCLUDE waived markups shown as $0.00.
- EXCLUDE section subtotal rows, the GRAND TOTAL row, and pure header/label rows.
- If the proposal has multiple priced groups (A, B, …), return all of them in order.
- CRITICAL: If the change order is a PURE LUMP SUM with no itemized cost breakdown — i.e. the only priced row is a single line (such as "Lump Sum Change Order Amount") that simply equals the total — return an EMPTY lines array. Do NOT fabricate a placeholder line; there is nothing to itemize. Only return lines when the proposal genuinely breaks the cost into multiple distinct priced components.
- Always call the co_lines tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { changeOrderId } = await req.json();
    if (!changeOrderId) return json({ error: "changeOrderId required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: co, error: coErr } = await admin
      .from("change_orders").select("id, tenant_id, pdf_path, co_no, co_type").eq("id", changeOrderId).single();
    if (coErr || !co) return json({ error: `Change order not found: ${coErr?.message ?? ""}` }, 404);
    if (!co.pdf_path) return json({ error: "Change order has no PDF to extract from." }, 400);

    const pdfRes = await fetch(co.pdf_path);
    if (!pdfRes.ok) return json({ error: `Could not fetch CO PDF (${pdfRes.status})` }, 502);
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, system: SYSTEM,
        messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: "Extract the priced line items from this change order." },
        ] }],
        tools: [TOOL], tool_choice: { type: "tool", name: "co_lines" },
      }),
    });
    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    const toolUse = (data?.content ?? []).find((c: any) => c.type === "tool_use");
    if (!toolUse?.input || !Array.isArray(toolUse.input.lines)) return json({ error: "No tool output" }, 502);
    const lines = toolUse.input.lines as any[];

    // Clean slate for this CO. An EMPTY result is valid — a pure lump-sum CO has
    // nothing to itemize, so we clear any prior (possibly fabricated) lines.
    await admin.from("change_order_line_items").delete().eq("change_order_id", co.id);
    if (lines.length > 0) {
      const rows = lines.map((ln, i) => ({
        tenant_id: co.tenant_id, change_order_id: co.id, line_no: Number(ln.line_no) || i + 1,
        description: String(ln.description ?? ""), unit: ln.unit || null,
        qty: Number(ln.qty) || 0, unit_price: Number(ln.unit_price) || 0,
        extended_value: Number(ln.extended_value) || 0, basis: ln.basis || null,
      }));
      const { error: insErr } = await admin.from("change_order_line_items").insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);
    }

    return json({ ok: true, co_no: co.co_no, lines: lines.length });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
