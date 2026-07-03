// Generate a concise, client-facing progress update from scope progress +
// action-item movement. POST { projectName, overallPct, scopes, doneRecently,
// dueSoon } → { html }. Runs on Claude. ai_skill_prompts key
// 'consulting_client_update' can override the system prompt.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You are a consultant writing a short, warm, professional progress update to a client.
You are given scope (workstream) progress and action-item movement. Write a client-facing update.

Output ONLY an HTML fragment (no <html>/<head>/<body> wrapper, no markdown, no code fences), using only
<h3>, <p>, <ul>, <li>, <strong> tags. Structure:
- One short opening paragraph (1–2 sentences) with the overall status and % complete.
- <h3>Where things stand</h3> then a <ul> with one <li> per scope: "<strong>Scope name</strong> — NN% (status)".
- <h3>Recently completed</h3> then a <ul> of the items finished (omit the section if none).
- <h3>Coming up</h3> then a <ul> of what's next / due soon (omit the section if none).

Rules:
- Be concise, reassuring, and specific. Do NOT invent work, numbers, or dates not provided.
- Professional but human. No filler, no "I hope this finds you well".`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: user }] }),
  });
}

function cleanHtml(raw: string): string {
  const fence = raw.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i);
  return (fence ? fence[1] : raw).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { projectName, overallPct, scopes, doneRecently, dueSoon } = await req.json();
    const scopeList = Array.isArray(scopes) ? scopes : [];
    if (!scopeList.length) return json({ error: "Add some scopes first — there's no progress to report yet." }, 400);

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "consulting_client_update").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }

    const lines: string[] = [];
    lines.push(`Project: ${projectName ?? "Engagement"}`);
    lines.push(`Overall completion: ${Math.round(Number(overallPct) || 0)}%`);
    lines.push(`\nSCOPES:`);
    for (const s of scopeList) lines.push(`- ${s.title}: ${Math.round(Number(s.pct) || 0)}% (${s.status ?? "in progress"})`);
    if (Array.isArray(doneRecently) && doneRecently.length) {
      lines.push(`\nRECENTLY COMPLETED:`);
      for (const d of doneRecently) lines.push(`- ${d}`);
    }
    if (Array.isArray(dueSoon) && dueSoon.length) {
      lines.push(`\nDUE SOON:`);
      for (const d of dueSoon) lines.push(`- ${d.title}${d.due ? ` (due ${d.due})` : ""}`);
    }

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const r = await callClaude(anthropic, model, system, lines.join("\n"));
    if (r.ok) {
      const data = await r.json();
      return json({ html: cleanHtml(data.content?.[0]?.text ?? ""), model });
    }
    if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    console.error(`Claude ${model} returned ${r.status}:`, await r.text());
    return json({ error: "Could not generate the update. Please try again." }, 502);
  } catch (e) {
    console.error("generate-consulting-update error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
