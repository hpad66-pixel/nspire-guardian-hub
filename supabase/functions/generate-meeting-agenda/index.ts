// Build a structured, client-ready meeting agenda from open/overdue items,
// recent updates, and the last meeting's notes.
// POST { projectName, glossary, overdue, dueSoon, updates, priorMinutes } → { html }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You are preparing a meeting agenda for a consulting engagement so the team can run a
methodical, productive meeting. Use the inputs (open/overdue action items, what's due soon, recent
updates, and last meeting's notes) to produce a clear agenda.

Output ONLY an HTML fragment (no wrappers, no markdown, no code fences) using only
<h3>, <p>, <ul>, <ol>, <li>, <strong>. Structure it as:
- <h3>Objectives</h3> — 2–3 bullets on what this meeting should accomplish.
- <h3>Open &amp; overdue items</h3> — a <ul>; each <li> names the item, its owner, and how overdue it is
  (or why it matters). Lead with the most overdue.
- <h3>Updates since last meeting</h3> — a short <ul> of what moved (from the updates + last notes). Omit if none.
- <h3>Decisions needed</h3> — a <ul> of the calls to make in this meeting (infer from stuck/overdue items). Omit if none.
- <h3>Next steps</h3> — a <ul> of what to assign coming out of the meeting.

Rules:
- Be specific and concise. Do NOT invent items, owners, dates, or updates not present in the inputs.
- Use the GLOSSARY spellings for any names/terms; fix obvious mishears to the canonical term.
- Professional, warm, methodical. No filler.`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 3072, system, messages: [{ role: "user", content: user }] }),
  });
}
const clean = (raw: string) => { const f = raw.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i); return (f ? f[1] : raw).trim(); };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { projectName, glossary, overdue, dueSoon, updates, priorMinutes } = await req.json();
    const ov = Array.isArray(overdue) ? overdue : [];
    const ds = Array.isArray(dueSoon) ? dueSoon : [];
    const up = Array.isArray(updates) ? updates : [];
    if (!ov.length && !ds.length && !up.length && !priorMinutes) {
      return json({ error: "Nothing to build an agenda from yet — add action items or a prior meeting." }, 400);
    }

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "meeting_agenda").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const gl: Array<{ term: string; variants: string[] }> = Array.isArray(glossary) ? glossary : [];
    const parts: string[] = [];
    if (projectName) parts.push(`Project: ${projectName}`);
    if (gl.length) parts.push(`\nGLOSSARY:\n${gl.map((g) => `- ${g.term}${(g.variants ?? []).length ? ` ← ${g.variants.join(", ")}` : ""}`).join("\n")}`);
    if (ov.length) parts.push(`\nOVERDUE / OPEN:\n${ov.map((o: any) => `- ${o.title}${o.owner ? ` (owner: ${o.owner})` : ""}${o.daysLate != null ? ` — ${o.daysLate}d overdue` : ""}`).join("\n")}`);
    if (ds.length) parts.push(`\nDUE SOON:\n${ds.map((d: any) => `- ${d.title}${d.owner ? ` (owner: ${d.owner})` : ""}${d.due ? ` — due ${d.due}` : ""}`).join("\n")}`);
    if (up.length) parts.push(`\nRECENT UPDATES:\n${up.map((u: string) => `- ${u}`).join("\n")}`);
    if (priorMinutes) parts.push(`\nLAST MEETING NOTES:\n${String(priorMinutes).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000)}`);

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const r = await callClaude(anthropic, model, system, parts.join("\n"));
    if (r.ok) {
      const data = await r.json();
      return json({ html: clean(data.content?.[0]?.text ?? ""), model });
    }
    if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    console.error(`Claude ${model} returned ${r.status}:`, await r.text());
    return json({ error: "Could not build the agenda. Please try again." }, 502);
  } catch (e) {
    console.error("generate-meeting-agenda error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
