import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") ?? "").replace(/\/$/, "");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const roleLabels: Record<string, string> = {
  admin: "Workspace Administrator",
  owner: "Owner",
  manager: "Property Manager",
  administrator: "Administrator",
  project_manager: "Project Manager",
  superintendent: "Superintendent",
  inspector: "Inspector",
  clerk: "Clerk",
  subcontractor: "Subcontractor",
  viewer: "Viewer",
  user: "Team Member",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Authentication required" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const invitationId = String(body.invitationId ?? "");
  if (!invitationId) return json({ error: "invitationId is required" }, 400);

  // Read as the caller so invitation RLS enforces workspace isolation.
  const { data: invitation, error: invitationError } = await userClient
    .from("user_invitations")
    .select("*")
    .eq("id", invitationId)
    .maybeSingle();
  if (invitationError || !invitation) return json({ error: "Invitation not found" }, 404);

  const { data: canAssign } = await userClient.rpc("can_invite_workspace_role", {
    _target_role: invitation.role,
  });
  if (!canAssign) return json({ error: "You cannot send this invitation" }, 403);
  if (invitation.accepted_at) return json({ error: "Invitation was already accepted" }, 409);
  if (invitation.revoked_at) return json({ error: "Invitation was revoked" }, 409);
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return json({ error: "Invitation has expired. Create a new invitation." }, 410);
  }
  if (!RESEND_API_KEY) return json({ error: "Invitation email is not configured" }, 500);

  const requestOrigin = req.headers.get("origin")?.replace(/\/$/, "") ?? "";
  const appOrigin = APP_ORIGIN || requestOrigin;
  if (!appOrigin || (!APP_ORIGIN && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appOrigin))) {
    return json({ error: "APP_ORIGIN must be configured" }, 500);
  }

  const [{ data: inviter }, { data: workspace }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("user_id", invitation.invited_by).maybeSingle(),
    admin.from("workspaces").select("name").eq("id", invitation.workspace_id).maybeSingle(),
  ]);

  const inviterName = escapeHtml(inviter?.full_name || "A workspace administrator");
  const workspaceName = escapeHtml(workspace?.name || "your Proj OS workspace");
  const recipientName = invitation.full_name ? ` ${escapeHtml(invitation.full_name)}` : "";
  const roleName = escapeHtml(roleLabels[invitation.role] || invitation.role);
  const acceptUrl = `${appOrigin}/accept-invite/${encodeURIComponent(invitation.token)}`;

  const emailHtml = `<!doctype html>
  <html><body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033;line-height:1.6;margin:0;background:#f6f8fb">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px">
      <div style="font-weight:700;font-size:22px;margin-bottom:24px">Proj OS</div>
      <div style="background:#fff;border:1px solid #e5e9f0;border-radius:14px;padding:32px">
        <h1 style="font-size:24px;margin:0 0 16px">You’re invited to ${workspaceName}</h1>
        <p>Hello${recipientName},</p>
        <p>${inviterName} invited you to join <strong>${workspaceName}</strong> as <strong>${roleName}</strong>.</p>
        <p>Use the button below to create your password and activate your account.</p>
        <p style="margin:28px 0"><a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Activate account</a></p>
        <p style="font-size:13px;color:#687386">This single-use invitation expires in 7 days. If you did not expect it, you can ignore this email.</p>
      </div>
    </div>
  </body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Proj OS <admin@apas.ai>",
      to: [invitation.email],
      subject: `You’re invited to ${workspace?.name || "Proj OS"}`,
      html: emailHtml,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "Invitation email could not be sent" }, 502);

  await admin.from("user_invitations").update({
    last_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", invitation.id).eq("workspace_id", invitation.workspace_id);

  return json({ success: true, messageId: result.id ?? null });
});
