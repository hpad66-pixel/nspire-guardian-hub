const FILE_PATH_RE = /\.[a-z0-9]+$/i;

function assetRequest(originalRequest, pathname) {
  const url = new URL(originalRequest.url);
  url.pathname = pathname;
  return new Request(url, originalRequest);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const response = await next();

  if (response.status !== 404) return response;
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (url.pathname.startsWith("/api/")) return response;
  if (FILE_PATH_RE.test(url.pathname)) return response;

  if (url.pathname === "/schedule-demo") {
    return env.ASSETS.fetch(assetRequest(request, "/schedule-demo/index.html"));
  }

  return env.ASSETS.fetch(assetRequest(request, "/index.html"));
}
