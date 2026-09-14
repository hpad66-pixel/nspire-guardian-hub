// Completes the Auth0 Universal Login round trip and mints a Supabase session.
//
// Auth0 proves identity; Supabase Auth still owns the session, because 190
// foreign keys point at auth.users(id) and the RLS layer is built on auth.uid().
// The whole point of resolving an EXISTING auth.users row here -- by Auth0 `sub`
// first, then by verified email -- is that a migrated user keeps their original
// user id, and therefore their workspace, roles, and every row they own.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Auth0Error,
  auth0Config,
  exchangeCode,
  verifyIdToken,
  type Auth0Config,
  type Auth0Profile,
} from "../_shared/auth0.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") ?? "https://projos.ai").trim().replace(/\/+$/, "");

interface LoginState {
  state: string;
  code_verifier: string;
  nonce: string;
  mode: "login" | "signup";
  product: string;
  invitation_token: string | null;
  company_name: string | null;
  full_name: string | null;
  next_path: string | null;
}

const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });

/** Send the browser back to /auth with a message the page can render. */
const failure = (code: string, message: string) => {
  const url = new URL(APP_ORIGIN + "/auth");
  url.searchParams.set("error", code);
  url.searchParams.set("message", message);
  return redirect(url.toString());
};

/**
 * Atomically claims the pre-auth state row. The `consumed_at IS NULL` predicate
 * is the single-use guard: replaying an authorization code with the same state
 * finds nothing to claim and gets rejected.
 */
async function claimState(admin: SupabaseClient, state: string): Promise<LoginState | null> {
  const { data, error } = await admin
    .from("auth0_login_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state", state)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("state,code_verifier,nonce,mode,product,invitation_token,company_name,full_name,next_path")
    .maybeSingle();

  if (error) {
    console.error("[auth0-callback] state claim failed", error);
    return null;
  }
  return (data as LoginState | null) ?? null;
}

/** `_` and `%` are legal in an email address and are wildcards to ILIKE. */
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (match) => "\\" + match);

async function profileStatusFor(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.status as string | null) ?? "active";
}

/** Existing Supabase account for this email, if there is one. */
async function findUserByEmail(admin: SupabaseClient, email: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id,status")
    .ilike("email", escapeLikePattern(email))
    .maybeSingle();
  if (!profile?.user_id) return null;

  const { data, error } = await admin.auth.admin.getUserById(profile.user_id);
  if (error || !data.user) return null;
  // Belt and braces: the authoritative address is the one on auth.users, so a
  // stale or near-miss profile row can never be linked to.
  if ((data.user.email ?? "").toLowerCase() !== email) return null;

  return { user: data.user, profileStatus: (profile.status as string | null) ?? "active" };
}

/**
 * Mints a real Supabase session for a user we have already authenticated at
 * Auth0. `generateLink` produces the token the magic-link email would have
 * carried; redeeming it here yields the same access/refresh pair a normal
 * sign-in would, so refresh and expiry behave natively from here on.
 */
async function mintSession(admin: SupabaseClient, email: string) {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    console.error("[auth0-callback] generateLink failed", linkError);
    throw new Auth0Error("session_mint_failed", "Could not start your session.", 500);
  }

  const { data: verified, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: hashedToken,
    type: "magiclink",
  });
  if (verifyError || !verified.session) {
    console.error("[auth0-callback] verifyOtp failed", verifyError);
    throw new Auth0Error("session_mint_failed", "Could not start your session.", 500);
  }
  return verified.session;
}

/**
 * Resolves the Auth0 identity to a Supabase user id, creating or linking as
 * needed. Returns the user id and whether this call created the account.
 */
async function resolveUser(
  admin: SupabaseClient,
  cfg: Auth0Config,
  profile: Auth0Profile,
  state: LoginState,
): Promise<{ userId: string; created: boolean }> {
  // 1. Returning user: the Auth0 subject is already linked.
  const { data: identity } = await admin
    .from("auth0_identities")
    .select("user_id")
    .eq("auth0_sub", profile.sub)
    .maybeSingle();

  if (identity?.user_id) {
    const { data: existing, error } = await admin.auth.admin.getUserById(identity.user_id);
    if (error || !existing.user) {
      throw new Auth0Error("account_missing", "Your account could not be found.", 404);
    }
    assertUsable(existing.user, await profileStatusFor(admin, identity.user_id));
    return { userId: identity.user_id, created: false };
  }

  const existing = await findUserByEmail(admin, profile.email);

  // 2. Invitation: the signed single-use token proves control of the address,
  //    so an unverified Auth0 email is acceptable here -- but only for the exact
  //    address the invitation was issued to.
  if (state.invitation_token) {
    const { data: invitation } = await admin
      .from("user_invitations")
      .select("email,property_id,accepted_at,revoked_at,expires_at")
      .eq("token", state.invitation_token)
      .maybeSingle();

    if (!invitation || !invitation.property_id || invitation.accepted_at || invitation.revoked_at
      || new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw new Auth0Error("invitation_invalid", "Invitation is invalid, expired, or already used.", 400);
    }
    if ((invitation.email ?? "").trim().toLowerCase() !== profile.email) {
      throw new Auth0Error(
        "invitation_email_mismatch",
        "Sign in with the email address the invitation was sent to.",
        403,
      );
    }
    if (existing) {
      throw new Auth0Error(
        "account_exists",
        "An account already exists for this email. Sign in, and ask an administrator to add you.",
        409,
      );
    }
    return { userId: await createUser(admin, cfg, profile, state, true), created: true };
  }

  // 3. Linking an existing account by email. Requiring a verified address is
  //    what stops someone registering an unverified Auth0 identity on somebody
  //    else's email and inheriting their workspace.
  if (existing) {
    if (!profile.emailVerified) {
      throw new Auth0Error(
        "email_unverified",
        "Verify your email address with Auth0, then sign in again.",
        403,
      );
    }
    assertUsable(existing.user, existing.profileStatus);
    await linkIdentity(admin, cfg, existing.user.id, profile, state);
    return { userId: existing.user.id, created: false };
  }

  // 4. Brand-new self-serve signup.
  if (!profile.emailVerified) {
    throw new Auth0Error(
      "email_unverified",
      "Check your inbox and verify your email address, then sign in again.",
      403,
    );
  }
  return { userId: await createUser(admin, cfg, profile, state, false), created: true };
}

/** Deactivated and banned accounts must not be able to enter through Auth0. */
function assertUsable(user: { banned_until?: string | null }, profileStatus: string | null) {
  const bannedUntil = user.banned_until ? new Date(user.banned_until).getTime() : 0;
  if (bannedUntil > Date.now()) {
    throw new Auth0Error("account_deactivated", "This account has been deactivated.", 403);
  }
  if (profileStatus && profileStatus !== "active") {
    throw new Auth0Error("account_deactivated", "This account has been deactivated.", 403);
  }
}

async function createUser(
  admin: SupabaseClient,
  cfg: Auth0Config,
  profile: Auth0Profile,
  state: LoginState,
  viaInvitation: boolean,
): Promise<string> {
  // user_metadata is what handle_new_user reads: an invitation_token makes the
  // trigger consume the invitation and join that workspace, its absence makes
  // the trigger provision a fresh workspace with this user as its admin.
  const { data: created, error } = await admin.auth.admin.createUser({
    email: profile.email,
    email_confirm: true,
    user_metadata: {
      full_name: state.full_name ?? profile.fullName ?? null,
      ...(viaInvitation ? { invitation_token: state.invitation_token } : {}),
      ...(!viaInvitation && state.company_name ? { company_name: state.company_name } : {}),
    },
    app_metadata: {
      auth0_sub: profile.sub,
      signup_product: profile.signupProduct ?? state.product ?? cfg.product,
    },
  });

  if (error || !created.user) {
    console.error("[auth0-callback] createUser failed", error);
    const message = error?.message?.toLowerCase().includes("already")
      ? "An account already exists for this email."
      : "Could not create your account. Please try again.";
    throw new Auth0Error("create_failed", message, 400);
  }

  await linkIdentity(admin, cfg, created.user.id, profile, state);
  return created.user.id;
}

async function linkIdentity(
  admin: SupabaseClient,
  cfg: Auth0Config,
  userId: string,
  profile: Auth0Profile,
  state: LoginState,
) {
  const signupProduct = profile.signupProduct ?? state.product ?? cfg.product;

  // Conflict on user_id, not on auth0_sub: if the same person later signs in
  // through a different Auth0 connection (password first, then Google) with the
  // same verified email, they should keep one Supabase account, and the newest
  // subject wins. `signup_product` re-writes to the same value, because Auth0's
  // claim carries the original signup product and never changes.
  const { error } = await admin.from("auth0_identities").upsert({
    user_id: userId,
    auth0_sub: profile.sub,
    signup_product: signupProduct,
    connection: profile.connection,
    last_login_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) {
    console.error("[auth0-callback] identity link failed", error);
    throw new Auth0Error("link_failed", "Could not link your Auth0 identity.", 500);
  }

  // Mirror the subject into protected app_metadata so it travels in the JWT and
  // cannot be rewritten by the client the way user_metadata can.
  const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { auth0_sub: profile.sub, signup_product: signupProduct },
  });
  if (metadataError) console.error("[auth0-callback] app_metadata update failed", metadataError);
}

serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const auth0Error = url.searchParams.get("error");
  if (auth0Error) {
    const description = url.searchParams.get("error_description") ?? "Sign-in was cancelled.";
    // `access_denied` is the normal outcome of the user backing out, and of an
    // Action refusing the login; neither is worth an error-level log.
    console.warn("[auth0-callback] auth0 returned an error", auth0Error);
    return failure(auth0Error, description.slice(0, 300));
  }

  const code = url.searchParams.get("code") ?? "";
  const stateParam = url.searchParams.get("state") ?? "";
  if (!code || !stateParam) return failure("invalid_request", "Sign-in link was incomplete.");

  let cfg: Auth0Config;
  try {
    cfg = auth0Config();
  } catch (error) {
    console.error("[auth0-callback] configuration error", error);
    return failure("auth0_not_configured", "Single sign-on is not available right now.");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const state = await claimState(admin, stateParam);
  if (!state) return failure("state_expired", "That sign-in link expired. Please try again.");

  try {
    const tokens = await exchangeCode(cfg, code, state.code_verifier);
    if (!tokens.id_token) {
      throw new Auth0Error("missing_id_token", "Auth0 did not return an identity token.", 502);
    }

    const profile = await verifyIdToken(cfg, tokens.id_token, state.nonce);
    const { userId } = await resolveUser(admin, cfg, profile, state);

    await admin
      .from("auth0_identities")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);

    const session = await mintSession(admin, profile.email);

    // The fragment never reaches a server, and the callback page scrubs it from
    // history as soon as it has handed the tokens to the Supabase client.
    const fragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: String(session.expires_in ?? 3600),
      token_type: session.token_type ?? "bearer",
    });
    if (state.next_path) fragment.set("next", state.next_path);

    return redirect(APP_ORIGIN + "/auth/callback#" + fragment.toString());
  } catch (error) {
    if (error instanceof Auth0Error) return failure(error.code, error.message);
    console.error("[auth0-callback] unexpected failure", error);
    return failure("sign_in_failed", "Sign-in could not be completed. Please try again.");
  }
});
