// Public, token-scoped vendor invoice submission. A subcontractor (anonymous)
// loads their submission by magic-link token and posts their AIA G702/G703 pay
// application + conditional lien e-signature. Service role; validated by token.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { token, action } = body as { token?: string; action?: string };
    if (!token) return json({ error: "Missing token" }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sub } = await db.from("vendor_payapp_submissions")
      .select("id, tenant_id, project_id, commitment_id, status, vendor_name, vendor_email, app_no, period_from, period_to, lines, retainage_pct, prior_payments, conditional_signed_at, conditional_signed_name, submitted_at, apas_waiver_ack, waiver_type")
      .eq("token", token).maybeSingle();
    if (!sub) return json({ error: "Submission not found" }, 404);

    const grab = async <T>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return (await fn()) ?? fb; } catch { return fb; } };
    const loadBillingBasis = async () => {
      if (!sub.commitment_id) return null;
      const { data: commitment } = await db.from("commitments")
        .select("id, title, commitment_no, original_value, retainage_pct")
        .eq("id", sub.commitment_id)
        .eq("project_id", sub.project_id)
        .eq("tenant_id", sub.tenant_id)
        .maybeSingle();
      if (!commitment) return null;

      const { data: sovRows } = await db.from("commitment_sov_lines")
        .select("id, line_no, description, scheduled_value")
        .eq("commitment_id", sub.commitment_id)
        .order("line_no");
      const { data: priorInvoices } = await db.from("commitment_invoices")
        .select("id, retainage_held")
        .eq("commitment_id", sub.commitment_id)
        .in("status", ["approved", "paid"]);
      const priorInvoiceIds = (priorInvoices ?? []).map((row: any) => row.id);
      const priorLines = priorInvoiceIds.length
        ? ((await db.from("commitment_invoice_lines")
          .select("sov_line_id, work_this_period, materials_stored")
          .in("invoice_id", priorInvoiceIds)).data ?? [])
        : [];
      const { data: priorPaymentRows } = await db.from("commitment_payments")
        .select("amount")
        .eq("commitment_id", sub.commitment_id);

      const priorBySov = new Map<string, number>();
      for (const row of priorLines as any[]) {
        priorBySov.set(
          row.sov_line_id,
          (priorBySov.get(row.sov_line_id) ?? 0)
            + num(row.work_this_period)
            + num(row.materials_stored),
        );
      }

      return {
        commitment,
        sov: (sovRows ?? []).map((row: any) => ({
          sov_line_id: row.id,
          line_no: row.line_no,
          description: row.description,
          scheduled_value: num(row.scheduled_value),
          from_previous: priorBySov.get(row.id) ?? 0,
        })),
        priorRetainage: (priorInvoices ?? []).reduce(
          (total: number, row: any) => total + num(row.retainage_held),
          0,
        ),
        priorPayments: (priorPaymentRows ?? []).reduce(
          (total: number, row: any) => total + num(row.amount),
          0,
        ),
      };
    };

    if (!action || action === "load") {
      const billing = await loadBillingBasis();
      const commitment = billing?.commitment ?? null;
      const project = await grab(async () => (await db.from("projects").select("name").eq("id", sub.project_id).maybeSingle()).data, null as any);
      const portal = await grab(async () => (await db.from("client_portals").select("brand_accent_color").eq("project_id", sub.project_id).limit(1).maybeSingle()).data, null as any);
      return json({
        ok: true,
        submission: {
          status: sub.status, vendor_name: sub.vendor_name, vendor_email: sub.vendor_email,
          app_no: sub.app_no, period_from: sub.period_from, period_to: sub.period_to,
          lines: Array.isArray(sub.lines) ? sub.lines : [], retainage_pct: sub.retainage_pct,
          prior_payments: sub.prior_payments, conditional_signed_name: sub.conditional_signed_name,
          apas_waiver_ack: sub.apas_waiver_ack, waiver_type: sub.waiver_type ?? "conditional_progress",
          submitted: !!sub.submitted_at,
        },
        commitment: commitment ? {
          title: commitment.title,
          no: commitment.commitment_no,
          value: commitment.original_value,
          retainage_pct: commitment.retainage_pct,
          sov_lines: billing?.sov ?? [],
        } : null,
        project_name: project?.name ?? "Project",
        accent: portal?.brand_accent_color ?? "#1D6FE8",
      });
    }

    if (action === "submit" || action === "save") {
      if (sub.status === "void") return json({ error: "This submission link was voided." }, 409);
      if (sub.submitted_at || sub.status !== "requested") return json({ error: "This pay app has already been submitted and is locked." }, 409);
      const billing = await loadBillingBasis();
      if (!billing || !billing.sov.length) return json({ error: "This subcontract needs a Schedule of Values before invoicing." }, 400);

      const incoming = Array.isArray(body.lines) ? body.lines : [];
      const sovById = new Map(billing.sov.map((line: any) => [line.sov_line_id, line]));
      const seen = new Set<string>();
      const lines: any[] = [];
      for (const row of incoming) {
        const sovLine = sovById.get(String(row.sov_line_id ?? "")) as any;
        if (!sovLine || seen.has(sovLine.sov_line_id)) return json({ error: "Every pay-app row must map once to this subcontract's SOV." }, 400);
        seen.add(sovLine.sov_line_id);
        const thisPeriod = num(row.this_period);
        const materials = num(row.materials);
        if (thisPeriod < 0 || materials < 0 || sovLine.from_previous + thisPeriod + materials > sovLine.scheduled_value + 0.005) {
          return json({ error: `Billing exceeds SOV line ${sovLine.line_no}.` }, 400);
        }
        lines.push({
          sov_line_id: sovLine.sov_line_id,
          description: sovLine.description,
          scheduled_value: sovLine.scheduled_value,
          from_previous: sovLine.from_previous,
          this_period: thisPeriod,
          materials,
        });
      }
      if (!lines.length || seen.size !== sovById.size) return json({ error: "Include every subcontract SOV row in the pay app." }, 400);

      const retPct = num(billing.commitment.retainage_pct);
      const previousCompleted = lines.reduce((t: number, l: any) => t + num(l.from_previous), 0);
      const currentGross = lines.reduce((t: number, l: any) => t + num(l.this_period) + num(l.materials), 0);
      const totalCompleted = previousCompleted + currentGross;
      const currentRetainage = currentGross * (retPct / 100);
      const retainage = billing.priorRetainage + currentRetainage;
      const prior = billing.priorPayments;
      const currentDue = currentGross - currentRetainage;

      if (action === "submit" && currentDue <= 0) return json({ error: "Current payment due must be greater than zero." }, 400);

      const patch: Record<string, unknown> = {
        lines, retainage_pct: retPct, prior_payments: prior,
        app_no: body.app_no ?? sub.app_no, period_from: body.period_from ?? sub.period_from, period_to: body.period_to ?? sub.period_to,
        total_completed: totalCompleted, retainage_amount: retainage, current_due: currentDue,
        notes: body.notes ?? null,
      };
      if (action === "submit") {
        const signName = String(body.conditional_signed_name ?? "").trim();
        if (!signName) return json({ error: "Sign the conditional lien waiver to submit." }, 400);
        if (body.apas_waiver_ack !== true) return json({ error: "Acknowledge the APAS lien-waiver form to submit." }, 400);
        patch.conditional_signed_name = signName;
        patch.conditional_signed_at = new Date().toISOString();
        patch.apas_waiver_ack = body.apas_waiver_ack === true;
        if (typeof body.waiver_type === "string" && ["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"].includes(body.waiver_type)) patch.waiver_type = body.waiver_type;
        patch.status = "submitted";
        patch.submitted_at = new Date().toISOString();
        if (body.vendor_name) patch.vendor_name = body.vendor_name;
        if (body.vendor_email) patch.vendor_email = body.vendor_email;
      }
      const { data: updated, error } = await db.from("vendor_payapp_submissions")
        .update(patch)
        .eq("token", token)
        .eq("status", "requested")
        .is("submitted_at", null)
        .select("id")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!updated) return json({ error: "This pay app changed while you were submitting it. Reload the link." }, 409);
      return json({ ok: true, totals: { total_completed: totalCompleted, retainage, current_due: currentDue } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
