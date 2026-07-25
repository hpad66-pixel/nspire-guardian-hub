// Shared Gmail OAuth helpers. The `state` param is signed (HMAC-SHA256 with the
// service-role key) so the PUBLIC callback can trust who started the flow —
// tenant + user + return path travel in the signed state, not a session.

const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
const timingSafe = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export interface StateData { t: string; u: string; r?: string; o?: string } // tenant, user, returnTo, origin

export async function signState(secret: string, data: StateData): Promise<string> {
  const nonce = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const payload = { ...data, n: nonce, e: Date.now() + 10 * 60 * 1000 }; // 10-min expiry
  const b = b64url(JSON.stringify(payload));
  return `${b}.${await hmacHex(secret, b)}`;
}

export async function verifyState(secret: string, state: string | null): Promise<StateData | null> {
  if (!state) return null;
  const dot = state.lastIndexOf(".");
  if (dot < 1) return null;
  const b = state.slice(0, dot), sig = state.slice(dot + 1);
  if (!timingSafe(await hmacHex(secret, b), sig)) return null;
  try {
    const p = JSON.parse(unb64url(b));
    if (!p.e || Date.now() > p.e || !p.t || !p.u) return null;
    return { t: p.t, u: p.u, r: typeof p.r === "string" ? p.r : undefined, o: typeof p.o === "string" ? p.o : undefined };
  } catch { return null; }
}

// Only redirect back to a known app origin (prevents open-redirect + the wrong
// domain). The user should land on whichever domain they started the flow from.
const ALLOWED_ORIGINS = [
  "https://projos.ai",
  "https://buildos.apas.ai",
  "https://build.apas.ai",
  "http://localhost:5173",
  "http://localhost:8080",
];
export function safeOrigin(o?: string | null): string {
  if (o && ALLOWED_ORIGINS.includes(o)) return o;
  return Deno.env.get("APP_ORIGIN") || "https://projos.ai";
}

export const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";

export function redirectUri(): string {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-oauth-callback`;
}

export function authorizeUrl(state: string, loginHint?: string): string {
  const p = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",       // force a refresh_token every time
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export interface GoogleTokens { access_token: string; refresh_token?: string; expires_in: number; scope: string }

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "",
      code,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

/** The connected Gmail address (via the Gmail profile — needs only gmail.readonly). */
export async function gmailAddress(accessToken: string): Promise<string> {
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`gmail profile failed: ${r.status}`);
  const d = await r.json();
  return String(d.emailAddress ?? "");
}

/** Only allow a relative in-app return path (no protocol-relative / absolute URLs). */
export function safeReturnPath(r?: string): string {
  if (!r || !r.startsWith("/") || r.startsWith("//")) return "/";
  return r;
}
