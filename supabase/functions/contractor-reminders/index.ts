import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-cron-secret",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: secret } = await db.from("app_cron_secrets").select("secret").eq("key", "contractor_readiness").maybeSingle();
  if (!secret?.secret || req.headers.get("x-cron-secret") !== secret.secret) return json({ error: "Forbidden" }, 403);

  await db.rpc("refresh_contractor_expirations");
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const { data: requirements } = await db.from("contractor_case_requirements")
    .select("id,tenant_id,case_id,title,status,current_document_id,case:contractor_qualification_cases(organization_id,project_id),document:contractor_documents(expiration_date)")
    .in("status", ["requested","needs_correction","verified","expired"])
    .limit(1000);

  let sent = 0, skipped = 0, failed = 0;
  const resend = Deno.env.get("RESEND_API_KEY");
  const origin = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://projos.ai";

  for (const requirement of requirements ?? []) {
    const caseRow = Array.isArray((requirement as any).case) ? (requirement as any).case[0] : (requirement as any).case;
    const document = Array.isArray((requirement as any).document) ? (requirement as any).document[0] : (requirement as any).document;
    let kind: "missing" | "correction" | "expiring" | "expired" | null = null;
    let days: number | null = null;
    if (requirement.status === "requested") kind = "missing";
    if (requirement.status === "needs_correction") kind = "correction";
    if (requirement.status === "expired") kind = "expired";
    if (document?.expiration_date) {
      days = Math.ceil((new Date(`${document.expiration_date}T12:00:00Z`).getTime() - today.getTime()) / 86400000);
      if (days < 0) kind = "expired";
      else if ([90, 60, 30, 7, 0].includes(days)) kind = "expiring";
      else if (kind === null || requirement.status === "verified") continue;
    } else if (kind === "missing" && today.getUTCDay() !== 1) {
      // Missing-item reminders are weekly on Monday; date-based alerts are exact.
      continue;
    }
    if (!kind || !caseRow) continue;

    const { data: latestLink } = await db.from("contractor_portal_links")
      .select("email,role")
      .eq("case_id", requirement.case_id).is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!latestLink?.email) { skipped++; continue; }
    const dedupeKey = [requirement.id, latestLink.email, kind, days ?? "weekly", todayKey].join(":");
    const { data: already } = await db.from("contractor_reminder_log").select("id").eq("dedupe_key", dedupeKey).maybeSingle();
    if (already) { skipped++; continue; }

    const rawToken = newToken();
    const { data: portalLink } = await db.from("contractor_portal_links").insert({
      tenant_id: requirement.tenant_id, case_id: requirement.case_id,
      email: latestLink.email, role: latestLink.role,
      token_hash: await sha256(rawToken),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      delivery_status: resend ? "pending" : "link_only",
    }).select("id").single();
    const link = `${origin}/contractor/onboard/${rawToken}`;
    const headline = kind === "expired" ? "A required document has expired"
      : kind === "expiring" ? `A required document expires in ${days} day${days === 1 ? "" : "s"}`
      : kind === "correction" ? "A document needs correction"
      : "Your qualification checklist is waiting";
    const detail = kind === "expired" || kind === "expiring"
      ? `${requirement.title}${document?.expiration_date ? ` — ${document.expiration_date}` : ""}`
      : requirement.title;
    let status = "skipped", providerId: string | null = null, errorMessage: string | null = null;
    if (resend) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "APAS Project Controls <hardeep@apas.ai>", to: [latestLink.email],
          subject: `${headline} — Contractor Readiness`,
          html: `<div style="font-family:Inter,Arial,sans-serif;background:#f4f2ec;padding:28px"><div style="max-width:600px;margin:auto;background:white;border:1px solid #e1ded5;border-radius:18px;padding:26px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9a7933;font-weight:800">Contractor Readiness</div><h1 style="color:#153d32;font-size:23px">${esc(headline)}</h1><p style="color:#566762;line-height:1.6">${esc(detail)}</p><a href="${esc(link)}" style="display:inline-block;background:#16775f;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800">Review checklist</a><p style="font-size:11px;color:#7b8581;margin-top:18px">This new secure link is valid for 30 days.</p></div></div>`,
        }),
      });
      const result = await response.json().catch(() => ({}));
      status = response.ok ? "sent" : "failed";
      providerId = result?.id ?? null;
      errorMessage = response.ok ? null : String(result?.message ?? `Email failed (${response.status})`);
      response.ok ? sent++ : failed++;
    } else skipped++;
    if (portalLink?.id) {
      await db.from("contractor_portal_links").update({
        delivery_status: status === "sent" ? "sent" : status === "failed" ? "failed" : "link_only",
        delivery_error: errorMessage,
        provider_id: providerId,
        delivered_at: status === "sent" ? new Date().toISOString() : null,
      }).eq("id", portalLink.id);
    }
    await db.from("contractor_reminder_log").insert({
      tenant_id: requirement.tenant_id, case_id: requirement.case_id,
      requirement_id: requirement.id, recipient_email: latestLink.email,
      reminder_kind: kind, days_before: days, status, provider_id: providerId,
      error_message: errorMessage, dedupe_key: dedupeKey,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  }
  return json({ ok: true, sent, skipped, failed });
});
