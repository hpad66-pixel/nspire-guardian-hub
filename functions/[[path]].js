import { json, oauthServerMetadata, protectedResourceMetadata } from "./oauth/_shared.js";

const FILE_PATH_RE = /\.[a-z0-9]+$/i;
const OAUTH_DISCOVERY_PATHS = new Set([
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
]);

function assetRequest(originalRequest, pathname) {
  const url = new URL(originalRequest.url);
  url.pathname = pathname;
  return new Request(url, originalRequest);
}

function isOAuthDiscoveryPath(pathname) {
  return OAUTH_DISCOVERY_PATHS.has(pathname)
    || pathname.startsWith("/.well-known/oauth-protected-resource/")
    || pathname.startsWith("/.well-known/oauth-authorization-server/");
}

function oauthDiscoveryNotConfigured(request) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  const url = new URL(request.url);
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) return json(protectedResourceMetadata(request));
  return json(oauthServerMetadata(request));
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const response = await next();

  if (response.status !== 404) return response;
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (url.pathname.startsWith("/api/")) return response;
  if (isOAuthDiscoveryPath(url.pathname)) return oauthDiscoveryNotConfigured(request);
  if (FILE_PATH_RE.test(url.pathname)) return response;

  if (url.pathname === "/schedule-demo") {
    return env.ASSETS.fetch(assetRequest(request, "/schedule-demo/index.html"));
  }

  return env.ASSETS.fetch(assetRequest(request, "/index.html"));
}
