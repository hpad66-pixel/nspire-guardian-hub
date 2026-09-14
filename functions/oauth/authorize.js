import {
  html,
  OAuthError,
  parseAuthorizeParams,
  renderConsentPage,
  requireConfigured,
  validateAuthorizeParams,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  try {
    requireConfigured(env);
    if (request.method === "GET") return handleGet(request, env);
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
  return html(renderConsentPage(params, env));
}
