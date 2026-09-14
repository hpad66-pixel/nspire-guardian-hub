import { json, oauthServerMetadata } from "../oauth/_shared.js";

export function onRequest(context) {
  const { request } = context;
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return json(oauthServerMetadata(request));
}
