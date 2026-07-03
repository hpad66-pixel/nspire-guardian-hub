// Public client-portal data service. A consulting client opens /client/<token>;
// this validates the token and returns ONLY that engagement's client-facing data
// (service role, scoped to the link's project_id). Read-only. verify_jwt=false.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const num = (v: unknown) => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "Missing token." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: link } = await admin
      .from("consulting_client_links")
      .select("id, project_id, tenant_id, is_active, show_financials")
      .eq("token", token).maybeSingle();
    if (!link || !link.is_active) return json({ error: "This link is unavailable." }, 404);

    const projectId = link.project_id as string;
    admin.from("consulting_client_links").update({ last_viewed_at: new Date().toISOString() }).eq("id", link.id).then(() => {});

    const grab = async <T>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return await fn(); } catch { return fb; } };

    const project = await grab(async () => (await admin.from("projects").select("name, description, status, start_date, target_end_date, client_id").eq("id", projectId).maybeSingle()).data, null as any);
    if (!project) return json({ error: "This engagement is unavailable." }, 404);

    const [workspace, client, scopes, milestones, actionItems, meetings, invoicesRaw] = await Promise.all([
      grab(async () => (await admin.from("workspaces").select("name").eq("id", link.tenant_id).maybeSingle()).data, null as any),
      grab(async () => project.client_id ? (await admin.from("clients").select("name").eq("id", project.client_id).maybeSingle()).data : null, null as any),
      grab(async () => (await admin.from("project_scopes").select("id, title, description, status, pct_complete, fee_amount, due_date, sort_order").eq("project_id", projectId).order("sort_order", { ascending: true })).data ?? [], [] as any[]),
      grab(async () => (await admin.from("project_milestones").select("name, due_date, status").eq("project_id", projectId).order("due_date", { ascending: true })).data ?? [], [] as any[]),
      grab(async () => (await admin.from("project_action_items").select("title, status, priority, due_date").eq("project_id", projectId).neq("status", "cancelled").order("due_date", { ascending: true }).limit(200)).data ?? [], [] as any[]),
      grab(async () => (await admin.from("consulting_meetings").select("id, title, meeting_date, minutes, agenda").eq("project_id", projectId).order("meeting_date", { ascending: false }).limit(50)).data ?? [], [] as any[]),
      link.show_financials
        ? grab(async () => (await admin.from("consulting_invoices").select("invoice_no, status, issue_date, due_date, total").eq("project_id", projectId).order("invoice_no", { ascending: false })).data ?? [], [] as any[])
        : Promise.resolve([] as any[]),
    ]);

    // Fee-weighted overall completion.
    const totalFee = scopes.reduce((s: number, x: any) => s + num(x.fee_amount), 0);
    const overallPct = totalFee > 0
      ? Math.round(scopes.reduce((s: number, x: any) => s + num(x.fee_amount) * num(x.pct_complete), 0) / totalFee)
      : (scopes.length ? Math.round(scopes.reduce((s: number, x: any) => s + num(x.pct_complete), 0) / scopes.length) : 0);

    return json({
      brand: workspace?.name || "APAS AI",
      client: client?.name ?? null,
      showFinancials: !!link.show_financials,
      project: { name: project.name, description: project.description, status: project.status, start_date: project.start_date, target_end_date: project.target_end_date },
      overallPct,
      scopes: scopes.map((s: any) => ({ id: s.id, title: s.title, description: s.description, status: s.status, pct: num(s.pct_complete), due_date: s.due_date })),
      milestones,
      actionItems,
      meetings: meetings.map((m: any) => ({ id: m.id, title: m.title, date: m.meeting_date, minutes: m.minutes, agenda: m.agenda })),
      invoices: invoicesRaw.map((i: any) => ({ invoice_no: i.invoice_no, status: i.status, issue_date: i.issue_date, due_date: i.due_date, total: num(i.total) })),
    });
  } catch (e) {
    console.error("client-portal error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
