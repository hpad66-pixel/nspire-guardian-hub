// Turn a meeting transcript / notes into structured action items.
// POST { text, projectName? } → { items: [{ title, description, priority }] }
// Runs on Claude (ANTHROPIC_API_KEY). A row in ai_skill_prompts
// (skill_key='action_items_extract') can override the system prompt.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You are an assistant for a consulting firm. Turn the meeting transcript or notes
into a clean list of follow-up action items — the concrete things someone agreed to do.

For each distinct action item output:
- title: a short imperative task (e.g. "Send the revised sensor spec to the client"). Max ~12 words.
- description: one sentence of useful context, or empty string.
- owner_hint: the person's name if the transcript names who owns it, else empty string.
- priority: "urgent", "high", "medium", or "low" (best guess; default "medium").

Rules:
- One item per distinct commitment. Do NOT invent items not implied by the text.
- Ignore pure discussion with no follow-up. Do NOT duplicate.
- Rewrite into clear professional language.

Respond ONLY with valid JSON in exactly this shape:
{"items":[{"title":"string","description":"string","owner_hint":"string","priority":"urgent|high|medium|low"}]}`;

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
    .filter((i) => i && typeof i.title === "string" && i.title.trim())
    .map((i) => ({
      title: String(i.title).trim(),
      description: String(i.description ?? "").trim(),
      owner_hint: String(i.owner_hint ?? "").trim(),
      priority: ["urgent", "high", "medium", "low"].includes(String(i.priority)) ? i.priority : "medium",
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text, projectName } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return json({ error: "Paste the transcript or notes first." }, 400);
    }

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "action_items_extract").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const userPrompt = `${projectName ? `Project: ${projectName}\n\n` : ""}MEETING TRANSCRIPT / NOTES:\n${text}`;

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
    return json({ error: "Could not extract action items. Please try again." }, 502);
  } catch (e) {
    console.error("extract-action-items error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
