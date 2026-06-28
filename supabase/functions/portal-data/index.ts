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
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
