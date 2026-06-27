import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const STYLE = `Professional, declarative, construction PM voice. Short. NO em dashes. No hype words.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!KEY) return json({ error: "AI is not configured." }, 500);

    const { projectId } = await req.json();
    if (!projectId) return json({ error: "Missing projectId" }, 400);
    const today = new Date().toISOString().slice(0, 10);
    const grab = async <T>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return (await fn()) ?? fb; } catch { return fb; } };

    const project = await grab(async () => (await supabase.from("projects").select("name").eq("id", projectId).maybeSingle()).data, null as any);
    const rfis = await grab(async () => (await supabase.from("rfis").select("rfi_number, subject, status, due_date").eq("project_id", projectId)).data ?? [], [] as any[]);
    const submittals = await grab(async () => (await supabase.from("submittals").select("title, status, created_at, due_date").eq("project_id", projectId)).data ?? [], [] as any[]);
    const punch = await grab(async () => (await supabase.from("punch_items").select("status").eq("project_id", projectId)).data ?? [], [] as any[]);
    const cos = await grab(async () => (await supabase.from("change_orders").select("co_no, amount, status, created_at").eq("project_id", projectId)).data ?? [], [] as any[]);
    const dailies = await grab(async () => (await supabase.from("daily_reports").select("report_date, work_performed, notes").eq("project_id", projectId).order("report_date", { ascending: false }).limit(10)).data ?? [], [] as any[]);

    const open = (r: any) => r.status === "open" || r.status === "pending";
    const overdueRfis = rfis.filter((r: any) => open(r) && r.due_date && r.due_date < today).map((r: any) => ({ rfi: `RFI-${r.rfi_number}`, subject: r.subject, due: r.due_date }));
    const days = (d: string) => (Date.now() - new Date(d).getTime()) / 864e5;
    const agingSubmittals = submittals.filter((s: any) => s.status !== "approved" && s.status !== "closed" && s.created_at && days(s.created_at) > 14).map((s: any) => ({ title: s.title, status: s.status, age_days: Math.round(days(s.created_at)) }));
    const openPunch = punch.filter((p: any) => p.status !== "closed" && p.status !== "verified" && p.status !== "completed").length;
    const pendingCos = cos.filter((c: any) => c.status !== "executed" && c.status !== "approved" && c.status !== "rejected" && c.status !== "void");
    const pendingCoValue = pendingCos.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);

    const context = {
      project: project?.name ?? "the project",
      open_rfis: rfis.filter(open).length,
      overdue_rfis: overdueRfis,
      aging_submittals: agingSubmittals,
      open_punch_items: openPunch,
      pending_change_orders: pendingCos.length,
      pending_change_order_value: pendingCoValue,
      recent_daily_notes: dailies.map((d: any) => ({ date: d.report_date, work: typeof d.work_performed === "string" ? d.work_performed.slice(0, 300) : null, notes: typeof d.notes === "string" ? d.notes.slice(0, 200) : null })),
    };

    const system = `You are a construction project risk analyst. From the project signals, surface the risks that need a PM's attention NOW. ${STYLE}

Output ONLY a JSON array (no markdown) of at most 6 risks, most urgent first:
[{"title":"short risk title","severity":"high"|"medium"|"low","area":"Schedule"|"RFIs"|"Submittals"|"Cost"|"Quality"|"Safety","detail":"1 sentence with the specific facts/numbers","action":"the single next action to take"}]
Rules: base every risk on the data (overdue RFIs, aging submittals, open punch, pending change-order exposure, delays/weather mentioned in daily notes). Never invent items. If the project looks healthy, return fewer risks or an empty array. High = blocking work or material cost/schedule exposure; medium = trending bad; low = watch.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, system, messages: [{ role: "user", content: JSON.stringify(context) }] }),
    });
    if (!resp.ok) return json({ error: "AI request failed." }, 502);
    const result = await resp.json();
    let text: string = result.content?.[0]?.text ?? "[]";
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
    if (fence) text = fence[1].trim();
    const arr = text.match(/\[[\s\S]*\]/);
    let risks: any[] = [];
    try { risks = JSON.parse(arr ? arr[0] : text); } catch { risks = []; }
    risks = (Array.isArray(risks) ? risks : []).slice(0, 6).map((r: any) => ({
      title: String(r.title ?? "Risk"),
      severity: ["high", "medium", "low"].includes(r.severity) ? r.severity : "medium",
      area: String(r.area ?? "General"),
      detail: String(r.detail ?? ""),
      action: String(r.action ?? ""),
    }));
    return json({ ok: true, risks, generated_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
