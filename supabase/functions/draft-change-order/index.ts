// Turn a natural-language description of a change order into a structured draft
// (title, background, scope bullets, priced line items, overhead/profit %) that
// pre-fills the in-app generator form for the user to review and edit.
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
const MODEL = "claude-sonnet-4-6";

const DRAFT_TOOL = {
  name: "draft_change_order",
  description: "Return the structured change-order draft extracted from the description.",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { description, projectId, overheadPct, profitPct } = await req.json();
    if (!description || String(description).trim().length < 5) return json({ error: "Describe the change order first." }, 400);

    let projectName = "";
    if (projectId) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await supa.from("projects").select("name").eq("id", projectId).maybeSingle();
      projectName = data?.name ?? "";
    }

    const system = `You convert a contractor's plain-language description of ONE construction change order into a structured proposal draft for the APAS Consulting format.
Rules:
- TITLE: concise one line, no "Change Order" prefix.
- BACKGROUND: short paragraph on the field condition / owner request / unforeseen item that triggered it.
- SCOPE: an intro line plus 2-6 specific scope bullets.
- LINE ITEMS: break the cost into priced items (desc, unit, qty, unit_cost like "$1,450", basis). If the user gives a single lump sum, make one Firm LS line item for it.
- overhead_pct / profit_pct: use the user's values if given, else the provided defaults; if they say profit or markup is waived, use 0.
- Estimate only from the description; do not invent unrelated scope. Always call the draft_change_order tool.`;

    const prompt = `Project: ${projectName || "construction project"}
Default overhead %: ${overheadPct ?? 10}
Default profit %: ${profitPct ?? 5}

Description:
${description}`;

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: prompt }],
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
