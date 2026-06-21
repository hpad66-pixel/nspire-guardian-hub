// Turn a natural-language description of a change order into a structured draft
// (title, background, scope bullets, priced line items, overhead/profit %) that
// pre-fills the in-app generator form for the user to review and edit.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "GEMINI_API_KEY not configured" }, 500);

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
- Extract a concise one-line TITLE (no "Change Order" prefix).
- Write a short BACKGROUND paragraph: the field condition / owner request / unforeseen item that triggered it.
- Write a SCOPE intro line plus 2-6 specific scope BULLETS.
- Break the cost into priced LINE ITEMS. Each: desc, unit (EA/LS/LF/SF/DAY/HR/CY/TON), qty, unit_cost (like "$1,450"), basis (one of: Firm, Allowance, Actual Qty, Completed, If Worked, Vendor Invoice, No Cost).
- If the user gives a single lump amount, make one Firm LS line item for it.
- overhead_pct and profit_pct: use the user's values if provided, else 10 and 5. If the user says profit/markup is waived, use 0.
- Numbers are best estimates from the description; do not invent unrelated scope.`;

    const prompt = `Project: ${projectName || "construction project"}
Default overhead %: ${overheadPct ?? 10}
Default profit %: ${profitPct ?? 5}

Description:
${description}`;

    const res = await fetch(`${GEMINI}/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              subject: { type: "STRING" },
              basis: { type: "STRING" },
              background: { type: "STRING" },
              scope_intro: { type: "STRING" },
              scope_bullets: { type: "ARRAY", items: { type: "STRING" } },
              line_items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    desc: { type: "STRING" }, unit: { type: "STRING" }, qty: { type: "STRING" },
                    unit_cost: { type: "STRING" }, basis: { type: "STRING" },
                  },
                  required: ["desc", "unit", "qty", "unit_cost", "basis"],
                },
              },
              overhead_pct: { type: "NUMBER" },
              profit_pct: { type: "NUMBER" },
              justification: { type: "STRING" },
            },
            required: ["title", "background", "scope_intro", "scope_bullets", "line_items", "overhead_pct", "profit_pct"],
          },
        },
      }),
    });

    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: "No draft returned" }, 502);
    return json({ draft: JSON.parse(text) });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
