import {
  html,
  issueAuthorizationCode,
  OAuthError,
  parseAuthorizeParams,
  redirect,
  renderApprovalPage,
  requireConfigured,
  validateAuthorizeParams,
  verifySharedSecret,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  try {
    requireConfigured(env);
    if (request.method === "GET") return handleGet(request, env);
    if (request.method === "POST") return handlePost(request, env);
    return html("Method not allowed", 405);
  } catch (error) {
    if (error instanceof OAuthError) return html(error.message, error.status);
    return html("Proj OS MCP OAuth is not configured.", 503);
  }
}

function handleGet(request, env) {
  const url = new URL(request.url);
  const params = parseAuthorizeParams(url.searchParams);
  validateAuthorizeParams(params, env);
  return html(renderApprovalPage(params));
}

async function handlePost(request, env) {
  const form = await request.formData();
  const params = parseAuthorizeParams(new URLSearchParams(Object.fromEntries(form.entries())));
  validateAuthorizeParams(params, env);

  if (!(await verifySharedSecret(form.get("approval_secret"), env))) {
    return html(renderApprovalPage(params, "That secret did not match the configured Proj OS MCP secret."), 401);
  }

  const code = await issueAuthorizationCode(params, env);
  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (params.state) redirectUrl.searchParams.set("state", params.state);
  return redirect(redirectUrl.toString());
}
