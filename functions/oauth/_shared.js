const CODE_PREFIX = "pos_mcp_code_";
const ACCESS_PREFIX = "pos_mcp_oauth_";
const REFRESH_PREFIX = "pos_mcp_refresh_";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 90;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;
const AUTH_CODE_TTL_SECONDS = 5 * 60;

const DEFAULT_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "https://app.claude.ai/api/mcp/auth_callback",
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function oauthServerMetadata(request) {
  const origin = new URL(request.url).origin;
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp"],
    service_documentation: `${origin}/docs/proj-os-mcp`,
  };
}

export function protectedResourceMetadata(request) {
  const origin = new URL(request.url).origin;
  return {
    resource: `${origin}/mcp`,
    resource_name: "Proj OS MCP",
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  };
}

export function protectedResourceMetadataUrl(request) {
  const origin = new URL(request.url).origin;
  return `${origin}/.well-known/oauth-protected-resource/mcp`;
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
  };
}

export function requireConfigured(env) {
  if (!env.PROJ_OS_MCP_SHARED_SECRET) {
    throw new OAuthError("server_error", "Proj OS MCP OAuth is not configured.", 503);
  }
}

export function parseAuthorizeParams(input) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(input);
  return {
    response_type: params.get("response_type") || "",
    client_id: params.get("client_id") || "",
    redirect_uri: params.get("redirect_uri") || "",
    state: params.get("state") || "",
    code_challenge: params.get("code_challenge") || "",
    code_challenge_method: params.get("code_challenge_method") || "",
    scope: params.get("scope") || "mcp",
  };
}

export function validateAuthorizeParams(params, env) {
  if (params.response_type !== "code") throw new OAuthError("unsupported_response_type", "Only authorization code is supported.", 400);
  if (!params.client_id) throw new OAuthError("invalid_request", "Missing client_id.", 400);
  if (!params.redirect_uri) throw new OAuthError("invalid_request", "Missing redirect_uri.", 400);
  if (!isAllowedRedirectUri(params.redirect_uri, env)) throw new OAuthError("invalid_request", "redirect_uri is not allowed.", 400);
  if (!params.code_challenge) throw new OAuthError("invalid_request", "Missing PKCE code_challenge.", 400);
  if (params.code_challenge_method !== "S256") throw new OAuthError("invalid_request", "PKCE S256 is required.", 400);
}

export function isAllowedRedirectUri(uri, env) {
  let parsed;
  try { parsed = new URL(uri); } catch { return false; }
  const configured = String(env.PROJ_OS_OAUTH_REDIRECT_URIS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = configured.length > 0 ? configured : DEFAULT_REDIRECT_URIS;
  if (allowed.includes(uri)) return true;
  return parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname);
}

export async function issueAuthorizationCode(params, env) {
  const now = nowSeconds();
  return signPayload({
    typ: "authorization_code",
    iss: "proj-os-mcp",
    iat: now,
    exp: now + AUTH_CODE_TTL_SECONDS,
    jti: crypto.randomUUID(),
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    scope: normalizeScope(params.scope),
  }, env.PROJ_OS_MCP_SHARED_SECRET, CODE_PREFIX);
}

export async function exchangeAuthorizationCode(body, env, request) {
  const code = String(body.code || "");
  const payload = await verifyPayload(code, env.PROJ_OS_MCP_SHARED_SECRET, CODE_PREFIX);
  if (!payload || payload.typ !== "authorization_code") throw new OAuthError("invalid_grant", "Invalid authorization code.", 400);
  if (body.redirect_uri && String(body.redirect_uri) !== payload.redirect_uri) throw new OAuthError("invalid_grant", "redirect_uri mismatch.", 400);
  if (!body.code_verifier) throw new OAuthError("invalid_request", "Missing code_verifier.", 400);
  const challenge = await pkceChallenge(String(body.code_verifier));
  if (challenge !== payload.code_challenge) throw new OAuthError("invalid_grant", "PKCE verification failed.", 400);
  return issueTokens(payload.client_id, payload.scope || "mcp", env, request);
}

export async function exchangeRefreshToken(body, env, request) {
  const refreshToken = String(body.refresh_token || "");
  const payload = await verifyPayload(refreshToken, env.PROJ_OS_MCP_SHARED_SECRET, REFRESH_PREFIX);
  if (!payload || payload.typ !== "refresh_token") throw new OAuthError("invalid_grant", "Invalid refresh token.", 400);
  return issueTokens(payload.client_id, payload.scope || "mcp", env, request);
}

export async function issueTokens(clientId, scope, env, request) {
  const now = nowSeconds();
  const origin = new URL(request.url).origin;
  const accessToken = await signPayload({
    typ: "access_token",
    iss: origin,
    aud: `${origin}/mcp`,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS,
    client_id: clientId,
    scope: normalizeScope(scope),
  }, env.PROJ_OS_MCP_SHARED_SECRET, ACCESS_PREFIX);
  const refreshToken = await signPayload({
    typ: "refresh_token",
    iss: origin,
    iat: now,
    exp: now + REFRESH_TTL_SECONDS,
    client_id: clientId,
    scope: normalizeScope(scope),
  }, env.PROJ_OS_MCP_SHARED_SECRET, REFRESH_PREFIX);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: normalizeScope(scope),
  };
}

export async function verifyMcpAccessToken(token, env, request) {
  if (!token?.startsWith(ACCESS_PREFIX)) return null;
  const payload = await verifyPayload(token, env.PROJ_OS_MCP_SHARED_SECRET, ACCESS_PREFIX);
  if (!payload || payload.typ !== "access_token") return null;
  const expectedAudience = `${new URL(request.url).origin}/mcp`;
  return payload.aud === expectedAudience ? payload : null;
}

export async function verifySharedSecret(input, env) {
  return secureEqual(String(input || ""), String(env.PROJ_OS_MCP_SHARED_SECRET || ""));
}

export async function readRequestBody(req) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  if (contentType.includes("application/json")) return req.json();
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

export function renderApprovalPage(params, message = "") {
  const fields = Object.entries(params)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`)
    .join("\n");
  const warning = message ? `<p class="error">${escapeHtml(message)}</p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize Proj OS MCP</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7f9; color: #17202a; }
    main { width: min(440px, calc(100vw - 32px)); background: white; border: 1px solid #d9e2ea; border-radius: 8px; padding: 28px; box-shadow: 0 12px 30px rgba(24, 39, 57, 0.08); }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; letter-spacing: 0; }
    p { margin: 0 0 18px; color: #465666; line-height: 1.5; }
    label { display: block; font-size: 13px; font-weight: 650; margin-bottom: 8px; color: #25313d; }
    input[type="password"] { box-sizing: border-box; width: 100%; border: 1px solid #b9c7d4; border-radius: 6px; font: inherit; padding: 11px 12px; }
    button { width: 100%; margin-top: 16px; border: 0; border-radius: 6px; padding: 11px 14px; background: #116149; color: white; font-weight: 750; cursor: pointer; }
    .error { color: #a73226; font-weight: 650; }
    .meta { font-size: 12px; color: #657386; margin-top: 16px; margin-bottom: 0; word-break: break-word; }
  </style>
</head>
<body>
  <main>
    <h1>Authorize Proj OS</h1>
    <p>Claude is asking to connect to the Proj OS MCP endpoint. Enter the MCP shared secret from the deployment settings to approve this connector.</p>
    ${warning}
    <form method="post" action="/oauth/authorize">
      ${fields}
      <label for="approval_secret">MCP shared secret</label>
      <input id="approval_secret" name="approval_secret" type="password" autocomplete="one-time-code" required autofocus>
      <button type="submit">Authorize Connector</button>
    </form>
    <p class="meta">Redirect: ${escapeHtml(params.redirect_uri || "")}</p>
  </main>
</body>
</html>`;
}

export function redirectWithOAuthError(redirectUri, error, state) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return redirect(url.toString());
}

export class OAuthError extends Error {
  constructor(error, description, status = 400) {
    super(description);
    this.error = error;
    this.status = status;
  }
}

function normalizeScope(scope) {
  const values = String(scope || "mcp").split(/\s+/).filter(Boolean);
  return values.includes("mcp") ? "mcp" : "mcp";
}

async function signPayload(payload, secret, prefix) {
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSign(body, secret);
  return `${prefix}${body}.${signature}`;
}

async function verifyPayload(token, secret, prefix) {
  if (!token.startsWith(prefix)) return null;
  const signed = token.slice(prefix.length);
  const [body, signature] = signed.split(".");
  if (!body || !signature) return null;
  const expected = await hmacSign(body, secret);
  if (!(await secureEqual(signature, expected))) return null;
  let payload;
  try { payload = JSON.parse(decoder.decode(b64urlDecode(body))); } catch { return null; }
  if (!payload.exp || Number(payload.exp) <= nowSeconds()) return null;
  return payload;
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return b64url(new Uint8Array(signature));
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return b64url(new Uint8Array(digest));
}

async function secureEqual(a, b) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
