import {
  approveOAuthConnector,
  corsHeaders,
  json,
  OAuthError,
  parseAuthorizeParams,
  readRequestBody,
  redirectWithCode,
  requireConfigured,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, corsHeaders());

  try {
    requireConfigured(env);
    const body = await readRequestBody(request);
    const params = parseAuthorizeParams(body.oauth || body);
    const userAccessToken = String(body.access_token || "").trim();
    const code = await approveOAuthConnector(params, userAccessToken, env);
    return json({ redirect_url: redirectWithCode(params, code) }, 200, corsHeaders());
  } catch (error) {
    if (error instanceof OAuthError) {
      return json({ error: error.error, error_description: error.message }, error.status, corsHeaders());
    }
    return json({ error: "server_error", error_description: "Connector approval failed." }, 500, corsHeaders());
  }
}
