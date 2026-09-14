const CODE_PREFIX = "pos_mcp_code_";
const ACCESS_PREFIX = "pos_mcp_oauth_";
const REFRESH_PREFIX = "pos_mcp_refresh_";
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;
const AUTH_CODE_TTL_SECONDS = 5 * 60;

const MCP_API_SCOPES = [
  "read:projects",
  "write:projects",
  "read:contacts",
  "write:contacts",
  "read:project-directory",
  "write:project-directory",
  "read:action-items",
  "write:action-items",
  "read:project-status",
  "read:change-orders",
  "write:change-orders",
  "read:proposals",
  "write:proposals",
  "read:pay-apps",
  "write:pay-apps",
  "read:client-updates",
  "write:client-updates",
  "read:project-updates",
  "write:project-updates",
];

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

export async function issueAuthorizationCode(params, env, grant = {}) {
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
    api_client_id: grant.apiClientId,
    api_client_secret: grant.apiClientSecret,
    tenant_id: grant.tenantId,
    user_id: grant.userId,
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
  return issueTokens(payload.client_id, payload.scope || "mcp", env, request, {
    apiClientId: payload.api_client_id,
    apiClientSecret: payload.api_client_secret,
    tenantId: payload.tenant_id,
    userId: payload.user_id,
  });
}

export async function exchangeRefreshToken(body, env, request) {
  const refreshToken = String(body.refresh_token || "");
  const payload = await verifyPayload(refreshToken, env.PROJ_OS_MCP_SHARED_SECRET, REFRESH_PREFIX);
  if (!payload || payload.typ !== "refresh_token") throw new OAuthError("invalid_grant", "Invalid refresh token.", 400);
  return issueTokens(payload.client_id, payload.scope || "mcp", env, request, {
    apiClientId: payload.api_client_id,
    apiClientSecret: payload.api_client_secret,
    tenantId: payload.tenant_id,
    userId: payload.user_id,
  });
}

export async function issueTokens(clientId, scope, env, request, grant = {}) {
  const now = nowSeconds();
  const origin = new URL(request.url).origin;
  if (!grant.apiClientId || !grant.apiClientSecret) {
    throw new OAuthError("invalid_grant", "This authorization grant is not linked to a Proj OS workspace.", 400);
  }
  const apiToken = grant.apiClientId && grant.apiClientSecret
    ? await mintProjOsApiToken(env, {
      client_id: grant.apiClientId,
      client_secret: grant.apiClientSecret,
    })
    : null;
  const accessToken = await signPayload({
    typ: "access_token",
    iss: origin,
    aud: `${origin}/mcp`,
    iat: now,
    exp: now + Number(apiToken?.expires_in || ACCESS_TTL_SECONDS),
    client_id: clientId,
    scope: normalizeScope(scope),
    api_token: apiToken?.access_token,
    tenant_id: grant.tenantId,
    user_id: grant.userId,
  }, env.PROJ_OS_MCP_SHARED_SECRET, ACCESS_PREFIX);
  const refreshToken = await signPayload({
    typ: "refresh_token",
    iss: origin,
    iat: now,
    exp: now + REFRESH_TTL_SECONDS,
    client_id: clientId,
    scope: normalizeScope(scope),
    api_client_id: grant.apiClientId,
    api_client_secret: grant.apiClientSecret,
    tenant_id: grant.tenantId,
    user_id: grant.userId,
  }, env.PROJ_OS_MCP_SHARED_SECRET, REFRESH_PREFIX);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Number(apiToken?.expires_in || ACCESS_TTL_SECONDS),
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

export function mcpApiScopes() {
  return [...MCP_API_SCOPES];
}

async function mintApiClientForUser(env, userAccessToken, params) {
  const response = await fetch(`${functionsBase(env)}/api-key-mint`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${userAccessToken}`,
      apikey: supabasePublishableKey(env),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: `Claude MCP - ${String(params.client_id || "connector").slice(0, 80)}`,
      scopes: MCP_API_SCOPES,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.client_id || !payload.client_secret) {
    throw new OAuthError(
      oauthErrorForStatus(response.status),
      payload.error_description || payload.error || "Proj OS denied connector approval.",
      response.status === 402 ? 403 : response.status,
    );
  }
  return payload;
}

async function mintProjOsApiToken(env, apiClient) {
  const response = await fetch(`${functionsBase(env)}/oauth-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: apiClient.client_id,
      client_secret: apiClient.client_secret,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new OAuthError("server_error", "Proj OS could not issue the workspace API token.", 502);
  }
  return payload;
}

function functionsBase(env) {
  const explicit = String(env.PROJ_OS_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const base = supabaseUrl(env).replace(/\/$/, "");
  if (!base) throw new OAuthError("server_error", "Proj OS Supabase URL is not configured.", 503);
  return `${base}/functions/v1`;
}

function supabaseUrl(env) {
  return String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || "");
}

function supabasePublishableKey(env) {
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "");
  if (!key) throw new OAuthError("server_error", "Proj OS publishable Supabase key is not configured.", 503);
  return key;
}

function oauthErrorForStatus(status) {
  if (status === 401) return "login_required";
  if (status === 403) return "access_denied";
  if (status === 402) return "access_denied";
  return "server_error";
}

export async function approveOAuthConnector(params, userAccessToken, env) {
  validateAuthorizeParams(params, env);
  if (!userAccessToken) throw new OAuthError("login_required", "Sign in to Proj OS before authorizing Claude.", 401);
  const client = await mintApiClientForUser(env, userAccessToken, params);
  return issueAuthorizationCode(params, env, {
    apiClientId: client.client_id,
    apiClientSecret: client.client_secret,
    tenantId: client.api_client?.workspace_id || client.tenant_id,
    userId: client.api_client?.created_by || client.user_id,
  });
}

export function redirectWithCode(params, code) {
  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (params.state) redirectUrl.searchParams.set("state", params.state);
  return redirectUrl.toString();
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

export function renderConsentPage(params, env, message = "") {
  const oauth = JSON.stringify(params).replace(/</g, "\\u003c");
  const runtime = JSON.stringify({
    supabaseUrl: supabaseUrl(env),
    signInPath: `/auth?next=${encodeURIComponent(`/oauth/authorize?${new URLSearchParams(params).toString()}`)}`,
  }).replace(/</g, "\\u003c");
  const warning = message ? `<p class="error" data-error>${escapeHtml(message)}</p>` : `<p class="error" data-error hidden></p>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize Proj OS MCP</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7f9; color: #17202a; }
    main { width: min(520px, calc(100vw - 32px)); background: white; border: 1px solid #d9e2ea; border-radius: 8px; padding: 28px; box-shadow: 0 12px 30px rgba(24, 39, 57, 0.08); }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; letter-spacing: 0; }
    p { margin: 0 0 18px; color: #465666; line-height: 1.5; }
    button, a.button { box-sizing: border-box; display: inline-flex; width: 100%; align-items: center; justify-content: center; margin-top: 8px; border: 0; border-radius: 6px; padding: 11px 14px; background: #116149; color: white; font: inherit; font-weight: 750; cursor: pointer; text-decoration: none; }
    button.secondary { background: #e6edf3; color: #17202a; }
    button:disabled { cursor: wait; opacity: 0.72; }
    ul { margin: 0 0 18px; padding-left: 20px; color: #465666; line-height: 1.5; }
    .error { color: #a73226; font-weight: 650; }
    .meta { font-size: 12px; color: #657386; margin-top: 16px; margin-bottom: 0; word-break: break-word; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <main>
    <h1>Connect Claude to Proj OS</h1>
    <p>Claude is asking to connect to this Proj OS workspace. Sign in with your Proj OS account, then approve the connector for your authorized workspace.</p>
    ${warning}
    <ul>
      <li>Uses your Proj OS workspace permissions.</li>
      <li>Creates a revocable API client for this connector.</li>
      <li>Does not require Cloudflare secrets or database credentials.</li>
    </ul>
    <a class="button" data-sign-in href="#">Sign in to Proj OS</a>
    <button type="button" data-approve hidden>Approve Claude connector</button>
    <button type="button" class="secondary" data-refresh hidden>Check sign-in again</button>
    <p class="meta">Redirect: ${escapeHtml(params.redirect_uri || "")}</p>
  </main>
  <script>
    const oauth = ${oauth};
    const runtime = ${runtime};
    const signIn = document.querySelector("[data-sign-in]");
    const approve = document.querySelector("[data-approve]");
    const refresh = document.querySelector("[data-refresh]");
    const error = document.querySelector("[data-error]");

    signIn.href = runtime.signInPath;
    const session = readSupabaseSession(runtime.supabaseUrl);
    if (session?.access_token) {
      signIn.hidden = true;
      approve.hidden = false;
      refresh.hidden = false;
    }

    refresh.addEventListener("click", () => location.reload());
    approve.addEventListener("click", async () => {
      approve.disabled = true;
      approve.textContent = "Approving...";
      error.hidden = true;
      try {
        const current = readSupabaseSession(runtime.supabaseUrl);
        if (!current?.access_token) throw new Error("Your Proj OS session was not found. Sign in and try again.");
        const response = await fetch("/oauth/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ oauth, access_token: current.access_token }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.redirect_url) throw new Error(body.error_description || "Connector approval failed.");
        location.assign(body.redirect_url);
      } catch (err) {
        error.textContent = err.message || "Connector approval failed.";
        error.hidden = false;
        approve.disabled = false;
        approve.textContent = "Approve Claude connector";
      }
    });

    function readSupabaseSession(supabaseUrl) {
      const keys = [];
      try {
        const host = new URL(supabaseUrl).hostname;
        const projectRef = host.split(".")[0];
        if (projectRef) keys.push("sb-" + projectRef + "-auth-token");
      } catch {}
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) keys.push(key);
      }
      for (const key of [...new Set(keys)]) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || "null");
          const session = parsed?.currentSession || parsed;
          if (session?.access_token) return session;
        } catch {}
      }
      return null;
    }
  </script>
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
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(prefix) },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return `${prefix}${b64url(iv)}.${b64url(new Uint8Array(ciphertext))}`;
}

async function verifyPayload(token, secret, prefix) {
  if (!token.startsWith(prefix)) return null;
  const encrypted = token.slice(prefix.length);
  const [ivBody, cipherBody] = encrypted.split(".");
  if (!ivBody || !cipherBody) return null;
  let payload;
  try {
    const key = await encryptionKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64urlDecode(ivBody), additionalData: encoder.encode(prefix) },
      key,
      b64urlDecode(cipherBody),
    );
    payload = JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
  if (!payload.exp || Number(payload.exp) <= nowSeconds()) return null;
  return payload;
}

async function encryptionKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
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
