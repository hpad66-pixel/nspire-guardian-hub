// Turn a won proposal into structured engagement scopes.
// POST { text, projectName? } → { scopes: [{ title, description, fee_amount }] }
// Runs on Claude. ai_skill_prompts (skill_key='proposal_scopes_extract') can override.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You are a consulting operations assistant. From the proposal below, extract the
scope of work as discrete workstreams / deliverables that the firm will execute, with a fee for each.

For each scope output:
- title: a short deliverable/workstream name (e.g. "Discovery & assessment"). Max ~8 words.
- description: one sentence of what it covers, or empty string.
- fee_amount: the fee for that scope as a number (no currency symbols/commas). Use 0 if the proposal
  gives only a single total or doesn't break the fee out per scope.

Rules:
- Follow the proposal's own phases/sections where possible. One scope per distinct workstream.
- Do NOT invent work that isn't in the proposal. Do NOT duplicate.
- If only a lump-sum total is given, still split the work into scopes and put the total on the first
  scope (fee_amount) with the rest at 0, so the numbers still add up.

Respond ONLY with valid JSON in exactly this shape:
{"scopes":[{"title":"string","description":"string","fee_amount":0}]}`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
  });
}

function parseScopes(raw: string): any[] {
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  const text = (fence ? fence[1] : raw).trim();
  const parsed = JSON.parse(text);
  const scopes = Array.isArray(parsed) ? parsed : parsed.scopes ?? [];
  return (scopes as any[])
    .filter((s) => s && typeof s.title === "string" && s.title.trim())
    .map((s) => ({
      title: String(s.title).trim(),
      description: String(s.description ?? "").trim(),
      fee_amount: Number(String(s.fee_amount ?? 0).replace(/[^0-9.]/g, "")) || 0,
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text, projectName } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return json({ error: "This proposal has too little content to build scopes from." }, 400);
    }

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "proposal_scopes_extract").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const userPrompt = `${projectName ? `Project: ${projectName}\n\n` : ""}PROPOSAL:\n${text.slice(0, 20000)}`;

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const r = await callClaude(anthropic, model, system, userPrompt);
    if (r.ok) {
      const data = await r.json();
      const raw = data.content?.[0]?.text ?? "";
      return json({ scopes: parseScopes(raw), model });
    }
    if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    const errText = await r.text();
    console.error(`Claude ${model} returned ${r.status}:`, errText);
    return json({ error: "Could not build scopes. Please try again." }, 502);
  } catch (e) {
    console.error("extract-proposal-scopes error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
