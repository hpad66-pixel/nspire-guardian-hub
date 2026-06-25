// Turn a dictated/typed walkthrough into structured punch list items.
// POST { text, projectName? } → { items: [{ description, location, trade, priority }] }
// Runs on Claude (ANTHROPIC_API_KEY). A row in ai_skill_prompts
// (skill_key='punch_list_draft') can override the system prompt.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You are a construction punch list assistant for a general contractor.
Turn the walkthrough notes (dictated or typed) into a clean, professional punch list.

For each distinct deficiency output:
- description: a clear, professional one-to-two sentence work item (imperative voice, e.g. "Repair drywall crack above the north window and repaint to match.")
- location: the room/area/unit it's in (e.g. "Unit 204 – Bathroom", "Level 2 Corridor"). Empty string if not stated.
- trade: the responsible trade in lower case (one of: general, electrical, plumbing, hvac, drywall, paint, flooring, carpentry, concrete, roofing, masonry, glazing, landscaping, mechanical). Best guess.
- priority: "high" (safety/life-safety, blocks occupancy, water/electrical hazard), "medium" (normal defect), or "low" (cosmetic/minor).

Rules:
- One item per distinct deficiency. Do NOT merge unrelated issues. Do NOT duplicate.
- Rewrite into professional language; do not copy the speaker's filler words.
- If a single sentence lists several issues in one place, split them into separate items.

Respond ONLY with valid JSON in exactly this shape:
{"items":[{"description":"string","location":"string","trade":"string","priority":"high|medium|low"}]}`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
  });
}
function parseItems(raw: string): any[] {
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  const text = (fence ? fence[1] : raw).trim();
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : parsed.items ?? [];
  return (items as any[])
    .filter((i) => i && typeof i.description === "string" && i.description.trim())
    .map((i) => ({
      description: String(i.description).trim(),
      location: String(i.location ?? "").trim(),
      trade: String(i.trade ?? "general").trim().toLowerCase(),
      priority: ["high", "medium", "low"].includes(String(i.priority)) ? i.priority : "medium",
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text, projectName } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return json({ error: "Describe the punch items (a few words at least)." }, 400);
    }

    // Optional DB-configurable prompt override.
    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "punch_list_draft").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const userPrompt = `${projectName ? `Project: ${projectName}\n\n` : ""}WALKTHROUGH NOTES:\n${text}`;

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const r = await callClaude(anthropic, model, system, userPrompt);
    if (r.ok) {
      const data = await r.json();
      const raw = data.content?.[0]?.text ?? "";
      return json({ items: parseItems(raw), model });
    }
    if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    const errText = await r.text();
    console.error(`Claude ${model} returned ${r.status}:`, errText);
    return json({ error: "Could not draft punch items. Please try again." }, 502);
  } catch (e) {
    console.error("draft-punch-items error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
