import { corsHeaders, json, requireConfigured } from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    requireConfigured(env);
    const body = await request.json().catch(() => ({}));
    const now = Math.floor(Date.now() / 1000);
    return json({
      client_id: `proj-os-claude-${crypto.randomUUID()}`,
      client_id_issued_at: now,
      client_name: String(body.client_name || "Claude Proj OS Connector").slice(0, 120),
      redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "mcp",
    }, 201, corsHeaders());
  } catch (error) {
    return json({ error: error.error || "server_error", error_description: error.message }, error.status || 500, corsHeaders());
  }
}
