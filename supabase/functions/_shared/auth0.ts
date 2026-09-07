// Shared Auth0 plumbing for the Universal Login bridge.
//
// Auth0 is the front door for every APAS product; this file is the ProjOS side
// of the OIDC Authorization Code + PKCE handshake. Supabase Auth still owns the
// session the app runs on, so nothing here issues a token the database trusts --
// it only proves who the person is, so `auth0-callback` can mint a real Supabase
// session for them.

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "https://esm.sh/jose@5.9.6";

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  product: string;
  appOrigin: string;
  callbackUrl: string;
}

export class Auth0Error extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

const trimSlashes = (value: string) => value.trim().replace(/\/+$/, "");

/**
 * Reads and validates the Auth0 configuration. Throws loudly at request time
 * rather than silently redirecting to a half-built /authorize URL.
 */
export function auth0Config(): Auth0Config {
  const domain = trimSlashes(Deno.env.get("AUTH0_DOMAIN") ?? "").replace(/^https?:\/\//, "");
  const clientId = (Deno.env.get("AUTH0_CLIENT_ID") ?? "").trim();
  const clientSecret = (Deno.env.get("AUTH0_CLIENT_SECRET") ?? "").trim();
  const appOrigin = trimSlashes(Deno.env.get("APP_ORIGIN") ?? "https://projos.ai");
  const product = (Deno.env.get("AUTH0_PRODUCT_SLUG") ?? "projos").trim();
  const supabaseUrl = trimSlashes(Deno.env.get("SUPABASE_URL") ?? "");

  if (!domain || !clientId || !clientSecret) {
    throw new Auth0Error(
      "auth0_not_configured",
      "Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET.",
      503,
    );
  }

  const callbackUrl = trimSlashes(
    Deno.env.get("AUTH0_CALLBACK_URL") ?? supabaseUrl + "/functions/v1/auth0-callback",
  );

  return {
    domain,
    clientId,
    clientSecret,
    // Auth0 issues tokens with a trailing slash on the issuer.
    issuer: "https://" + domain + "/",
    product,
    appOrigin,
    callbackUrl,
  };
}

// -- PKCE + nonce -----------------------------------------------------------

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomUrlSafe(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** S256 code challenge for the PKCE verifier (RFC 7636). */
export async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// -- Authorize --------------------------------------------------------------

export interface AuthorizeOptions {
  state: string;
  codeChallenge: string;
  nonce: string;
  /** `signup` sends Universal Login straight to the sign-up tab. */
  mode: "login" | "signup";
  /** Pre-fills the email field, e.g. the address an invitation was sent to. */
  loginHint?: string | null;
}

export function buildAuthorizeUrl(cfg: Auth0Config, options: AuthorizeOptions): string {
  const url = new URL("https://" + cfg.domain + "/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.callbackUrl);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", options.state);
  url.searchParams.set("nonce", options.nonce);
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Read by the post-login Action to stamp app_metadata.signup_product, so one
  // Auth0 tenant can tell a ProjOS signup from any other product's. Auth0 only
  // forwards custom /authorize parameters that carry the `ext-` prefix.
  url.searchParams.set("ext-product", cfg.product);
  if (options.mode === "signup") url.searchParams.set("screen_hint", "signup");
  if (options.loginHint) url.searchParams.set("login_hint", options.loginHint);
  return url.toString();
}

export function buildLogoutUrl(cfg: Auth0Config, returnTo: string): string {
  const url = new URL("https://" + cfg.domain + "/v2/logout");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

// -- Token exchange + verification ------------------------------------------

interface TokenResponse {
  id_token?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

export async function exchangeCode(
  cfg: Auth0Config,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const response = await fetch("https://" + cfg.domain + "/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: cfg.callbackUrl,
    }),
  });

  if (!response.ok) {
    // Auth0's error body can name the client; log it, never surface it.
    console.error("[auth0] token exchange failed", response.status, await response.text());
    throw new Auth0Error("token_exchange_failed", "Could not complete sign-in with Auth0.", 502);
  }

  return await response.json() as TokenResponse;
}

export interface Auth0Profile {
  sub: string;
  email: string;
  emailVerified: boolean;
  fullName: string | null;
  connection: string | null;
  signupProduct: string | null;
  products: string[];
}

const NAMESPACE = "https://apas.ai/";

// createRemoteJWKSet keeps its own TTL'd cache, so a warm invocation reuses the
// signing keys instead of refetching JWKS on every sign-in.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwks(cfg: Auth0Config) {
  const cached = jwksCache.get(cfg.domain);
  if (cached) return cached;
  const created = createRemoteJWKSet(new URL("https://" + cfg.domain + "/.well-known/jwks.json"));
  jwksCache.set(cfg.domain, created);
  return created;
}

function namespacedString(payload: JWTPayload, key: string): string | null {
  const value = payload[NAMESPACE + key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Verifies the ID token signature against Auth0's JWKS and checks issuer,
 * audience, expiry, and the nonce planted before the redirect. The nonce check
 * is what stops a token minted for a different session being replayed here.
 */
export async function verifyIdToken(
  cfg: Auth0Config,
  idToken: string,
  expectedNonce: string,
): Promise<Auth0Profile> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, jwks(cfg), {
      issuer: cfg.issuer,
      audience: cfg.clientId,
      clockTolerance: 60,
    }));
  } catch (error) {
    console.error("[auth0] id_token verification failed", error);
    throw new Auth0Error("invalid_id_token", "Could not verify the Auth0 identity token.", 401);
  }

  if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) {
    throw new Auth0Error("nonce_mismatch", "Sign-in could not be verified. Please try again.", 401);
  }

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!sub || !email) {
    throw new Auth0Error("missing_identity", "Auth0 did not return an email address.", 400);
  }

  const rawProducts = payload[NAMESPACE + "products"];
  const products = Array.isArray(rawProducts)
    ? rawProducts.filter((entry): entry is string => typeof entry === "string")
    : [];

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";

  return {
    sub,
    email,
    emailVerified: payload.email_verified === true,
    fullName: name || nickname || null,
    connection: namespacedString(payload, "connection"),
    signupProduct: namespacedString(payload, "signup_product"),
    products,
  };
}
