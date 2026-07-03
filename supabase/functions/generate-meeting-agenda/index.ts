// Build a structured, client-ready meeting agenda from open/overdue items,
// recent updates, and the last meeting's notes.
// POST { projectName, glossary, overdue, dueSoon, updates, priorMinutes } → { html }
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

const DEFAULT_PROMPT = `You are preparing a meeting agenda for a consulting engagement. The open/overdue action items are
already tracked separately as their own boxes, so DON'T repeat them. Your job is the narrative agenda
points that make the meeting methodical.

Produce concise agenda points in these buckets:
- objectives: 2–3 short phrases on what this meeting should accomplish.
- updates: short phrases summarising what moved since last meeting (from the updates + last notes). [] if none.
- decisions: the calls to make in this meeting (infer from stuck/overdue items). [] if none.
- nextSteps: things to assign coming out of the meeting. [] if none.

Each point is ONE short line (max ~14 words), no numbering, no owner names in the point unless essential.

Rules:
- Do NOT invent items, owners, dates, or updates not present in the inputs.
- Use the GLOSSARY spellings for any names/terms; fix obvious mishears to the canonical term. Names matter.
- Professional and specific. No filler.

Respond ONLY with valid JSON in exactly this shape:
{"objectives":["string"],"updates":["string"],"decisions":["string"],"nextSteps":["string"]}`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 3072, system, messages: [{ role: "user", content: user }] }),
  });
}
function parseSections(raw: string) {
  const f = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  const parsed = JSON.parse((f ? f[1] : raw).trim());
  const arr = (v: unknown) => Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 12) : [];
  return {
    objectives: arr(parsed?.objectives),
    updates: arr(parsed?.updates),
    decisions: arr(parsed?.decisions),
    nextSteps: arr(parsed?.nextSteps),
  };
}

const ORGANIZE_PROMPT = `You are organizing the items on a meeting agenda so it reads like a professional consulting agenda.
You are given a flat list of agenda items, each with a numeric "ref".

Your job:
1. GROUP related items under a concise topic heading (2–5 words, Title Case) — e.g. "Budget & Fees",
   "Schedule & Milestones", "Permitting", "Design Coordination", "Open Decisions", "Next Steps".
2. Put every item that is about the same subject in the SAME group. Never split one subject across two groups.
   Use good judgment: two items mentioning the same deliverable, party, or workstream belong together.
3. Order the groups logically: opening/objectives first, then the substantive workstreams, with decisions
   and next steps toward the end.
4. Within each group, keep the most urgent (overdue) items first.
5. Clean each title: apply the GLOSSARY to fix name spellings and obvious mishears, fix typos, and make it a
   crisp agenda line. Do NOT change the meaning or invent detail.

Rules:
- Include EVERY ref exactly once. Do not drop or duplicate any ref.
- Do not invent new items.

Respond ONLY with valid JSON in exactly this shape:
{"groups":[{"topic":"string","items":[{"ref":0,"title":"cleaned title"}]}]}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();

    // ── organize mode: topic-group a flat list of items + tidy titles ──────────
    if (body?.mode === "organize") {
      const items: Array<{ ref: number; title: string; owner?: string; category?: string; overdue?: boolean }> =
        Array.isArray(body.items) ? body.items : [];
      if (!items.length) return json({ groups: [] });
      const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropic) return json({ error: "AI service is not configured." }, 500);

      let system = ORGANIZE_PROMPT;
      let model = "claude-sonnet-4-6";
      try {
        const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        const { data } = await admin.from("ai_skill_prompts")
          .select("model, is_active").eq("skill_key", "meeting_agenda").eq("is_active", true).maybeSingle();
        if (data?.model) model = data.model;
      } catch (_) { /* non-fatal */ }
      if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

      const gl: Array<{ term: string; variants: string[] }> = Array.isArray(body.glossary) ? body.glossary : [];
      const lines: string[] = [];
      if (body.projectName) lines.push(`Project: ${body.projectName}`);
      if (gl.length) lines.push(`\nGLOSSARY (canonical ← mishears):\n${gl.map((g) => `- ${g.term}${(g.variants ?? []).length ? ` ← ${g.variants.join(", ")}` : ""}`).join("\n")}`);
      lines.push(`\nITEMS:\n${items.map((i) => `- ref ${i.ref}: ${i.title}${i.owner ? ` (owner: ${i.owner})` : ""}${i.overdue ? " [OVERDUE]" : ""}`).join("\n")}`);

      const r = await callClaude(anthropic, model, system, lines.join("\n"));
      if (!r.ok) {
        console.error(`organize Claude ${model} returned ${r.status}:`, await r.text());
        return json({ error: "Could not organize the agenda." }, 502);
      }
      const data = await r.json();
      await logAiUsage({ req, skill: "meeting_agenda", model, anthropicJson: data, projectId: body?.projectId ?? null });
      try {
        const raw = data.content?.[0]?.text ?? "";
        const f = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
        const parsed = JSON.parse((f ? f[1] : raw).trim());
        const groups = (Array.isArray(parsed?.groups) ? parsed.groups : []).map((g: any) => ({
          topic: String(g?.topic ?? "General").trim().slice(0, 60) || "General",
          items: (Array.isArray(g?.items) ? g.items : [])
            .map((it: any) => ({ ref: Number(it?.ref), title: String(it?.title ?? "").trim() }))
            .filter((it: any) => Number.isInteger(it.ref) && it.title),
        })).filter((g: any) => g.items.length);
        return json({ groups, model });
      } catch (e) {
        console.error("organize parse error:", e);
        return json({ error: "Could not organize the agenda." }, 502);
      }
    }

    const { projectName, glossary, overdue, dueSoon, updates, priorMinutes } = body;
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
      await logAiUsage({ req, skill: "meeting_agenda", model, anthropicJson: data, projectId: body?.projectId ?? null });
      return json({ ...parseSections(data.content?.[0]?.text ?? ""), model });
    }
    if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    console.error(`Claude ${model} returned ${r.status}:`, await r.text());
    return json({ error: "Could not build the agenda. Please try again." }, 502);
  } catch (e) {
    console.error("generate-meeting-agenda error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
