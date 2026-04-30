/**
 * F3 · /api/v1 thin wrapper — auth + rate-limit + meter + route to PostgREST.
 *
 * Minimal surface: GET /api/v1/commitments, /projects, /change-orders,
 * /budget, /rfis; POST /api/v1/commitments, /direct-costs.
 *
 * Authorization: Bearer <access_token>  (from /oauth/token)
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// In-memory rate limit window (per-instance; OK for single-region deploys,
// swap for Redis when scaling horizontally).
const rlWindow = new Map<string, { count: number; resetAt: number }>();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "missing_token" }, 401);

  const tokenHash = await sha256Hex(token);
  const { data: tokenRow } = await admin
    .from("api_tokens")
    .select("*, api_clients(*)")
    .eq("access_token_hash", tokenHash)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!tokenRow) return json({ error: "invalid_token" }, 401);

  const client = (tokenRow as any).api_clients;
  if (!client?.is_active) return json({ error: "client_revoked" }, 401);

  const limit = client.rate_limit ?? 600;
  const rlKey = `${(tokenRow as any).api_client_id}`;
  const now = Date.now();
  const rl = rlWindow.get(rlKey);
  if (!rl || rl.resetAt < now) {
    rlWindow.set(rlKey, { count: 1, resetAt: now + 60_000 });
  } else {
    rl.count += 1;
    if (rl.count > limit) {
      const retryAfter = Math.ceil((rl.resetAt - now) / 1000);
      return json(
        { error: "rate_limit_exceeded" },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // Path shape: /api-v1/<resource>[/<id>]  — Supabase strips /functions/v1/ prefix
  const resourceIdx = parts.indexOf("api-v1") === -1
    ? (parts[0] === "api" && parts[1] === "v1" ? 2 : 1)
    : parts.indexOf("api-v1") + 1;
  const resource = parts[resourceIdx];
  const id = parts[resourceIdx + 1];
  const scopes: string[] = (tokenRow as any).scopes ?? [];
  const tenantId = (tokenRow as any).tenant_id as string;

  const method = req.method;
  const neededScope =
    method === "GET" ? `read:${resource}` : `write:${resource}`;
  if (!scopes.includes(neededScope)) {
    await meter(tenantId, client.id, true);
    return json({ error: "insufficient_scope", required: neededScope }, 403);
  }

  try {
    let response: Response;
    switch (resource) {
      case "projects":
        response = await routeProjects(method, tenantId, id, req);
        break;
      case "commitments":
        response = await routeCommitments(method, tenantId, id, req);
        break;
      case "change-orders":
        response = await routeChangeOrders(method, tenantId, id, req, url);
        break;
      case "budget":
        response = await routeBudget(tenantId, url);
        break;
      case "rfis":
        response = await routeRfis(tenantId, url);
        break;
      case "direct-costs":
        response = await routeDirectCosts(method, tenantId, req);
        break;
      default:
        response = json({ error: "unknown_resource" }, 404);
    }
    await meter(tenantId, client.id, false);
    return response;
  } catch (err) {
    console.error("[api-v1]", (err as Error).message);
    await meter(tenantId, client.id, true);
    return json({ error: (err as Error).message }, 500);
  }
});

async function routeProjects(method: string, tenantId: string, id: string | undefined, req: Request) {
  if (method !== "GET") return json({ error: "method_not_allowed" }, 405);
  let q = admin.from("projects").select("*");
  if (id) q = q.eq("id", id);
  const { data, error } = await q;
  if (error) throw error;
  return json({ data });
}

async function routeCommitments(method: string, tenantId: string, id: string | undefined, req: Request) {
  if (method === "GET") {
    let q = admin.from("commitments").select("*").eq("tenant_id", tenantId);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return json({ data });
  }
  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await admin.from("commitments")
      .insert({ ...body, tenant_id: tenantId }).select().single();
    if (error) throw error;
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await admin.from("commitments")
      .update(body).eq("id", id).eq("tenant_id", tenantId).select().single();
    if (error) throw error;
    return json({ data });
  }
  return json({ error: "method_not_allowed" }, 405);
}

async function routeChangeOrders(method: string, tenantId: string, id: string | undefined, req: Request, url: URL) {
  if (method !== "GET") return json({ error: "method_not_allowed" }, 405);
  let q = admin.from("change_orders").select("*").eq("tenant_id", tenantId);
  const projectId = url.searchParams.get("project_id");
  if (projectId) q = q.eq("project_id", projectId);
  if (id) q = q.eq("id", id);
  const { data, error } = await q;
  if (error) throw error;
  return json({ data });
}

async function routeBudget(tenantId: string, url: URL) {
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return json({ error: "project_id_required" }, 400);
  const { data: budget } = await admin.from("project_budgets")
    .select("id").eq("project_id", projectId).eq("is_active", true).maybeSingle();
  if (!budget) return json({ data: [] });
  const { data, error } = await admin.from("budget_matrix")
    .select("*").eq("project_budget_id", (budget as any).id);
  if (error) throw error;
  return json({ data });
}

async function routeRfis(tenantId: string, url: URL) {
  const projectId = url.searchParams.get("project_id");
  let q = admin.from("project_rfis").select("*");
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return json({ data });
}

async function routeDirectCosts(method: string, tenantId: string, req: Request) {
  if (method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.json();
  const { data, error } = await admin.from("direct_costs")
    .insert({ ...body, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return json({ data }, 201);
}

async function meter(tenantId: string, clientId: string, isError: boolean) {
  await admin.rpc("bump_api_usage", {
    p_tenant_id: tenantId, p_client_id: clientId, p_is_error: isError,
  } as any);
}

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra } });
}
