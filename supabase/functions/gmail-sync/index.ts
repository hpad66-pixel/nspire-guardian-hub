// gmail-sync (PR3c, generalized PR3m) — pull a project's in-scope Gmail threads onto
// the Correspondence tab. Authenticated. POST { project_id, party_domains?, party_emails?,
// import_topics?, extra_terms?, lookback_days? } → { scanned, imported, byTopic, parties }.
//
// Flow: refresh the stored Gmail token → (auto-discover the project's party domains
// from threads that name the project, if not configured) → search Gmail scoped to
// those parties + the project's own keyword net (if any) → AI-classify each thread
// into the PROJECT's OWN topic taxonomy (correspondence_settings.topics) → import
// only the configured topics, skipping messages already stored. The refresh token
// never leaves the edge function.
//
// The topic taxonomy, search keywords, and classifier definitions are all PER
// PROJECT (read from correspondence_settings), not hardcoded — a water-utility
// project and an environmental-contamination project need entirely different
// scoping, and neither should silently inherit the other's language.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { refreshAccessToken } from "../_shared/gmailOAuth.ts";
import { listThreads, getThread, flattenMessage, type FlatMessage } from "../_shared/gmailApi.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface TopicDef { key: string; label: string; description: string }
// Fallback for a project that hasn't defined its own taxonomy yet — a project
// should configure real topics (correspondence_settings.topics) for anything
// beyond "does this even belong to this project".
const GENERIC_TOPICS: TopicDef[] = [
  { key: "relevant", label: "Relevant", description: "Belongs to this project — any subject matter." },
  { key: "other", label: "Other", description: "A different project, newsletters, internal admin, or unrelated business." },
];

const FREEMAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "msn.com", "live.com"]);
const STOP = new Set(["water", "meter", "meters", "project", "gardens", "apartments", "the", "and", "for", "phase", "site", "building"]);
// A domain must appear at least this many times across the name-seeded sample
// before auto-discovery trusts it as a real party — a single incidental match
// (a newsletter, a CC'd list) shouldn't get treated as a project stakeholder.
const MIN_DOMAIN_FREQ = 2;

const domainOf = (email: string) => (email.split("@")[1] ?? "").toLowerCase();
const nameSeed = (projectName: string): string => {
  const toks = (projectName || "").split(/[^A-Za-z0-9]+/).filter((t) => t.length >= 5 && !STOP.has(t.toLowerCase()));
  return (toks.length ? toks : (projectName || "").split(/\s+/)).filter(Boolean).slice(0, 3).join(" ").trim();
};
const orDomains = (field: string, domains: string[]) => domains.length ? `${field}:(${domains.join(" OR ")})` : "";

// Generic classification INSTRUCTIONS (tunable via ai_skill_prompts like every
// other skill). The project's own topic definitions are supplied per-call in the
// user message, not baked in here — that's what makes this reusable across
// completely different projects.
const DEFAULT_CLASSIFY = `You classify project email threads by TOPIC so a correspondence system only ingests
conversations that belong to a given project, sorted into that project's own topics.

You are given: the project name, that project's topic definitions (key + description), and a
list of candidate email threads (subject, participants, snippet). For EACH thread choose
exactly one topic key from the given list.

Rules:
- Use the topic definitions exactly as given — they vary per project; do not substitute your
  own categories.
- If the thread is clearly about a different project or not relevant to this one, use "other"
  (or whichever topic key is described as the catch-all/not-relevant option).
- When genuinely ambiguous between two in-scope topics, pick the dominant one.

Return ONLY a JSON array, no prose: [{"id":"<threadId>","topic":"<one of the given topic keys>"}]`;

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

    const admin = createClient(url, serviceKey);
    const { data: prof } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = prof?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.project_id ?? "");
    if (!projectId) return json({ error: "project_id is required" }, 400);

    // Project (for name-based party discovery). Fetched through the RLS-enforced
    // user client: if the caller can see it, it's theirs — that's the authz check.
    const { data: project } = await userClient.from("projects").select("id,name").eq("id", projectId).maybeSingle();
    if (!project) return json({ error: "Project not found" }, 404);

    // Gmail connection (refresh token is edge-only).
    const { data: conn } = await admin.from("gmail_connections").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle();
    if (!conn || conn.status !== "active" || !conn.refresh_token) return json({ error: "Gmail is not connected." }, 400);
    const selfEmail = String(conn.email ?? "").toLowerCase();
    const selfDomain = domainOf(selfEmail);

    let accessToken: string;
    try {
      const t = await refreshAccessToken(conn.refresh_token);
      accessToken = t.access_token;
      await admin.from("gmail_connections").update({ access_token: t.access_token, token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), status: "active", last_error: null }).eq("id", conn.id);
    } catch (e) {
      await admin.from("gmail_connections").update({ status: "error", last_error: e instanceof Error ? e.message : "refresh failed" }).eq("id", conn.id);
      return json({ error: "Gmail authorization expired — please reconnect." }, 401);
    }

    // Effective settings: stored row merged with any overrides in the request.
    const { data: existing } = await admin.from("correspondence_settings").select("*").eq("project_id", projectId).maybeSingle();
    const clean = (a: unknown): string[] => Array.isArray(a) ? a.map((x) => String(x).trim().toLowerCase()).filter(Boolean) : [];

    // This project's own topic taxonomy — configure it via correspondence_settings.topics.
    const rawTopics = Array.isArray(existing?.topics) ? existing.topics as unknown[] : [];
    const projectTopics: TopicDef[] = rawTopics.filter((t): t is TopicDef => Boolean(t && typeof t === "object" && "key" in (t as object)));
    const topics = projectTopics.length ? projectTopics : GENERIC_TOPICS;
    const topicKeys = topics.map((t) => t.key);
    const otherKey = topics.find((t) => /other|not.?relevant/i.test(t.key) || /other|not.?relevant/i.test(t.label))?.key ?? topicKeys[topicKeys.length - 1] ?? "other";
    const defaultImport = topicKeys.filter((k) => k !== otherKey);

    let partyDomains = clean(body.party_domains).length ? clean(body.party_domains) : ((existing?.party_domains as string[]) ?? []);
    const importTopics = (clean(body.import_topics).length ? clean(body.import_topics) : ((existing?.import_topics as string[]) ?? defaultImport)).filter((t) => topicKeys.includes(t));
    const lookbackDays = Number(body.lookback_days ?? existing?.lookback_days ?? 365);
    const extraTerms = typeof body.extra_terms === "string" ? body.extra_terms : (existing?.extra_terms ?? "");

    // Auto-discover party domains from threads that name the project, if none configured.
    let discovered = false;
    if (partyDomains.length === 0) {
      const seed = nameSeed(project.name ?? "");
      if (seed) {
        try {
          const refs = await listThreads(accessToken, `newer_than:${lookbackDays}d "${seed}"`, 30);
          const freq = new Map<string, number>();
          const sample = refs.slice(0, 15);
          for (let i = 0; i < sample.length; i += 5) {
            const batch = await Promise.all(sample.slice(i, i + 5).map((r) => getThread(accessToken, r.id).catch(() => null)));
            for (const th of batch) {
              for (const m of th?.messages ?? []) {
                const fm = flattenMessage(m);
                for (const e of [fm.from_email, ...fm.to_emails, ...fm.cc_emails]) {
                  const d = domainOf(e);
                  if (d && d !== selfDomain && !FREEMAIL.has(d) && !d.endsWith("google.com")) freq.set(d, (freq.get(d) ?? 0) + 1);
                }
              }
            }
          }
          // Require a minimum frequency so a single incidental CC doesn't get
          // treated as a real project party — review/correct this in settings.
          partyDomains = [...freq.entries()].filter(([, n]) => n >= MIN_DOMAIN_FREQ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d);
          discovered = partyDomains.length > 0;
        } catch { /* fall back to keyword-only search */ }
      }
    }

    // Scoped search: recent AND [ (this project's Gmail label) OR (project term AND
    // party/name match) ]. The label is a deliberate, standalone signal — a
    // manually-labeled thread with NO matching party at all (e.g. an all-internal
    // thread) must still be found, so it's never ANDed with the keyword/domain
    // requirement below it.
    const seed = nameSeed(project.name ?? "");
    const domainOrNameScope = [orDomains("from", partyDomains), orDomains("to", partyDomains), orDomains("cc", partyDomains), seed ? `"${seed}"` : ""].filter(Boolean).join(" OR ");
    const keywordAndScopeClause = [extraTerms ? `(${extraTerms})` : "", domainOrNameScope ? `(${domainOrNameScope})` : ""].filter(Boolean).join(" ");
    const labelName = typeof existing?.gmail_label_name === "string" ? existing.gmail_label_name : "";
    const labelClause = labelName ? `label:"${labelName}"` : "";
    const combined = [labelClause, keywordAndScopeClause].filter(Boolean).join(" OR ");
    const query = `newer_than:${lookbackDays}d ${combined ? `(${combined})` : ""}`.trim();

    const refs = await listThreads(accessToken, query, 50);
    const scanned = refs.length;

    // Fetch candidate threads (bounded), flatten messages.
    const capped = refs.slice(0, 40);
    const threads: Array<{ id: string; messages: FlatMessage[] }> = [];
    for (let i = 0; i < capped.length; i += 5) {
      const batch = await Promise.all(capped.slice(i, i + 5).map(async (r) => {
        const th = await getThread(accessToken, r.id).catch(() => null);
        return th ? { id: r.id, messages: (th.messages ?? []).map(flattenMessage) } : null;
      }));
      for (const t of batch) if (t && t.messages.length) threads.push(t);
    }

    // Classify each thread's topic (one model call for the whole candidate set),
    // against THIS project's own topic list.
    const byTopic: Record<string, number> = {};
    const topicOf = new Map<string, string>();
    if (threads.length) {
      let system = DEFAULT_CLASSIFY, model = "claude-sonnet-4-6";
      try {
        const { data: sk } = await admin.from("ai_skill_prompts").select("system_prompt,model,is_active").eq("skill_key", "correspondence_classify").eq("is_active", true).maybeSingle();
        if (sk?.system_prompt) system = sk.system_prompt;
        if (sk?.model) model = sk.model;
      } catch { /* defaults */ }
      if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

      const digest = threads.map((t) => {
        const root = t.messages[0];
        const parts = new Set<string>();
        for (const m of t.messages) { parts.add(m.from_email); m.to_emails.forEach((e) => parts.add(e)); }
        return { id: t.id, subject: root.subject, participants: [...parts].filter(Boolean).slice(0, 8), snippet: root.snippet.slice(0, 240) };
      });
      const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
      if (anthropic) {
        try {
          const topicSpec = topics.map((t) => `- "${t.key}" (${t.label}): ${t.description}`).join("\n");
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: `Project: ${project.name}\n\nTopics:\n${topicSpec}\n\nThreads:\n${JSON.stringify(digest)}` }] }),
          });
          if (r.ok) {
            const d = await r.json();
            await logAiUsage({ req, skill: "correspondence_classify", model, anthropicJson: d, projectId });
            const txt = String(d.content?.[0]?.text ?? "");
            const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
            for (const it of arr) if (it?.id && topicKeys.includes(it.topic)) topicOf.set(String(it.id), it.topic as string);
          } else {
            console.error("classify failed:", r.status, await r.text());
          }
        } catch (e) { console.error("classify error:", e); }
      }
      // Unclassified threads default to the project's "other"/catch-all topic (not imported by default).
      for (const t of threads) if (!topicOf.has(t.id)) topicOf.set(t.id, otherKey);
    }

    // Existing message ids for this project → skip on re-sync. Deliberately
    // deleted messages are tombstoned separately — without this, deleting a
    // message from the app would just free it up to be re-imported on the very
    // next sync, resurrecting exactly what the user removed.
    const { data: seenRows } = await admin.from("project_emails").select("id,gmail_message_id,rfc_message_id").eq("project_id", projectId).not("gmail_message_id", "is", null);
    const { data: deletedRows } = await admin.from("correspondence_deleted_messages").select("gmail_message_id").eq("project_id", projectId);
    const seen = new Set([...(seenRows ?? []), ...(deletedRows ?? [])].map((r) => r.gmail_message_id as string));
    const existingByMessageId = new Map((seenRows ?? []).map((row: any) => [String(row.gmail_message_id), row]));

    // Import messages of kept threads.
    const rows: Record<string, unknown>[] = [];
    for (const t of threads) {
      const topic = topicOf.get(t.id) ?? otherKey;
      byTopic[topic] = (byTopic[topic] ?? 0) + 1;
      if (!importTopics.includes(topic)) continue;
      for (const m of t.messages) {
        if (!m.gmail_message_id) continue;
        if (seen.has(m.gmail_message_id)) {
          // Backfill RFC Message-Id on correspondence imported before threaded
          // Gmail replies shipped. This turns every legacy thread reply-safe
          // without duplicating any timeline rows.
          const existing = existingByMessageId.get(m.gmail_message_id);
          if (existing?.id && !existing.rfc_message_id && m.message_id_header) {
            await admin.from("project_emails").update({ rfc_message_id: m.message_id_header }).eq("id", existing.id);
          }
          continue;
        }
        seen.add(m.gmail_message_id);
        const outbound = m.from_email === selfEmail;
        rows.push({
          tenant_id: tenantId, project_id: projectId,
          direction: outbound ? "outbound" : "inbound",
          status: outbound ? "sent" : "received",
          channel: "gmail", topic,
          gmail_thread_id: m.gmail_thread_id, gmail_message_id: m.gmail_message_id,
          rfc_message_id: m.message_id_header || null, in_reply_to: m.in_reply_to || null,
          subject: m.subject || null, from_email: m.from_email || null, from_name: m.from_name || null,
          to_emails: m.to_emails, cc_emails: m.cc_emails,
          snippet: m.snippet || (m.body_text ? m.body_text.slice(0, 200) : null),
          body_text: m.body_text || null, body_html: m.body_html || null,
          has_attachments: m.has_attachments, attachments: m.attachments, labels: m.labels,
          occurred_at: m.occurred_at, created_by: user.id,
        });
      }
    }

    let imported = 0;
    const insertErrors: string[] = [];
    if (rows.length) {
      // Insert in chunks. A single bad/duplicate row fails the WHOLE chunk in one
      // plain multi-row insert — fall back to inserting that chunk row-by-row so
      // one collision doesn't silently swallow every other legitimate message
      // (this is exactly how a real bug — a too-broad unique constraint — showed
      // up as a quiet "imported: 0" with no visible error).
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error, count } = await admin.from("project_emails").insert(chunk, { count: "exact" });
        if (!error) { imported += count ?? chunk.length; continue; }
        console.error("insert chunk error, retrying row-by-row:", error.message);
        for (const row of chunk) {
          const { error: rowErr } = await admin.from("project_emails").insert(row);
          if (rowErr) { if (!insertErrors.includes(rowErr.message)) insertErrors.push(rowErr.message); }
          else imported += 1;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const result = { scanned, imported, byTopic, parties: partyDomains, ...(insertErrors.length ? { insertErrors } : {}) };
    await admin.from("correspondence_settings").upsert({
      tenant_id: tenantId, project_id: projectId, party_domains: partyDomains, import_topics: importTopics,
      topics: projectTopics, // only persist an explicitly-configured taxonomy, never the generic fallback
      extra_terms: extraTerms || null, lookback_days: lookbackDays, last_synced_at: nowIso, last_result: result, created_by: user.id,
    }, { onConflict: "project_id" });
    await admin.from("gmail_connections").update({ last_synced_at: nowIso }).eq("id", conn.id);

    return json({ ...result, discovered });
  } catch (e) {
    console.error("gmail-sync error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
