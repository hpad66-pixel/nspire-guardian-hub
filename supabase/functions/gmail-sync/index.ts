// gmail-sync (PR3c) — pull a project's in-scope Gmail threads onto the
// Correspondence tab. Authenticated. POST { project_id, party_domains?, party_emails?,
// import_topics?, extra_terms?, lookback_days? } → { scanned, imported, byTopic, parties }.
//
// Flow: refresh the stored Gmail token → (auto-discover the project's party domains
// from threads that name the project, if not configured) → search Gmail scoped to
// those parties + water/billing/meter terms → AI-classify each thread's topic →
// import only the configured topics (default water_billing + water_meters), skipping
// messages already stored. The refresh token never leaves the edge function.
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

const TOPICS = ["water_billing", "water_meters", "sewer_extension", "stormwater", "other"] as const;
type Topic = (typeof TOPICS)[number];
const DEFAULT_IMPORT: Topic[] = ["water_billing", "water_meters"];

// Water-scoped keyword net. Precision comes from the classifier; this just keeps the
// candidate set small (party + water term) instead of every thread with a party.
const WATER_TERMS =
  '(water OR "water meter" OR meter OR meters OR billing OR bill OR utility OR consumption OR dispute OR charges OR WASD OR backflow OR "meter reading" OR "shut off" OR reconnection)';

const FREEMAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "msn.com", "live.com"]);
const STOP = new Set(["water", "meter", "meters", "project", "gardens", "apartments", "the", "and", "for", "phase", "site"]);

const domainOf = (email: string) => (email.split("@")[1] ?? "").toLowerCase();
const nameSeed = (projectName: string): string => {
  const toks = (projectName || "").split(/[^A-Za-z0-9]+/).filter((t) => t.length >= 5 && !STOP.has(t.toLowerCase()));
  return (toks.length ? toks : (projectName || "").split(/\s+/)).filter(Boolean).slice(0, 3).join(" ").trim();
};
const orDomains = (field: string, domains: string[]) => domains.length ? `${field}:(${domains.join(" OR ")})` : "";

const DEFAULT_CLASSIFY = `You classify project email threads by TOPIC so a correspondence system only ingests
conversations that belong to a given project.

You are given the project name and a list of email threads (subject, participants, snippet).
For EACH thread choose exactly one topic:
- "water_billing"    — water/sewer utility BILLING: invoices, charges, meter reads driving a bill, consumption disputes, shut-off/reconnection, formal disputes of water & sewer CHARGES.
- "water_meters"     — physical water METERS: installation, testing, relocation, meter channels, backflow preventers tied to metering.
- "sewer_extension"  — SANITARY SEWER construction: sewer main/line replacement or extension, DERM/FDEP certifications, as-builts, manholes, sewer permits. (NOT billing.)
- "stormwater"       — STORM water / drainage: retention ponds, catch basins, street sweeping, silt fence, stormwater fixtures.
- "other"            — anything else, including threads about a DIFFERENT project, newsletters, internal admin, or unrelated business.

Rules:
- A dispute about water/sewer CHARGES is "water_billing", even though it says "sewer" — billing, not construction.
- If the thread is clearly about a different project or not this project at all, use "other".
- When genuinely ambiguous between two in-scope topics, pick the dominant one.

Return ONLY a JSON array, no prose: [{"id":"<threadId>","topic":"<one of the topics>"}]`;

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
    let partyDomains = clean(body.party_domains).length ? clean(body.party_domains) : ((existing?.party_domains as string[]) ?? []);
    const importTopics = (clean(body.import_topics).length ? clean(body.import_topics) : ((existing?.import_topics as string[]) ?? DEFAULT_IMPORT)).filter((t) => (TOPICS as readonly string[]).includes(t));
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
          partyDomains = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d);
          discovered = partyDomains.length > 0;
        } catch { /* fall back to keyword-only search */ }
      }
    }

    // Scoped search: recent AND water-term AND (involves a party OR names the project).
    const seed = nameSeed(project.name ?? "");
    const scope = [orDomains("from", partyDomains), orDomains("to", partyDomains), orDomains("cc", partyDomains), seed ? `"${seed}"` : ""].filter(Boolean).join(" OR ");
    const terms = extraTerms ? `(${WATER_TERMS} OR ${extraTerms})` : WATER_TERMS;
    const query = `newer_than:${lookbackDays}d ${terms}${scope ? ` (${scope})` : ""}`;

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

    // Classify each thread's topic (one model call for the whole candidate set).
    const byTopic: Record<string, number> = {};
    const topicOf = new Map<string, Topic>();
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
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: `Project: ${project.name}\n\nThreads:\n${JSON.stringify(digest)}` }] }),
          });
          if (r.ok) {
            const d = await r.json();
            await logAiUsage({ req, skill: "correspondence_classify", model, anthropicJson: d, projectId });
            const txt = String(d.content?.[0]?.text ?? "");
            const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
            for (const it of arr) if (it?.id && (TOPICS as readonly string[]).includes(it.topic)) topicOf.set(String(it.id), it.topic as Topic);
          } else {
            console.error("classify failed:", r.status, await r.text());
          }
        } catch (e) { console.error("classify error:", e); }
      }
      // Unclassified threads default to 'other' (not imported).
      for (const t of threads) if (!topicOf.has(t.id)) topicOf.set(t.id, "other");
    }

    // Existing message ids for this project → skip on re-sync.
    const { data: seenRows } = await admin.from("project_emails").select("gmail_message_id").eq("project_id", projectId).not("gmail_message_id", "is", null);
    const seen = new Set((seenRows ?? []).map((r) => r.gmail_message_id as string));

    // Import messages of kept threads.
    const rows: Record<string, unknown>[] = [];
    for (const t of threads) {
      const topic = topicOf.get(t.id) ?? "other";
      byTopic[topic] = (byTopic[topic] ?? 0) + 1;
      if (!importTopics.includes(topic)) continue;
      for (const m of t.messages) {
        if (!m.gmail_message_id || seen.has(m.gmail_message_id)) continue;
        seen.add(m.gmail_message_id);
        const outbound = m.from_email === selfEmail;
        rows.push({
          tenant_id: tenantId, project_id: projectId,
          direction: outbound ? "outbound" : "inbound",
          status: outbound ? "sent" : "received",
          channel: "gmail", topic,
          gmail_thread_id: m.gmail_thread_id, gmail_message_id: m.gmail_message_id, in_reply_to: m.in_reply_to || null,
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
    if (rows.length) {
      // Insert in chunks; ignore any residual duplicates from the partial unique index.
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error, count } = await admin.from("project_emails").insert(chunk, { count: "exact" });
        if (error) { console.error("insert error:", error.message); }
        else imported += count ?? chunk.length;
      }
    }

    const nowIso = new Date().toISOString();
    const result = { scanned, imported, byTopic, parties: partyDomains };
    await admin.from("correspondence_settings").upsert({
      tenant_id: tenantId, project_id: projectId, party_domains: partyDomains, import_topics: importTopics,
      extra_terms: extraTerms || null, lookback_days: lookbackDays, last_synced_at: nowIso, last_result: result, created_by: user.id,
    }, { onConflict: "project_id" });
    await admin.from("gmail_connections").update({ last_synced_at: nowIso }).eq("id", conn.id);

    return json({ ...result, discovered });
  } catch (e) {
    console.error("gmail-sync error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
