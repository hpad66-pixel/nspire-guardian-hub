import {
  corsHeaders,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  json,
  OAuthError,
  readRequestBody,
  requireConfigured,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, corsHeaders());

  try {
    requireConfigured(env);
    const body = await readRequestBody(request);
    if (body.grant_type === "authorization_code") {
      return json(await exchangeAuthorizationCode(body, env, request), 200, corsHeaders());
    }
    if (body.grant_type === "refresh_token") {
      return json(await exchangeRefreshToken(body, env, request), 200, corsHeaders());
    }
    return json({ error: "unsupported_grant_type" }, 400, corsHeaders());
  } catch (error) {
    if (error instanceof OAuthError) {
      return json({ error: error.error, error_description: error.message }, error.status, corsHeaders());
    }
    return json({ error: "server_error", error_description: error.message || "OAuth token exchange failed." }, 500, corsHeaders());
  }
}
