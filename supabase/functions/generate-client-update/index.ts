import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STYLE = `Write in a professional, declarative, client-facing voice. Short confident sentences. NO em dashes. No filler, no hype words (robust, leverage, seamless, elevate, unlock). Every number includes its unit.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!KEY) return json({ error: "AI is not configured." }, 500);

    const { projectId, periodStart, periodEnd, periodLabel } = await req.json();
    if (!projectId) return json({ error: "Missing projectId" }, 400);
    const start = periodStart || new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const end = periodEnd || new Date().toISOString().slice(0, 10);

    // Defensive gathers — a missing table/column must not fail the whole draft.
    const grab = async (fn: () => Promise<any>) => { try { return (await fn()) ?? []; } catch { return []; } };

    const project = await grab(async () => (await supabase.from("projects").select("name, status").eq("id", projectId).maybeSingle()).data);
    const dailies = await grab(async () => (await supabase.from("daily_reports").select("report_date, work_performed, notes").eq("project_id", projectId).gte("report_date", start).lte("report_date", end).order("report_date")).data);
    const rfis = await grab(async () => (await supabase.from("rfis").select("rfi_number, subject, status, due_date, created_at").eq("project_id", projectId)).data);
    const submittals = await grab(async () => (await supabase.from("submittals").select("title, status, created_at").eq("project_id", projectId)).data);
    const cos = await grab(async () => (await supabase.from("change_orders").select("co_number, title, status, amount, created_at").eq("project_id", projectId)).data);
    const meetings = await grab(async () => (await supabase.from("project_meetings").select("title, meeting_date").eq("project_id", projectId).gte("meeting_date", start).lte("meeting_date", end)).data);

    const inPeriod = (d?: string) => d && d.slice(0, 10) >= start && d.slice(0, 10) <= end;
    const openRfis = (rfis as any[]).filter((r) => r.status === "open" || r.status === "pending");
    const overdueRfis = openRfis.filter((r) => r.due_date && r.due_date < end);
    const cosThisPeriod = (cos as any[]).filter((c) => inPeriod(c.created_at));

    const context = {
      project: (project as any)?.name ?? "the project",
      period: periodLabel || `${start} to ${end}`,
      daily_reports: (dailies as any[]).map((d) => ({ date: d.report_date, work: d.work_performed, notes: d.notes })).slice(0, 30),
      open_rfis: openRfis.length,
      overdue_rfis: overdueRfis.map((r) => `RFI-${r.rfi_number}: ${r.subject}`).slice(0, 10),
      submittals_pending: (submittals as any[]).filter((s) => s.status !== "approved" && s.status !== "closed").length,
      change_orders_this_period: cosThisPeriod.map((c) => ({ no: c.co_number, title: c.title, amount: c.amount, status: c.status })),
      meetings: (meetings as any[]).map((m) => m.title),
    };

    const system = `You write a weekly client/owner project update for a construction project, as the general contractor briefing the owner. Be concise, factual, and client-appropriate (no internal jargon). ${STYLE}

From the supplied project data, output ONLY a JSON object (no markdown, no prose) with EXACTLY these keys:
{
  "health": one of "on_track" | "at_risk" | "delayed",
  "summary": "2 to 4 sentence narrative of the week for the owner",
  "accomplishments": ["short bullet of work completed this week", ...],
  "risks": [{"text": "the risk/issue and its impact", "severity": "low"|"medium"|"high"}, ...],
  "decisions": [{"text": "a decision made or needed from the owner", "status": "needed"|"made"}, ...],
  "action_items": [{"text": "an action", "owner": "who", "done": false}, ...],
  "next_steps": ["what happens next week", ...]
}
Rules: derive everything from the data; never invent specifics. Use [] for any empty section. Set health to at_risk or delayed if there are overdue RFIs, pending decisions, or stated delays. Keep bullets short and owner-facing.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: JSON.stringify(context) }],
      }),
    });
    if (!resp.ok) return json({ error: "AI request failed." }, 502);
    const result = await resp.json();
    await logAiUsage({ req, skill: "client_update", model: "claude-sonnet-4-6", anthropicJson: result, projectId });
    let text: string = result.content?.[0]?.text ?? "{}";
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
    if (fence) text = fence[1].trim();
    const objMatch = text.match(/\{[\s\S]*\}/);
    let draft: any = {};
    try { draft = JSON.parse(objMatch ? objMatch[0] : text); } catch { return json({ error: "Could not parse the AI draft." }, 502); }

    // Normalize to the client_updates shape.
    const out = {
      health: ["on_track", "at_risk", "delayed"].includes(draft.health) ? draft.health : "on_track",
      summary: typeof draft.summary === "string" ? draft.summary : "",
      accomplishments: Array.isArray(draft.accomplishments) ? draft.accomplishments.filter((x: any) => typeof x === "string") : [],
      risks: Array.isArray(draft.risks) ? draft.risks.map((r: any) => ({ text: String(r.text ?? r), severity: ["low", "medium", "high"].includes(r.severity) ? r.severity : "medium" })) : [],
      decisions: Array.isArray(draft.decisions) ? draft.decisions.map((d: any) => ({ text: String(d.text ?? d), status: d.status === "made" ? "made" : "needed" })) : [],
      action_items: Array.isArray(draft.action_items) ? draft.action_items.map((a: any) => ({ text: String(a.text ?? a), owner: String(a.owner ?? ""), done: false })) : [],
      next_steps: Array.isArray(draft.next_steps) ? draft.next_steps.filter((x: any) => typeof x === "string") : [],
    };
    return json({ ok: true, draft: out, period_label: context.period });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
