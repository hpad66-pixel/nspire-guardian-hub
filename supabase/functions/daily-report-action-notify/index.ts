// Email the daily report's submitter (field staff) a digest of the OPEN action
// items an admin left on it — the "tickler" nudge. Authenticated admin invokes it;
// service role resolves the submitter's email + sends via Resend.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { reportId, note } = await req.json();
    if (!reportId) return json({ error: "reportId required" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: report } = await db.from("daily_reports")
      .select("id, report_date, submitted_by, project_id, projects(name)")
      .eq("id", reportId).maybeSingle();
    if (!report) return json({ error: "Report not found" }, 404);

    const { data: items } = await db.from("daily_report_action_items")
      .select("body").eq("daily_report_id", reportId).eq("status", "open").order("created_at");
    if (!items || items.length === 0) return json({ ok: false, error: "No open action items to send." }, 200);

    let email: string | null = null, name = "there";
    if (report.submitted_by) {
      const { data: prof } = await db.from("profiles")
        .select("full_name, work_email, email").eq("user_id", report.submitted_by).maybeSingle();
      email = (prof?.work_email || prof?.email) ?? null;
      name = prof?.full_name || "there";
    }
    if (!email) return json({ ok: false, error: "No email on file for the report's submitter." }, 200);

    const project = (report as any).projects?.name ?? "Project";
    const rows = items.map((i: any, n: number) =>
      `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee;color:#878581;vertical-align:top;">${n + 1}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;">${esc(i.body)}</td></tr>`).join("");
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#1A1714;">
        <div style="border-bottom:3px solid #C4A35A;padding-bottom:10px;margin-bottom:14px;">
          <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Action items to review</div>
          <div style="font-size:19px;font-weight:800;">${esc(project)} — ${esc(String(report.report_date).slice(0, 10))}</div>
        </div>
        <p>Hello ${esc(name)},</p>
        <p>Your daily field report has been reviewed and the following ${items.length} item${items.length === 1 ? "" : "s"} need${items.length === 1 ? "s" : ""} your attention. Please review and acknowledge ${items.length === 1 ? "it" : "each"} in BuildOS.</p>
        ${note ? `<p style="white-space:pre-wrap;background:#FAF8F4;border-left:3px solid #C4A35A;padding:8px 12px;">${esc(note)}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;">${rows}</table>
        <p style="font-size:13px;color:#878581;">Open BuildOS → the project's Daily Logs → this report → Acknowledge each item.</p>
      </div>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "Email service not configured." }, 500);
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "APAS Consulting <admin@apas.ai>",
        to: [email],
        subject: `Action items on your ${esc(project)} report — ${String(report.report_date).slice(0, 10)}`,
        html,
      }),
    });
    if (!resp.ok) return json({ error: `Email failed: ${await resp.text()}` }, 502);
    return json({ ok: true, sentTo: email, count: items.length });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
