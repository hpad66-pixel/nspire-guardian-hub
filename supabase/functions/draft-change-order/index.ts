// Turn a contractor's plain-language direction AND/OR an uploaded background
// document (an RFI, field report, vendor quote, email thread, sketch, etc.) into
// a structured change-order draft (title, background, scope bullets, priced line
// items, overhead/profit %) that pre-fills the in-app generator form for review.
//
// The background document is sent to Claude natively as a document/image content
// block (no lossy client-side text extraction), so scanned PDFs, tables, and
// quotes are read with full fidelity. The written direction steers emphasis,
// scope boundaries, and pricing; the document supplies the concrete facts.
//
// Uses the Anthropic (Claude) API with tool-use for guaranteed structured output.
// Requires the ANTHROPIC_API_KEY edge-function secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const DRAFT_TOOL = {
  name: "draft_change_order",
  description: "Return the structured change-order draft extracted from the direction and/or background document.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Concise one-line title, no 'Change Order' prefix" },
      subject: { type: "string" },
      basis: { type: "string", description: "e.g. Lump Sum, Fixed, Actual Quantity" },
      background: { type: "string", description: "Why this CO exists — field condition / owner request / unforeseen item" },
      scope_intro: { type: "string" },
      scope_bullets: { type: "array", items: { type: "string" } },
      line_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            desc: { type: "string" },
            unit: { type: "string", description: "EA/LS/LF/SF/DAY/HR/CY/TON" },
            qty: { type: "string" },
            unit_cost: { type: "string", description: "formatted like $1,450" },
            basis: { type: "string", description: "Firm, Allowance, Actual Qty, Completed, If Worked, Vendor Invoice, or No Cost" },
          },
          required: ["desc", "unit", "qty", "unit_cost", "basis"],
        },
      },
      overhead_pct: { type: "number" },
      profit_pct: { type: "number" },
      justification: { type: "string" },
    },
    required: ["title", "background", "scope_intro", "scope_bullets", "line_items", "overhead_pct", "profit_pct"],
  },
};

// Anthropic document/image content blocks accept these natively.
const PDF_MEDIA = "application/pdf";
const IMAGE_MEDIA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { description, projectId, overheadPct, profitPct, document, documentName } = await req.json();

    // `document` (optional): { kind: 'pdf'|'image'|'text', mediaType, data }
    //   pdf/image → data is base64; text → data is the raw extracted/plain text.
    const hasDoc = document && typeof document.data === "string" && document.data.length > 0;
    const hasDescription = description && String(description).trim().length >= 5;
    if (!hasDoc && !hasDescription) {
      return json({ error: "Attach a background document or describe the change order first." }, 400);
    }
    if (hasDoc && !["pdf", "image", "text"].includes(document.kind)) {
      return json({ error: `Unsupported document kind: ${document.kind}` }, 400);
    }
    if (hasDoc && document.kind === "image" && !IMAGE_MEDIA.has(document.mediaType)) {
      return json({ error: `Unsupported image type: ${document.mediaType}` }, 400);
    }

    let projectName = "";
    if (projectId) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await supa.from("projects").select("name").eq("id", projectId).maybeSingle();
      projectName = data?.name ?? "";
    }

    const docLabel = documentName ? `"${documentName}"` : "the attached document";
    const system = `You convert a contractor's input into a structured change-order proposal draft for the APAS Consulting format. The input is (a) a plain-language direction and/or (b) an attached background document (RFI, field report, vendor quote, email, sketch, marked-up drawing).
Rules:
- Ground the scope, quantities, and pricing in the BACKGROUND DOCUMENT when one is attached — pull real line items, units, quantities, unit costs, dates, and parties from it. Do not invent numbers the document or direction don't support.
- The WRITTEN DIRECTION governs emphasis, scope boundaries, and intent. When the direction and document conflict, follow the direction and omit what the direction excludes.
- TITLE: concise one line, no "Change Order" prefix.
- BACKGROUND: short paragraph on the field condition / owner request / unforeseen item that triggered it.
- SCOPE: an intro line plus 2-6 specific scope bullets.
- LINE ITEMS: break the cost into priced items (desc, unit, qty, unit_cost like "$1,450", basis). If only a single lump sum is available, make one Firm LS line item for it.
- overhead_pct / profit_pct: use the user's values if given, else the provided defaults; if they say profit or markup is waived, use 0.
- Always call the draft_change_order tool.`;

    const promptLines = [
      `Project: ${projectName || "construction project"}`,
      `Default overhead %: ${overheadPct ?? 10}`,
      `Default profit %: ${profitPct ?? 5}`,
    ];
    if (hasDoc) promptLines.push(`\nA background document (${docLabel}) is attached. Extract concrete scope, quantities, unit costs, dates, and parties from it.`);
    promptLines.push(
      hasDescription
        ? `\nContractor's direction:\n${description}`
        : `\nNo additional written direction was provided — base the draft on the attached document.`,
    );
    const prompt = promptLines.join("\n");

    // Build the user content: document/image block first (if any), then the prompt.
    const content: unknown[] = [];
    if (hasDoc) {
      if (document.kind === "pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: PDF_MEDIA, data: document.data }, title: documentName ?? undefined });
      } else if (document.kind === "image") {
        content.push({ type: "image", source: { type: "base64", media_type: document.mediaType, data: document.data } });
      } else if (document.kind === "text") {
        content.push({ type: "document", source: { type: "text", media_type: "text/plain", data: document.data }, title: documentName ?? undefined });
      }
    }
    content.push({ type: "text", text: prompt });

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content }],
        tools: [DRAFT_TOOL],
        tool_choice: { type: "tool", name: "draft_change_order" },
      }),
    });

    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    const toolUse = (data?.content ?? []).find((c: any) => c.type === "tool_use");
    if (!toolUse?.input) return json({ error: "No draft returned" }, 502);
    return json({ draft: toolUse.input });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
