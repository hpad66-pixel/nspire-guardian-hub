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
into a clean list of follow-up action items — the concrete things someone agreed to do —
and assign each to the right team member with a due date when the text implies one.

For each distinct action item output:
- title: a short imperative task (e.g. "Send the revised sensor spec to the client"). Max ~12 words.
- description: one sentence of useful context, or empty string.
- assignee_id: the id of the team member responsible, chosen ONLY from the ROSTER below by
  matching the name mentioned in the text (first name is enough). Empty string if unclear or not on the roster.
- due_date: an ISO date "YYYY-MM-DD" if the text implies a deadline (resolve relative phrases like
  "by Friday", "next week", "end of month" against the MEETING DATE). Empty string if none.
- priority: "urgent", "high", "medium", or "low" (best guess; default "medium").

Also write concise meeting MINUTES as an HTML fragment (use only <h3>, <p>, <ul>, <li>, <strong>
tags — no wrappers, no markdown, no code fences): a 1–2 sentence overview paragraph, then
<h3>Discussion</h3> with a short <ul> of the key points, and <h3>Decisions</h3> with a <ul> of any
decisions made (omit the Decisions section if none). Keep it tight and factual.

Rules:
- One item per distinct commitment. Do NOT invent items, minutes content, or decisions not in the text.
- Ignore pure discussion with no follow-up (for items). Do NOT duplicate.
- Only ever use an assignee_id that appears in the ROSTER. Never invent an id.
- Rewrite into clear professional language.

Respond ONLY with valid JSON in exactly this shape:
{"minutes":"<html fragment>","items":[{"title":"string","description":"string","assignee_id":"string","due_date":"string","priority":"urgent|high|medium|low"}]}`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
  });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseResult(raw: string, rosterIds: Set<string>): { minutes: string; items: any[] } {
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  const text = (fence ? fence[1] : raw).trim();
  const parsed = JSON.parse(text);
  const rawItems = Array.isArray(parsed) ? parsed : parsed.items ?? [];
  const minutes = typeof parsed?.minutes === "string" ? parsed.minutes.trim() : "";
  const items = (rawItems as any[])
    .filter((i) => i && typeof i.title === "string" && i.title.trim())
    .map((i) => {
      const assignee = String(i.assignee_id ?? "").trim();
      const due = String(i.due_date ?? "").trim();
      return {
        title: String(i.title).trim(),
        description: String(i.description ?? "").trim(),
        assignee_id: rosterIds.has(assignee) ? assignee : null,
        due_date: ISO_DATE.test(due) ? due : null,
        priority: ["urgent", "high", "medium", "low"].includes(String(i.priority)) ? i.priority : "medium",
      };
    });
  return { minutes, items };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text, projectName, teamMembers, meetingDate } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return json({ error: "Paste the transcript or notes first." }, 400);
    }
    const roster: Array<{ id: string; name: string }> = Array.isArray(teamMembers)
      ? teamMembers.filter((m: any) => m?.id && m?.name).map((m: any) => ({ id: String(m.id), name: String(m.name) }))
      : [];
    const rosterIds = new Set(roster.map((m) => m.id));

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "action_items_extract").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const rosterBlock = roster.length
      ? `ROSTER (assignee_id → name):\n${roster.map((m) => `- ${m.id} → ${m.name}`).join("\n")}\n\n`
      : "ROSTER: (none — leave assignee_id empty)\n\n";
    const dateBlock = meetingDate ? `MEETING DATE: ${meetingDate}\n\n` : "";
    const userPrompt = `${projectName ? `Project: ${projectName}\n\n` : ""}${dateBlock}${rosterBlock}MEETING TRANSCRIPT / NOTES:\n${text}`;

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const r = await callClaude(anthropic, model, system, userPrompt);
    if (r.ok) {
      const data = await r.json();
      const raw = data.content?.[0]?.text ?? "";
      return json({ ...parseResult(raw, rosterIds), model });
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
