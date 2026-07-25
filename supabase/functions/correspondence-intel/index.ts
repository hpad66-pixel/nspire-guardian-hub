// correspondence-intel (PR3d) — analyze a project's email THREADS into structured
// intelligence. Authenticated. POST { project_id, thread_id?, force? } →
// { analyzed, threads:[{gmail_thread_id, summary, status, ball_in_court, ...}] }.
//
// Reads messages from project_emails (already tenant-isolated + imported by
// gmail-sync), groups by gmail_thread_id, and for each un-analyzed thread asks
// Claude for: summary, status, ball-in-court, urgency, action items, and entities.
// Results upsert into correspondence_threads. The firm's side ("you"/"us") is the
// caller's own address so ball-in-court is computed from your perspective.
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

const MAX_THREADS_PER_RUN = 12;
const STATUSES = ["awaiting_us", "awaiting_them", "in_progress", "resolved", "fyi"];

const DEFAULT_INTEL = `You analyze ONE email thread for a consulting/engineering firm and return structured intelligence.
The firm's own side — "us" / "you" — is the address given as SELF. Everyone else is a counterparty.

Return ONLY a JSON object (no prose, no markdown fence) with this exact shape:
{
  "summary": "1-2 sentences, plain English: what this thread is about and where it stands now",
  "status": "awaiting_us | awaiting_them | in_progress | resolved | fyi",
  "ball_in_court": "who owes the NEXT move — short, e.g. \\"You\\", \\"R4 — Chris Sullivan\\", \\"City of Opa-Locka\\"",
  "urgency": "low | normal | high",
  "action_items": [ { "title": "concrete task someone must DO", "owner": "you | <person or org name>", "due_hint": "optional date/urgency if stated, else empty" } ],
  "entities": { "people": [], "orgs": [], "amounts": ["$95K", ...], "dates": ["Mar 2026", ...], "refs": ["Building 8 meter", permit/invoice numbers, ...] }
}

Rules:
- "status": awaiting_us = the firm owes the next action; awaiting_them = a counterparty does; resolved = done; fyi = informational only.
- action_items: only real, actionable tasks that are open. owner "you" means the firm. Do NOT invent tasks or dates.
- Only include facts explicitly present in the thread. Keep amounts/dates/refs verbatim as written.
- Be concise. Empty arrays are fine.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);
    const selfEmail = (user.email ?? "").toLowerCase();

    const admin = createClient(url, serviceKey);
    const { data: prof } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = prof?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.project_id ?? "");
    if (!projectId) return json({ error: "project_id is required" }, 400);
    const onlyThread = body.thread_id ? String(body.thread_id) : null;
    const force = Boolean(body.force);

    const { data: project } = await userClient.from("projects").select("id,name").eq("id", projectId).maybeSingle();
    if (!project) return json({ error: "Project not found" }, 404);

    // Messages for this project (optionally one thread), oldest→newest for transcript order.
    let q = admin.from("project_emails").select("gmail_thread_id,topic,subject,from_email,from_name,to_emails,snippet,body_text,occurred_at,direction")
      .eq("project_id", projectId).not("gmail_thread_id", "is", null).order("occurred_at", { ascending: true });
    if (onlyThread) q = q.eq("gmail_thread_id", onlyThread);
    const { data: msgs } = await q;
    if (!msgs || msgs.length === 0) return json({ analyzed: 0, threads: [] });

    // Group by thread.
    const groups = new Map<string, typeof msgs>();
    for (const m of msgs) {
      const k = m.gmail_thread_id as string;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(m);
    }

    // Which threads still need analysis (skip already-analyzed unless force).
    const { data: existing } = await admin.from("correspondence_threads").select("gmail_thread_id,message_count").eq("project_id", projectId);
    const analyzedCount = new Map((existing ?? []).map((r) => [r.gmail_thread_id as string, r.message_count as number]));

    let candidates = [...groups.entries()];
    if (!force) candidates = candidates.filter(([tid, ms]) => (analyzedCount.get(tid) ?? -1) !== ms.length); // re-analyze if new messages arrived
    // Newest threads first, bounded.
    candidates.sort((a, b) => new Date(b[1][b[1].length - 1].occurred_at).getTime() - new Date(a[1][a[1].length - 1].occurred_at).getTime());
    candidates = candidates.slice(0, MAX_THREADS_PER_RUN);
    if (candidates.length === 0) return json({ analyzed: 0, threads: [] });

    // Skill config.
    let system = DEFAULT_INTEL, model = "claude-sonnet-4-6";
    try {
      const { data: sk } = await admin.from("ai_skill_prompts").select("system_prompt,model,is_active").eq("skill_key", "correspondence_intel").eq("is_active", true).maybeSingle();
      if (sk?.system_prompt) system = sk.system_prompt;
      if (sk?.model) model = sk.model;
    } catch { /* defaults */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";
    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
    const results: Record<string, unknown>[] = [];

    for (const [tid, ms] of candidates) {
      const subject = ms[ms.length - 1].subject ?? ms[0].subject ?? "(no subject)";
      const topic = ms.map((m) => m.topic).filter(Boolean)[0] ?? null;
      // Transcript: keep the most recent messages if the thread is long.
      const lines: string[] = [];
      for (const m of ms) {
        const who = m.from_email === selfEmail ? "US" : (m.from_name || m.from_email || "?");
        lines.push(`[${String(m.occurred_at).slice(0, 10)}] ${who} <${m.from_email}>:\n${clip((m.body_text || m.snippet || "").trim(), 1500)}`);
      }
      let transcript = lines.join("\n\n---\n\n");
      if (transcript.length > 11000) transcript = "…\n\n" + transcript.slice(transcript.length - 11000);

      const userMsg = `SELF (the firm / "you"): ${selfEmail} at ${project.name}\nThread subject: ${subject}\n\nTHREAD (oldest → newest):\n${transcript}`;
      let parsed: any = null;
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 1200, system, messages: [{ role: "user", content: userMsg }] }),
        });
        if (r.ok) {
          const d = await r.json();
          await logAiUsage({ req, skill: "correspondence_intel", model, anthropicJson: d, projectId });
          const txt = String(d.content?.[0]?.text ?? "");
          parsed = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
        } else {
          console.error("intel model error:", r.status, await r.text());
        }
      } catch (e) { console.error("intel parse error:", e); }

      const status = STATUSES.includes(parsed?.status) ? parsed.status : "fyi";
      const ai = Array.isArray(parsed?.action_items) ? parsed.action_items.filter((x: any) => x?.title).map((x: any) => ({ title: String(x.title), owner: String(x.owner ?? ""), due_hint: String(x.due_hint ?? "") })) : [];
      const ent = (parsed?.entities && typeof parsed.entities === "object") ? parsed.entities : {};
      const row = {
        tenant_id: tenantId, project_id: projectId, gmail_thread_id: tid, subject, topic,
        summary: parsed?.summary ? String(parsed.summary) : null,
        status, ball_in_court: parsed?.ball_in_court ? String(parsed.ball_in_court) : null,
        urgency: ["low", "normal", "high"].includes(parsed?.urgency) ? parsed.urgency : "normal",
        action_items: ai,
        entities: {
          people: Array.isArray(ent.people) ? ent.people.map(String) : [],
          orgs: Array.isArray(ent.orgs) ? ent.orgs.map(String) : [],
          amounts: Array.isArray(ent.amounts) ? ent.amounts.map(String) : [],
          dates: Array.isArray(ent.dates) ? ent.dates.map(String) : [],
          refs: Array.isArray(ent.refs) ? ent.refs.map(String) : [],
        },
        message_count: ms.length,
        last_message_at: ms[ms.length - 1].occurred_at,
        analyzed_at: new Date().toISOString(), model,
        updated_at: new Date().toISOString(),
      };
      const { error } = await admin.from("correspondence_threads").upsert(row, { onConflict: "project_id,gmail_thread_id" });
      if (error) console.error("intel upsert error:", error.message);
      else results.push({ gmail_thread_id: tid, subject, summary: row.summary, status, ball_in_court: row.ball_in_court, urgency: row.urgency, action_items: ai });
    }

    return json({ analyzed: results.length, threads: results });
  } catch (e) {
    console.error("correspondence-intel error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
