// task-update-draft (PR3q) — draft a succinct, branded-ready client update from
// either ONE task's comments (a specific topic) or a WEEKLY rollup of every open
// task in a project. Strictly opt-in (a button click); the caller always shows
// the result as an editable draft before sending — this function only drafts.
// POST { project_id, project_name, mode: 'single'|'weekly', audience: 'client'|'internal',
//        topic?, tasks: [{ title, description, status, priority, due_date, assignee, comments }] }
//   → { draft, model }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You draft project status updates for a consulting/engineering firm to send to a client or
teammate. You are given either ONE task (with its comment history — a single topic) or a LIST of
every currently-open task in a project (a weekly rollup).

Voice: succinct, professional, courteous. To the point — no filler, no restating the obvious, no
"I hope this email finds you well". Every sentence should carry information the reader needs.

Rules:
- Use ONLY the facts given (task titles, statuses, comments, dates). Never invent progress,
  numbers, or commitments that aren't in the input.
- For a SINGLE task: write 1 short paragraph (or a couple of tight sentences) summarizing the
  latest status, grounded in the comment(s) given — this reads like "here's where things stand
  on X", not a generic task description.
- For a WEEKLY rollup in "narrative" format: group logically (e.g. what moved forward, what's
  still open, anything blocked/overdue) and keep each item to one line, blended into short
  flowing paragraphs. Prioritize what the reader actually needs to know — skip housekeeping
  tasks with nothing new to report unless asked to include everything.
- For a WEEKLY rollup in "list" format: do NOT blend items into prose. Output ONE line per task,
  each its own paragraph (so put a blank line between each), in the exact shape:
  "**<task title>** — <status>: <one-line update, grounded in the task's own detail — never
  invented>". No intro, no grouping commentary, no summary paragraph before or after the list —
  just the tasks, one per line, in the order given.
- If audience is "client": omit internal-only details (who's assigned internally, internal tags);
  write about outcomes and next steps, not process.
- If audience is "internal": can be more procedural/direct.
- Return ONLY the update body as plain paragraphs (blank line between paragraphs). No markdown
  besides the **bold** task title in "list" format, no subject line, no greeting/sign-off (the
  email template adds those), no preamble.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "weekly" ? "weekly" : "single";
    const audience = body.audience === "internal" ? "internal" : "client";
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    if (!tasks.length) return json({ error: "No tasks given" }, 400);

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let system = DEFAULT_PROMPT, model = "claude-sonnet-4-6";
    try {
      const { data } = await admin.from("ai_skill_prompts").select("system_prompt, model, is_active").eq("skill_key", "task_update_draft").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch { /* defaults */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const parts: string[] = [];
    const format = mode === "weekly" && body.format === "list" ? "list" : "narrative";
    parts.push(`Mode: ${mode === "single" ? "single task update" : "weekly rollup"}`);
    if (mode === "weekly") parts.push(`Format: ${format}`);
    parts.push(`Audience: ${audience}`);
    if (body.project_name) parts.push(`Project: ${body.project_name}`);
    if (body.scope_name) parts.push(`Reporting on: ${body.scope_name} (only this part of the project — do not reference other workstreams)`);
    if (body.topic) parts.push(`Topic: ${body.topic}`);
    parts.push(`\nTASKS:\n${JSON.stringify(tasks).slice(0, 12000)}`);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, system, messages: [{ role: "user", content: parts.join("\n") }] }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
      console.error(`task-update-draft ${model} ${r.status}:`, await r.text());
      return json({ error: "Couldn't draft that update." }, 502);
    }
    const data = await r.json();
    await logAiUsage({ req, skill: "task_update_draft", model, anthropicJson: data, projectId: body.project_id ?? null });
    const draft = String(data.content?.[0]?.text ?? "").trim();
    return json({ draft, model });
  } catch (e) {
    console.error("task-update-draft error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
