import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function invitationHtml(input: { recipient: string; company: string; project?: string | null; link: string; expires: string }) {
  return `<div style="margin:0;background:#f4f2ec;padding:28px 14px;font-family:Inter,Arial,sans-serif;color:#132c25">
    <div style="max-width:620px;margin:auto;overflow:hidden;border:1px solid #e1ded5;border-radius:20px;background:white;box-shadow:0 12px 36px rgba(19,44,37,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#092d25,#174d40);color:#fff">
        <div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#d7b86a">APAS Project Controls</div>
        <div style="margin-top:8px;font-size:26px;font-weight:800">Welcome to our contractor community</div>
        <div style="margin-top:5px;color:#d8e8e2">A secure readiness invitation for ${esc(input.company)}</div>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 12px">Hello ${esc(input.recipient)},</p>
        <p style="margin:0 0 12px;line-height:1.6;color:#4c5e58">We are glad to invite <strong>${esc(input.company)}</strong> to complete our contractor readiness process${input.project ? ` for <strong>${esc(input.project)}</strong>` : ""}. We value dependable, safety-minded companies and want qualified contractors to have an easy path to future opportunities with our team.</p>
        <p style="margin:0 0 18px;line-height:1.6;color:#4c5e58">Your checklist clearly shows what is mandatory, what is optional, and whether each item needs a document or a short response. Save your progress and upload from your phone—no account or password is required.</p>
        <a href="${esc(input.link)}" style="display:inline-block;border-radius:12px;background:#16775f;color:white;text-decoration:none;padding:13px 20px;font-weight:800">Start my secure checklist</a>
        <div style="margin-top:20px;padding:14px;border-radius:12px;background:#f7f6f2;color:#66736f;font-size:12px;line-height:1.5">This private link expires ${esc(input.expires)}. Do not forward it except to an authorized company representative.</div>
      </div>
    </div>
    <p style="text-align:center;color:#7b8581;font-size:11px">Powered by projOS</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !anon || !service) return json({ error: "Service is not configured" }, 500);

    const userDb = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth } = await userDb.auth.getUser();
    if (!auth.user) return json({ error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({}));
    const caseId = String(body.caseId ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const recipientName = String(body.name ?? "there").trim();
    const role = body.role === "broker" ? "broker" : "contractor";
    if (!caseId || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Case and a valid email are required" }, 400);

    // The user's RLS-scoped read proves access to this qualification case.
    const { data: scopedCase, error: scopedError } = await userDb
      .from("contractor_qualification_cases")
      .select("id,tenant_id,organization_id,project_id")
      .eq("id", caseId).maybeSingle();
    if (scopedError || !scopedCase) return json({ error: "Qualification case not found" }, 404);
    const { data: canManage } = await userDb.rpc("can_manage_contractor_case", { p_case_id: scopedCase.id });
    if (canManage !== true) return json({ error: "Manager access is required" }, 403);

    const admin = createClient(url, service);
    const [{ data: org }, { data: project }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", scopedCase.organization_id).maybeSingle(),
      scopedCase.project_id
        ? admin.from("projects").select("name").eq("id", scopedCase.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const rawToken = newToken();
    const tokenHash = await sha256(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { data: primaryContact } = await admin.from("contractor_contacts")
      .select("id")
      .eq("organization_id", scopedCase.organization_id)
      .eq("is_primary", true)
      .maybeSingle();
    let contactId = primaryContact?.id ?? null;
    if (contactId) {
      await admin.from("contractor_contacts").update({
        name: recipientName || email,
        email,
        role: "primary",
        can_manage_documents: true,
        updated_at: new Date().toISOString(),
      }).eq("id", contactId);
    } else {
      const { data: contact } = await admin.from("contractor_contacts").insert({
        tenant_id: scopedCase.tenant_id,
        organization_id: scopedCase.organization_id,
        name: recipientName || email,
        email,
        role: "primary",
        is_primary: true,
        can_manage_documents: true,
      }).select("id").single();
      contactId = contact?.id ?? null;
    }
    await admin.from("organizations").update({ email }).eq("id", scopedCase.organization_id);

    // Resending intentionally replaces older active links for this recipient.
    await admin.from("contractor_portal_links").update({ revoked_at: new Date().toISOString() })
      .eq("case_id", scopedCase.id).eq("email", email).eq("role", role)
      .is("revoked_at", null);

    const { data: portalLink, error: insertError } = await admin.from("contractor_portal_links").insert({
      tenant_id: scopedCase.tenant_id,
      case_id: scopedCase.id,
      contact_id: contactId,
      email,
      recipient_name: recipientName || null,
      token_hash: tokenHash,
      role,
      expires_at: expiresAt.toISOString(),
      created_by: auth.user.id,
      delivery_status: Deno.env.get("RESEND_API_KEY") ? "pending" : "link_only",
    }).select("id").single();
    if (insertError) throw insertError;

    await admin.from("contractor_case_requirements")
      .update({ status: "requested" })
      .eq("case_id", caseId).eq("status", "missing");
    await admin.from("contractor_qualification_cases")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", caseId);
    await admin.from("contractor_activity_log").insert({
      tenant_id: scopedCase.tenant_id,
      case_id: caseId,
      organization_id: scopedCase.organization_id,
      actor_type: "staff",
      actor_user_id: auth.user.id,
      action: "portal_invitation_created",
      entity_type: "qualification_case",
      entity_id: caseId,
      details: { email, role },
    });

    const origin = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://projos.ai";
    const link = `${origin}/contractor/onboard/${rawToken}`;
    let emailSent = false;
    let deliveryStatus = "link_only";
    let providerId: string | null = null;
    let deliveryError: string | null = null;
    const resend = Deno.env.get("RESEND_API_KEY");
    if (resend) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "APAS Project Controls <hardeep@apas.ai>",
          to: [email],
          subject: `Welcome — contractor readiness invitation${project?.name ? ` for ${project.name}` : ""}`,
          html: invitationHtml({
            recipient: recipientName,
            company: org?.name ?? "your company",
            project: project?.name,
            link,
            expires: expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          }),
        }),
      });
      emailSent = response.ok;
      const result = await response.json().catch(() => ({}));
      deliveryStatus = response.ok ? "sent" : "failed";
      providerId = result?.id ?? null;
      deliveryError = response.ok ? null : String(result?.message ?? `Email failed (${response.status})`);
    }

    await admin.from("contractor_portal_links").update({
      delivery_status: deliveryStatus,
      delivery_error: deliveryError,
      provider_id: providerId,
      delivered_at: emailSent ? new Date().toISOString() : null,
    }).eq("id", portalLink.id);
    await admin.from("contractor_activity_log").insert({
      tenant_id: scopedCase.tenant_id,
      case_id: caseId,
      organization_id: scopedCase.organization_id,
      actor_type: "system",
      action: emailSent ? "portal_invitation_sent" : "portal_invitation_link_ready",
      entity_type: "portal_link",
      entity_id: portalLink.id,
      details: { email, role, delivery_status: deliveryStatus, delivery_error: deliveryError },
    });

    return json({ ok: true, portalLinkId: portalLink.id, link, emailSent, deliveryStatus, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not create invitation" }, 500);
  }
});
