import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") ?? "https://projos.ai").trim().replace(/\/+$/, "");

const allowedOrigin = (requestOrigin: string) => {
  const normalized = requestOrigin.trim().replace(/\/+$/, "");
  if (normalized === APP_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return normalized;
  }
  return APP_ORIGIN;
};

const cors = (requestOrigin = "") => ({
  "Access-Control-Allow-Origin": allowedOrigin(requestOrigin),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, requestOrigin = "") => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(requestOrigin), "Content-Type": "application/json" },
});

const passwordIsStrongEnough = (password: string) =>
  password.length >= 10
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /[0-9]/.test(password);

serve(async (req) => {
  const requestOrigin = (req.headers.get("origin") ?? "").trim().replace(/\/+$/, "");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(requestOrigin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, requestOrigin);

  if (requestOrigin && requestOrigin !== APP_ORIGIN && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
    return json({ error: "Origin is not allowed" }, 403, requestOrigin);
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const password = String(body.password ?? "");
  if (token.length < 64 || fullName.length < 2) return json({ error: "Invitation details are invalid" }, 400, requestOrigin);
  if (!passwordIsStrongEnough(password)) {
    return json({ error: "Use at least 10 characters with uppercase, lowercase, and a number" }, 400, requestOrigin);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: invitation, error: invitationError } = await admin
    .from("user_invitations")
    .select("id,email,property_id,workspace_id,accepted_at,revoked_at,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invitationError || !invitation
      || !invitation.property_id
      || invitation.accepted_at
      || invitation.revoked_at
      || new Date(invitation.expires_at).getTime() <= Date.now()) {
    return json({ error: "Invitation is invalid, expired, or already used" }, 400, requestOrigin);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", invitation.email)
    .maybeSingle();
  if (existingProfile) return json({ error: "An account already exists for this email" }, 409, requestOrigin);

  // The signed, single-use Proj OS invitation already proves control of the
  // email address. Create the account as confirmed to avoid a redundant
  // Supabase-branded verification email. The database trigger atomically
  // consumes the invitation and applies its property scope.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      invitation_token: token,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "An account already exists for this email"
      : "Account activation failed. Ask your administrator to resend the invitation.";
    return json({ error: message }, createError?.message?.toLowerCase().includes("already") ? 409 : 400, requestOrigin);
  }

  return json({ success: true, email: invitation.email }, 200, requestOrigin);
});
