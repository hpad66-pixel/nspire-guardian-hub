/**
 * E3 · run-report — materialize a saved report and email it.
 * Body: { report_id: uuid, schedule_id?: uuid }
 * The function queries the data source, assembles rows, uploads a CSV/XLSX/PDF
 * artifact to Storage, and (if schedule_id present) sends email via Resend.
 *
 * Note: XLSX and PDF rendering use a minimal CSV serializer for now; upgrade
 * to SheetJS/jsPDF when you wire in the formatting requirements from the
 * per-tenant branding.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const reportId = String(body?.report_id ?? "");
    const scheduleId = body?.schedule_id ? String(body.schedule_id) : null;
    if (!reportId) return json({ error: "missing_report_id" }, 400);

    const { data: report, error: rErr } = await admin
      .from("reports").select("*").eq("id", reportId).single();
    if (rErr || !report) return json({ error: "report_not_found" }, 404);

    const rows = await runQuery(report);

    // Serialize (minimal — CSV today; XLSX/PDF are TODO behind format switch)
    const format = scheduleId
      ? (await admin.from("report_schedules").select("format").eq("id", scheduleId).single())
        .data?.format ?? "csv"
      : "csv";
    const body_text = toCsv(rows);
    const filename = `${(report as any).name.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${format === "csv" ? "csv" : format}`;
    const path = `${(report as any).tenant_id}/${filename}`;

    await admin.storage.createBucket("reports", { public: false }).catch(() => {});
    const { error: upErr } = await admin.storage.from("reports")
      .upload(path, new Blob([body_text]), { upsert: true, contentType: "text/csv" });
    if (upErr) throw upErr;

    if (scheduleId && RESEND_API_KEY) {
      const { data: schedule } = await admin
        .from("report_schedules").select("*").eq("id", scheduleId).single();
      const recipients = (schedule as any)?.recipients ?? {};
      const emails: string[] = [
        ...(recipients.emails ?? []),
        // user_ids and distribution_list_ids could be expanded via resolve_distribution
      ];
      if (emails.length > 0) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "hardeep@apas.ai",
            to: emails,
            subject: `Scheduled report: ${(report as any).name}`,
            text: `Your scheduled report ran. File: ${filename}`,
          }),
        });
      }
      await admin.from("report_schedules")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", scheduleId);
    }

    return json({ ok: true, rows: rows.length, path });
  } catch (err) {
    console.error("[run-report]", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});

async function runQuery(report: any): Promise<any[]> {
  const { data_source, config, project_id } = report;
  let q = admin.from(data_source as string).select("*");
  if (project_id) q = q.eq("project_id", project_id);

  // Minimal filter support; extend with config.filters[] for real builder parity
  const filters = Array.isArray(config?.filters) ? config.filters : [];
  for (const f of filters) {
    if (f.op === "eq" && f.column) q = q.eq(f.column, f.value);
    if (f.op === "gte" && f.column) q = q.gte(f.column, f.value);
    if (f.op === "lte" && f.column) q = q.lte(f.column, f.value);
  }
  if (config?.limit) q = q.limit(Number(config.limit));

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0] ?? {});
  const header = keys.join(",");
  const body = rows.map((r) =>
    keys.map((k) => {
      const v = r[k];
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
