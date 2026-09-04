/**
 * Proj OS Agent Gateway session issuer — contract 2026-09-01.
 *
 * Authenticates the real Supabase user, checks active workspace/project access,
 * permission, and explicit agent entitlement, selects the server-owned profile,
 * then issues an ES256 session lasting at most ten minutes.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  AGENT_CONTRACT_VERSION,
  AGENT_RUNTIME_AUDIENCE,
  AGENT_RUNTIME_KIND,
  AGENT_SESSION_MAX_SECONDS,
  PROJECT_TASKS_TOOL,
  AgentContractError,
  parseSessionRequest,
  type AgentSessionClaims,
} from "../_shared/agent-contract.ts";
import { sha256Hex, signAgentSession } from "../_shared/agent-jwt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SESSION_ISSUER = Deno.env.get("AGENT_SESSION_ISSUER") ?? "";
const SESSION_AUDIENCE = Deno.env.get("AGENT_SESSION_AUDIENCE") ?? AGENT_RUNTIME_AUDIENCE;
const SESSION_KEY_ID = Deno.env.get("AGENT_SESSION_KEY_ID") ?? "";
const SESSION_PRIVATE_JWK = Deno.env.get("AGENT_SESSION_PRIVATE_JWK") ?? "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("AGENT_GATEWAY_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean),
);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse("PERMISSION_DENIED", "Origin is not allowed.", 403);
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (request.method !== "POST") return errorResponse("VALIDATION_FAILED", "Method not allowed.", 405, origin);
  if (!configured()) return errorResponse("RUNTIME_UNAVAILABLE", "Agent session issuance is not configured.", 503, origin, true);
  if (hasCallerIdentityHeaders(request.headers)) {
    return errorResponse("VALIDATION_FAILED", "Caller identity headers are not accepted.", 400, origin);
  }

  let parsedRequest;
  try {
    parsedRequest = parseSessionRequest(await request.json());
  } catch (error) {
    return handleError(error, origin);
  }

  const bearer = bearerToken(request.headers.get("authorization"));
  if (!bearer) return errorResponse("AUTHENTICATION_REQUIRED", "Sign in to Proj OS first.", 401, origin);

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user) throw new GatewayError("AUTHENTICATION_REQUIRED", "The Proj OS session is invalid.", 401);
    const userId = authData.user.id;

    const { data: userProfile, error: profileError } = await admin.from("profiles")
      .select("workspace_id, full_name, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!userProfile?.workspace_id || (userProfile.status && userProfile.status !== "active")) {
      throw new GatewayError("PERMISSION_DENIED", "The user is not active in this workspace.", 403);
    }
    const tenantId = String(userProfile.workspace_id);

    const [{ data: canAccess, error: accessError }, { data: canViewTasks, error: permissionError }] = await Promise.all([
      admin.rpc("can_access_project", { _user_id: userId, _project_id: parsedRequest.projectId }),
      admin.rpc("effective_project_permission", {
        _user_id: userId,
        _project_id: parsedRequest.projectId,
        _module: "workflows",
        _action: "view",
      }),
    ]);
    if (accessError) throw accessError;
    if (permissionError) throw permissionError;
    if (!canAccess || !canViewTasks) throw new GatewayError("PERMISSION_DENIED", "That project is not available.", 404);

    const { data: entitlement, error: entitlementError } = await admin.from("agent_entitlements")
      .select("allowed_scopes, allowed_tools, status")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("project_id", parsedRequest.projectId)
      .eq("runtime_kind", AGENT_RUNTIME_KIND)
      .maybeSingle();
    if (entitlementError) throw entitlementError;
    if (!entitlement || entitlement.status !== "enabled") {
      throw new GatewayError("PERMISSION_DENIED", "The Agent pilot is not enabled for this project.", 403);
    }

    const allowedTools = intersect(entitlement.allowed_tools, [PROJECT_TASKS_TOOL]);
    const allowedScopes = intersect(entitlement.allowed_scopes, ["project:read"]);
    if (!allowedTools.includes(PROJECT_TASKS_TOOL) || !allowedScopes.includes("project:read")) {
      throw new GatewayError("PERMISSION_DENIED", "No read-only Agent tools are enabled.", 403);
    }

    const { data: agentProfile, error: agentProfileError } = await admin.from("agent_profiles")
      .upsert({
        tenant_id: tenantId,
        user_id: userId,
        project_id: parsedRequest.projectId,
        runtime_kind: AGENT_RUNTIME_KIND,
        display_name: `${String(userProfile.full_name || "My").trim()} · project agent`,
      }, { onConflict: "tenant_id,user_id,project_id,runtime_kind" })
      .select("id, status, display_name")
      .single();
    if (agentProfileError) throw agentProfileError;
    if (agentProfile.status !== "active") throw new GatewayError("PROFILE_MISMATCH", "The Agent profile is disabled.", 403);

    const idempotencyHash = await sha256Hex(parsedRequest.idempotencyKey);
    const { data: previous, error: previousError } = await admin.from("agent_sessions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("project_id", parsedRequest.projectId)
      .eq("idempotency_key_hash", idempotencyHash)
      .maybeSingle();
    if (previousError) throw previousError;

    let session = previous;
    if (session) {
      if (session.status !== "active" || Date.parse(session.expires_at) <= Date.now()) {
        throw new GatewayError("INVALID_SESSION", "That idempotency key was already used for an expired session.", 409);
      }
      if (session.agent_profile_id !== agentProfile.id) {
        throw new GatewayError("PROFILE_MISMATCH", "The existing session profile does not match.", 409);
      }
    } else {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + AGENT_SESSION_MAX_SECONDS * 1000);
      const row = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        user_id: userId,
        project_id: parsedRequest.projectId,
        agent_profile_id: agentProfile.id,
        runtime_kind: AGENT_RUNTIME_KIND,
        runtime_audience: SESSION_AUDIENCE,
        token_jti: crypto.randomUUID(),
        allowed_scopes: allowedScopes,
        allowed_tools: allowedTools,
        idempotency_key_hash: idempotencyHash,
        correlation_id: parsedRequest.correlationId,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      };
      const { data: inserted, error: insertError } = await admin.from("agent_sessions").insert(row).select("*").single();
      if (insertError) throw insertError;
      session = inserted;
    }

    const claims: AgentSessionClaims = {
      contractVersion: AGENT_CONTRACT_VERSION,
      iss: SESSION_ISSUER,
      aud: SESSION_AUDIENCE,
      sub: userId,
      workspaceId: tenantId,
      userId,
      projectId: parsedRequest.projectId,
      agentProfileId: String(agentProfile.id),
      sessionId: String(session.id),
      scopes: session.allowed_scopes,
      tools: session.allowed_tools,
      iat: Math.floor(Date.parse(session.issued_at) / 1000),
      exp: Math.floor(Date.parse(session.expires_at) / 1000),
      jti: String(session.token_jti),
    };
    const token = await signAgentSession(claims, JSON.parse(SESSION_PRIVATE_JWK), SESSION_KEY_ID);

    return json({
      contractVersion: AGENT_CONTRACT_VERSION,
      sessionToken: token,
      expiresAt: session.expires_at,
      projectId: parsedRequest.projectId,
      agentProfile: { id: agentProfile.id, displayName: agentProfile.display_name },
      permissionMode: "read_only",
      allowedTools: session.allowed_tools,
      correlationId: parsedRequest.correlationId,
    }, 201, origin);
  } catch (error) {
    return handleError(error, origin);
  }
});

class GatewayError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); }
}

function configured() {
  try {
    new URL(SESSION_ISSUER);
    const jwk = JSON.parse(SESSION_PRIVATE_JWK);
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SESSION_KEY_ID && jwk?.kty === "EC" && jwk?.crv === "P-256" && jwk?.d);
  } catch { return false; }
}

function bearerToken(value: string | null) {
  return value?.startsWith("Bearer ") ? value.slice(7) : "";
}

function hasCallerIdentityHeaders(headers: Headers) {
  return ["x-workspace-id", "x-tenant-id", "x-user-id", "x-project-id", "x-agent-profile-id", "x-profile-id"]
    .some((name) => headers.has(name));
}

function intersect(value: unknown, allowed: string[]) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && allowed.includes(entry)) : [];
}

function handleError(error: unknown, origin?: string | null) {
  if (error instanceof AgentContractError || error instanceof GatewayError) {
    return errorResponse(error.code, error.message, error.status, origin);
  }
  console.error("[agent-session]", error instanceof Error ? error.message : "unknown error");
  return errorResponse("INTERNAL_ERROR", "Proj OS could not create the Agent session.", 500, origin, true);
}

function errorResponse(code: string, message: string, status: number, origin?: string | null, retryable = false) {
  return json({ code, message, retryable, correlationId: crypto.randomUUID() }, status, origin);
}

function json(body: unknown, status: number, origin?: string | null) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function responseHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-correlation-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}
