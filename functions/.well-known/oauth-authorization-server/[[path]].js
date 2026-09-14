const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function onRequest(context) {
  const { request } = context;
  if (request.method === "HEAD") return new Response(null, { status: 404, headers: HEADERS });
  return new Response(JSON.stringify({
    error: "oauth_discovery_not_configured",
    message: "Proj OS /mcp uses a static Authorization bearer header. Configure a static MCP header instead of OAuth discovery for this endpoint.",
  }), { status: 404, headers: HEADERS });
}
