// Public, slug-scoped client-portal data. The client is a magic-link user (no
// Supabase account), so this service-role function returns ONLY the client-safe
// slice of the project: phase, key dates, milestones, the latest PUBLISHED update,
// and punch-list progress. Validated against an active client_portals row.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const PHASES = ["planning", "preconstruction", "construction", "punch_list", "closeout"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { slug } = await req.json().catch(() => ({}));
    if (!slug) return json({ error: "Missing slug" }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: portal } = await db.from("client_portals")
      .select("id, project_id, name, brand_accent_color, welcome_message, is_active, status")
      .eq("portal_slug", slug).maybeSingle();
    if (!portal || portal.is_active === false) return json({ error: "Portal not found" }, 404);
    if (!portal.project_id) return json({ ok: true, portal: { name: portal.name }, project: null });

    const grab = async <T>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return (await fn()) ?? fb; } catch { return fb; } };

    const project = await grab(async () => (await db.from("projects").select("name, phase, status, start_date, target_end_date, actual_end_date").eq("id", portal.project_id).maybeSingle()).data, null as any);

    const milestones = await grab(async () => (await db.from("project_milestones").select("name, due_date, status").eq("project_id", portal.project_id).order("due_date", { ascending: true })).data ?? [], [] as any[]);

    const update = await grab(async () => (await db.from("client_updates")
      .select("title, period_label, health, summary, accomplishments, next_steps, published_at")
      .eq("project_id", portal.project_id).eq("status", "published")
      .order("published_at", { ascending: false }).limit(1).maybeSingle()).data, null as any);

    // Client-visible progress photos: prefer the GC-curated highlight reel
    // (is_client_highlight); if nothing is featured yet, fall back to the most
    // recent gallery photos that aren't hidden/archived.
    const fetchPhotos = async (highlightOnly: boolean) => {
      let q = db.from("photo_gallery").select("url, caption, taken_at")
        .eq("project_id", portal.project_id).eq("is_hidden", false).is("archived_at", null);
      if (highlightOnly) q = q.eq("is_client_highlight", true);
      return (await q.order("taken_at", { ascending: false }).limit(12)).data ?? [];
    };
    let photos = await grab(() => fetchPhotos(true), [] as any[]);
    if (!(photos as any[]).length) photos = await grab(() => fetchPhotos(false), [] as any[]);

    const count = async (q: any): Promise<number> => { try { const { count } = await q; return count ?? 0; } catch { return 0; } };
    const punchOpen = await count(db.from("punch_items").select("id", { count: "exact", head: true }).eq("project_id", portal.project_id).in("status", ["open", "in_progress"]));
    const punchClosed = await count(db.from("punch_items").select("id", { count: "exact", head: true }).eq("project_id", portal.project_id).in("status", ["completed", "verified"]));

    // Action items the client must act on (or has just acted on). Excludes resolved/cancelled.
    const actionItems = await grab(async () => (await db.from("client_action_items")
      .select("id, action_type, title, description, options, client_selection, client_response, amount, due_date, priority, status, linked_change_order_id, sent_at, responded_at")
      .eq("project_id", portal.project_id).in("status", ["pending", "viewed", "responded"])
      .order("due_date", { ascending: true, nullsFirst: false })).data ?? [], [] as any[]);

    // Potential / approved change orders the client should see (shared with them).
    const changeOrders = await grab(async () => (await db.from("change_orders")
      .select("id, co_no, title, description, amount, days_impact, status, sign_token, sent_to_client_at, approved_at")
      .eq("project_id", portal.project_id).not("sent_to_client_at", "is", null)
      .order("co_no", { ascending: false })).data ?? [], [] as any[]);

    // The client's own questions / concerns and the GC's answers.
    const questions = await grab(async () => (await db.from("portal_document_requests")
      .select("id, subject, message, request_type, status, response_message, created_at, responded_at")
      .eq("portal_id", portal.id).order("created_at", { ascending: false }).limit(20)).data ?? [], [] as any[]);

    // Client-facing contract picture: original, approved changes to date, revised.
    const finance = await grab(async () => (await db.from("v_project_financial_summary")
      .select("original_contract, approved_co_value, revised_contract")
      .eq("project_id", portal.project_id).maybeSingle()).data, null as any);

    // Read-only Project Log for the client: only client-visible items + their log.
    const trackerItems = await grab(async () => (await db.from("tracker_items")
      .select("id, code, owner, category, division, title, description, priority, status, updated_at")
      .eq("project_id", portal.project_id).eq("client_visible", true)
      .order("created_at", { ascending: true })).data ?? [], [] as any[]);
    const trackerUpdates = await grab(async () => {
      const ids = (trackerItems as any[]).map((i) => i.id);
      if (!ids.length) return [];
      return (await db.from("tracker_updates").select("item_id, author, body, status_to, is_client, created_at")
        .in("item_id", ids).order("created_at", { ascending: false })).data ?? [];
    }, [] as any[]);
    const updByItem: Record<string, any[]> = {};
    (trackerUpdates as any[]).forEach((u) => { (updByItem[u.item_id] ??= []).push({ author: u.author, body: u.body, status_to: u.status_to, is_client: u.is_client, created_at: u.created_at }); });

    const prio: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
    const co = changeOrders as any[];
    const pendingCo = co.filter((c) => ["pending", "draft"].includes(c.status) && !c.approved_at);
    const scheduleImpactDays = co.filter((c) => c.status === "approved").reduce((s, c) => s + (c.days_impact || 0), 0);
    const pendingExposure = pendingCo.reduce((s, c) => s + (c.amount || 0), 0);
    const pendingDays = pendingCo.reduce((s, c) => s + (c.days_impact || 0), 0);

    return json({
      ok: true,
      portal: { name: portal.name, accent: portal.brand_accent_color, welcome: portal.welcome_message },
      phases: PHASES,
      project: project ? {
        name: project.name,
        phase: PHASES.includes(project.phase) ? project.phase : "planning",
        start_date: project.start_date, target_end_date: project.target_end_date, actual_end_date: project.actual_end_date,
      } : null,
      milestones: (milestones as any[]).slice(0, 8).map((m) => ({ title: m.name, date: m.due_date, status: m.status })),
      latest_update: update ? {
        title: update.title, period: update.period_label, health: update.health, summary: update.summary,
        accomplishments: Array.isArray(update.accomplishments) ? update.accomplishments.slice(0, 6) : [],
        next_steps: Array.isArray(update.next_steps) ? update.next_steps.slice(0, 6) : [],
        published_at: update.published_at,
      } : null,
      punch: { open: punchOpen, closed: punchClosed },
      photos: (photos as any[]).map((p) => ({ url: p.url, caption: p.caption, taken_at: p.taken_at })),
      action_items: (actionItems as any[])
        .sort((a, b) => (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1))
        .map((a) => ({
          id: a.id, action_type: a.action_type, title: a.title, description: a.description,
          options: Array.isArray(a.options) ? a.options : null, client_selection: a.client_selection,
          client_response: a.client_response, amount: a.amount, due_date: a.due_date,
          priority: a.priority, status: a.status, linked_change_order_id: a.linked_change_order_id,
        })),
      change_orders: co.map((c) => ({
        id: c.id, co_no: c.co_no, title: c.title, description: c.description, amount: c.amount,
        days_impact: c.days_impact, status: c.status, sign_token: c.sign_token,
        // Executed/approved are both "decided" to the client — executed is the
        // more final state (fully countersigned), so it reads as approved.
        approved: !!c.approved_at || c.status === "approved" || c.status === "executed",
        sent_at: c.sent_to_client_at,
      })),
      questions: (questions as any[]).map((q) => ({
        id: q.id, subject: q.subject, message: q.message, request_type: q.request_type,
        status: q.status, response: q.response_message, created_at: q.created_at, responded_at: q.responded_at,
      })),
      schedule: { pending_exposure: pendingExposure, pending_days: pendingDays, approved_impact_days: scheduleImpactDays },
      finance: finance ? {
        original_contract: finance.original_contract,
        approved_changes: finance.approved_co_value,
        revised_contract: finance.revised_contract,
      } : null,
      tracker: (trackerItems as any[]).map((i) => ({
        id: i.id, code: i.code, owner: i.owner, category: i.category, division: i.division,
        title: i.title, description: i.description, priority: i.priority, status: i.status,
        updated_at: i.updated_at, updates: updByItem[i.id] ?? [],
      })),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
