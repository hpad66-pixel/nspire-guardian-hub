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
      .select("id, project_id, commitment_id, status, vendor_name, vendor_email, app_no, period_from, period_to, lines, retainage_pct, prior_payments, conditional_signed_at, conditional_signed_name, submitted_at")
      .eq("token", token).maybeSingle();
    if (!sub) return json({ error: "Submission not found" }, 404);

    const grab = async <T>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return (await fn()) ?? fb; } catch { return fb; } };

    if (!action || action === "load") {
      const commitment = await grab(async () => (await db.from("commitments").select("title, commitment_no, original_value").eq("id", sub.commitment_id).maybeSingle()).data, null as any);
      const project = await grab(async () => (await db.from("projects").select("name").eq("id", sub.project_id).maybeSingle()).data, null as any);
      const portal = await grab(async () => (await db.from("client_portals").select("brand_accent_color").eq("project_id", sub.project_id).limit(1).maybeSingle()).data, null as any);
      return json({
        ok: true,
        submission: {
          status: sub.status, vendor_name: sub.vendor_name, vendor_email: sub.vendor_email,
          app_no: sub.app_no, period_from: sub.period_from, period_to: sub.period_to,
          lines: Array.isArray(sub.lines) ? sub.lines : [], retainage_pct: sub.retainage_pct,
          prior_payments: sub.prior_payments, conditional_signed_name: sub.conditional_signed_name,
          submitted: !!sub.submitted_at,
        },
        commitment: commitment ? { title: commitment.title, no: commitment.commitment_no, value: commitment.original_value } : null,
        project_name: project?.name ?? "Project",
        accent: portal?.brand_accent_color ?? "#1D6FE8",
      });
    }

    if (action === "submit" || action === "save") {
      if (sub.submitted_at && action === "submit") return json({ error: "Already submitted" }, 400);
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const retPct = num(body.retainage_pct ?? sub.retainage_pct);
      const prior = num(body.prior_payments ?? sub.prior_payments);
      const totalCompleted = lines.reduce((t: number, l: any) => t + num(l.from_previous) + num(l.this_period) + num(l.materials), 0);
      const retainage = totalCompleted * (retPct / 100);
      const currentDue = totalCompleted - retainage - prior;

      const patch: Record<string, unknown> = {
        lines, retainage_pct: retPct, prior_payments: prior,
        app_no: body.app_no ?? sub.app_no, period_from: body.period_from ?? sub.period_from, period_to: body.period_to ?? sub.period_to,
        total_completed: totalCompleted, retainage_amount: retainage, current_due: currentDue,
        notes: body.notes ?? null,
      };
      if (action === "submit") {
        const signName = String(body.conditional_signed_name ?? "").trim();
        if (!signName) return json({ error: "Sign the conditional lien waiver to submit." }, 400);
        patch.conditional_signed_name = signName;
        patch.conditional_signed_at = new Date().toISOString();
        patch.status = "submitted";
        patch.submitted_at = new Date().toISOString();
        if (body.vendor_name) patch.vendor_name = body.vendor_name;
        if (body.vendor_email) patch.vendor_email = body.vendor_email;
      }
      const { error } = await db.from("vendor_payapp_submissions").update(patch).eq("token", token);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, totals: { total_completed: totalCompleted, retainage, current_due: currentDue } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
