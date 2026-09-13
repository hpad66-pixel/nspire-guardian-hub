// Starts the Auth0 Universal Login round trip.
//
// The browser never builds the /authorize URL itself: the PKCE verifier has to
// stay server-side for a confidential client, and the signup intent (invitation
// token, company name, where to land afterwards) has to survive the redirect
// without being tamperable in transit. Both live in `auth0_login_states`, keyed
// by an opaque `state` that Auth0 echoes back to `auth0-callback`.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Auth0Error,
  auth0Config,
  buildAuthorizeUrl,
  codeChallengeS256,
  randomUrlSafe,
} from "../_shared/auth0.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") ?? "https://projos.ai").trim().replace(/\/+$/, "");

const isLocalOrigin = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const allowedOrigin = (requestOrigin: string) => {
  const normalized = requestOrigin.trim().replace(/\/+$/, "");
  return normalized === APP_ORIGIN || isLocalOrigin(normalized) ? normalized : APP_ORIGIN;
};

const cors = (requestOrigin = "") => ({
  "Access-Control-Allow-Origin": allowedOrigin(requestOrigin),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, requestOrigin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(requestOrigin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** Only same-site relative paths may be used as a post-login destination. */
const safeNextPath = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.length > 500) return null;
  return trimmed;
};

const optionalText = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
};

serve(async (req) => {
  const requestOrigin = (req.headers.get("origin") ?? "").trim().replace(/\/+$/, "");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(requestOrigin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, requestOrigin);

  if (requestOrigin && requestOrigin !== APP_ORIGIN && !isLocalOrigin(requestOrigin)) {
    return json({ error: "Origin is not allowed" }, 403, requestOrigin);
  }

  let cfg;
  try {
    cfg = auth0Config();
  } catch (error) {
    const status = error instanceof Auth0Error ? error.status : 500;
    console.error("[auth0-authorize] configuration error", error);
    return json({ error: "Single sign-on is not available right now." }, status, requestOrigin);
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "signup" ? "signup" : "login";
  const invitationToken = optionalText(body.invitationToken, 400);
  const companyName = optionalText(body.companyName, 200);
  const fullName = optionalText(body.fullName, 200);
  const nextPath = safeNextPath(body.next);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // An invitation is checked here, before the user is sent to Auth0, so a dead
  // link fails on our page with our wording instead of stranding them on a
  // Universal Login screen they cannot complete. The database trigger re-checks
  // and atomically consumes the same token when the account is created.
  let loginHint: string | null = null;
  if (invitationToken) {
    const { data: invitation, error } = await admin
      .from("user_invitations")
      .select("email,property_id,accepted_at,revoked_at,expires_at")
      .eq("token", invitationToken)
      .maybeSingle();

    if (error || !invitation || !invitation.property_id || invitation.accepted_at
      || invitation.revoked_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return json({ error: "Invitation is invalid, expired, or already used" }, 400, requestOrigin);
    }
    loginHint = invitation.email;
  }

  const state = randomUrlSafe(32);
  const codeVerifier = randomUrlSafe(48);
  const nonce = randomUrlSafe(16);

  const { error: stateError } = await admin.from("auth0_login_states").insert({
    state,
    code_verifier: codeVerifier,
    nonce,
    mode,
    product: cfg.product,
    invitation_token: invitationToken,
    company_name: companyName,
    full_name: fullName,
    next_path: nextPath,
  });

  if (stateError) {
    console.error("[auth0-authorize] could not persist login state", stateError);
    return json({ error: "Could not start sign-in. Please try again." }, 500, requestOrigin);
  }

  const url = buildAuthorizeUrl(cfg, {
    state,
    nonce,
    codeChallenge: await codeChallengeS256(codeVerifier),
    mode,
    loginHint,
  });

  return json({ url }, 200, requestOrigin);
});
