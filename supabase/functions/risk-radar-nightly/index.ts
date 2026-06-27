// Nightly deterministic Risk Radar pass. Called by pg_cron with the shared secret.
// For each project: counts overdue RFIs, aging submittals, open punch, and pending
// change-order exposure; stores a snapshot; and notifies the project's creator when
// the project needs attention.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-cron-secret" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Authorize: the request must carry the shared cron secret.
  const provided = req.headers.get("x-cron-secret") ?? "";
  const { data: row } = await db.from("app_cron_secrets").select("secret").eq("key", "risk_radar").maybeSingle();
  if (!row?.secret || provided !== row.secret) return json({ error: "Forbidden" }, 403);

  const today = new Date().toISOString().slice(0, 10);
  const count = async (q: any): Promise<number> => { try { const { count } = await q; return count ?? 0; } catch { return 0; } };

  const { data: projects } = await db.from("projects").select("id, name, created_by").limit(200);
  let processed = 0, flaggedCount = 0, notified = 0;

  for (const p of projects ?? []) {
    const overdue_rfis = await count(db.from("rfis").select("id", { count: "exact", head: true }).eq("project_id", p.id).in("status", ["open", "pending"]).lt("due_date", today));
    const aging_submittals = await count(db.from("submittals").select("id", { count: "exact", head: true }).eq("project_id", p.id).not("status", "in", "(approved,closed)").lt("created_at", new Date(Date.now() - 14 * 864e5).toISOString()));
    const open_punch = await count(db.from("punch_items").select("id", { count: "exact", head: true }).eq("project_id", p.id).not("status", "in", "(closed,verified,completed)"));
    let pending_co_value = 0;
    try {
      const { data: cos } = await db.from("change_orders").select("amount, status").eq("project_id", p.id).not("status", "in", "(executed,approved,rejected,void)");
      pending_co_value = (cos ?? []).reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
    } catch { /* ignore */ }

    const flagged = overdue_rfis > 0 || aging_submittals > 0 || pending_co_value > 0;
    await db.from("project_risk_snapshots").upsert({
      project_id: p.id, overdue_rfis, aging_submittals, open_punch, pending_co_value, flagged, generated_at: new Date().toISOString(),
    }, { onConflict: "project_id" });
    processed++;
    if (!flagged) continue;
    flaggedCount++;

    if (p.created_by) {
      const bits: string[] = [];
      if (overdue_rfis) bits.push(`${overdue_rfis} overdue RFI${overdue_rfis !== 1 ? "s" : ""}`);
      if (aging_submittals) bits.push(`${aging_submittals} aging submittal${aging_submittals !== 1 ? "s" : ""}`);
      if (open_punch) bits.push(`${open_punch} open punch item${open_punch !== 1 ? "s" : ""}`);
      if (pending_co_value) bits.push(`$${Math.round(pending_co_value).toLocaleString()} in pending change orders`);
      // Avoid duplicate alerts within the same day.
      const since = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
      const { count: recent } = await db.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", p.created_by).eq("entity_type", "risk_radar").eq("entity_id", p.id).gte("created_at", since);
      if (!recent) {
        await db.from("notifications").insert({
          user_id: p.created_by, type: "risk_radar",
          title: `Risk Radar — ${p.name ?? "a project"} needs attention`,
          message: bits.join(" · "),
          entity_type: "risk_radar", entity_id: p.id,
        });
        notified++;
      }
    }
  }

  return json({ ok: true, processed, flagged: flaggedCount, notified });
});
