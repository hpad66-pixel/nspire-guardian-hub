/**
 * Proj OS Agent Gateway read-tool endpoint — contract 2026-09-01.
 * Project/user/profile scope comes only from the verified agent session.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  AGENT_CONTRACT_VERSION,
  AGENT_RUNTIME_AUDIENCE,
  AGENT_RUNTIME_KIND,
  PROJECT_TASKS_TOOL,
  AgentContractError,
  parseToolRequest,
  type AgentSessionClaims,
  type ToolRequest,
} from "../_shared/agent-contract.ts";
import { parseAgentPublicKeyRing, sha256Hex, verifyAgentSession } from "../_shared/agent-jwt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SESSION_ISSUER = Deno.env.get("AGENT_SESSION_ISSUER") ?? "";
const SESSION_AUDIENCE = Deno.env.get("AGENT_SESSION_AUDIENCE") ?? AGENT_RUNTIME_AUDIENCE;
const SESSION_KEY_ID = Deno.env.get("AGENT_SESSION_KEY_ID") ?? "";
const SESSION_PUBLIC_JWK = Deno.env.get("AGENT_SESSION_PUBLIC_JWK") ?? "";
const SESSION_PUBLIC_JWKS = Deno.env.get("AGENT_SESSION_PUBLIC_JWKS") ?? "";
const PROJ_OS_APP_URL = (Deno.env.get("PROJ_OS_APP_URL") ?? "").replace(/\/$/, "");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (request) => {
  if (request.method !== "POST") return errorResponse("VALIDATION_FAILED", "Method not allowed.", 405);
  if (request.headers.has("origin")) return errorResponse("PERMISSION_DENIED", "This endpoint is server-to-server only.", 403);
  if (!configured()) return errorResponse("RUNTIME_UNAVAILABLE", "Agent tools are not configured.", 503, true);
  if (hasCallerIdentityHeaders(request.headers)) {
    return errorResponse("VALIDATION_FAILED", "Caller identity headers are not accepted.", 400);
  }

  const bearer = bearerToken(request.headers.get("authorization"));
  if (!bearer) return errorResponse("AUTHENTICATION_REQUIRED", "A signed agent session is required.", 401);

  let claims: AgentSessionClaims;
  try {
    claims = await verifyAgentSession(bearer, publicKeyRing(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
  } catch (error) {
    const code = error instanceof AgentContractError ? error.code : "INVALID_SESSION";
    return errorResponse(code, code === "SESSION_EXPIRED" ? "The agent session has expired." : "The agent session is invalid.", 403);
  }

  let toolRequest: ToolRequest;
  try {
    toolRequest = parseToolRequest(await request.json());
  } catch (error) {
    if (error instanceof AgentContractError) {
      await auditDenied(claims, null, error.code);
      return errorResponse(error.code, error.message, error.status, false, crypto.randomUUID());
    }
    return errorResponse("VALIDATION_FAILED", "The tool request is invalid.", 400);
  }

  const startedAt = Date.now();
  const argumentsDigest = await sha256Hex(JSON.stringify(toolRequest.arguments));
  try {
    const { data: duplicate } = await admin.from("agent_tool_runs")
      .select("id")
      .eq("session_id", claims.sessionId)
      .eq("tool_call_id", toolRequest.toolCallId)
      .maybeSingle();
    if (duplicate) throw new ToolError("VALIDATION_FAILED", "That tool call ID has already been used.", 409);

    await authorize(claims, toolRequest.name);

    let query = admin.from("project_action_items")
      .select("id, title, description, status, priority, assigned_to, due_date, completed_at, updated_at")
      .eq("project_id", claims.projectId)
      .order("created_at", { ascending: false })
      .limit(toolRequest.arguments.limit);
    if (toolRequest.arguments.status?.length) query = query.in("status", toolRequest.arguments.status);
    const { data, error } = await query;
    if (error) throw error;
    const items = data ?? [];
    const completedAt = new Date();
    const sourceUrl = `${PROJ_OS_APP_URL}/projects/${encodeURIComponent(claims.projectId)}`;
    const sources = items.map((item) => ({
      recordId: item.id,
      recordType: "project_action_item",
      label: item.title,
      url: `${sourceUrl}#task-${encodeURIComponent(item.id)}`,
      retrievedAt: completedAt.toISOString(),
    }));

    const { error: auditError } = await admin.from("agent_tool_runs").insert({
      tenant_id: claims.workspaceId,
      user_id: claims.userId,
      project_id: claims.projectId,
      agent_profile_id: claims.agentProfileId,
      session_id: claims.sessionId,
      tool_call_id: toolRequest.toolCallId,
      tool_name: toolRequest.name,
      arguments_digest: argumentsDigest,
      correlation_id: toolRequest.correlationId,
      permission_decision: "allowed",
      result_status: "succeeded",
      record_count: items.length,
      source_record_ids: items.map((item) => item.id),
      requested_at: new Date(startedAt).toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: Math.max(0, Date.now() - startedAt),
    });
    if (auditError) throw new ToolError("INTERNAL_ERROR", "The tool result could not be audited.", 500);

    return json({
      contractVersion: AGENT_CONTRACT_VERSION,
      toolCallId: toolRequest.toolCallId,
      status: "succeeded",
      output: { items },
      sources,
      completedAt: completedAt.toISOString(),
      correlationId: toolRequest.correlationId,
    }, 200);
  } catch (error) {
    const toolError = error instanceof ToolError
      ? error
      : new ToolError("INTERNAL_ERROR", "Proj OS could not complete the tool request.", 500, true);
    await auditDenied(claims, toolRequest, toolError.code, argumentsDigest, startedAt);
    if (!(error instanceof ToolError)) console.error("[agent-tools]", error instanceof Error ? error.message : "unknown error");
    return errorResponse(toolError.code, toolError.message, toolError.status, toolError.retryable, toolRequest.correlationId);
  }
});

class ToolError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly retryable = false) { super(message); }
}

async function authorize(claims: AgentSessionClaims, toolName: string) {
  if (claims.aud !== SESSION_AUDIENCE || !claims.tools.includes(toolName) || !claims.scopes.includes("project:read")) {
    throw new ToolError("TOOL_NOT_ALLOWED", "That tool is not enabled for this session.", 403);
  }
  const [sessionResult, profileResult, entitlementResult, access, permission, user] = await Promise.all([
    admin.from("agent_sessions").select("id")
      .eq("id", claims.sessionId).eq("tenant_id", claims.workspaceId).eq("user_id", claims.userId)
      .eq("project_id", claims.projectId).eq("agent_profile_id", claims.agentProfileId)
      .eq("token_jti", claims.jti).eq("status", "active").gt("expires_at", new Date().toISOString()).maybeSingle(),
    admin.from("agent_profiles").select("id").eq("id", claims.agentProfileId).eq("status", "active").maybeSingle(),
    admin.from("agent_entitlements").select("allowed_tools, allowed_scopes").eq("tenant_id", claims.workspaceId)
      .eq("user_id", claims.userId).eq("project_id", claims.projectId).eq("runtime_kind", AGENT_RUNTIME_KIND)
      .eq("status", "enabled").maybeSingle(),
    admin.rpc("can_access_project", { _user_id: claims.userId, _project_id: claims.projectId }),
    admin.rpc("effective_project_permission", {
      _user_id: claims.userId, _project_id: claims.projectId, _module: "workflows", _action: "view",
    }),
    admin.from("profiles").select("workspace_id, status").eq("user_id", claims.userId).maybeSingle(),
  ]);
  if (sessionResult.error || profileResult.error || entitlementResult.error || user.error || access.error || permission.error) {
    throw new ToolError("INTERNAL_ERROR", "Proj OS could not check current access.", 500, true);
  }
  const session = sessionResult.data;
  const profile = profileResult.data;
  const entitlement = entitlementResult.data;
  if (!session) throw new ToolError("SESSION_REVOKED", "The agent session is no longer active.", 403);
  if (!profile) throw new ToolError("PROFILE_MISMATCH", "The Agent profile is no longer active.", 403);
  if (!user.data || user.data.workspace_id !== claims.workspaceId || (user.data.status && user.data.status !== "active")) {
    throw new ToolError("PERMISSION_DENIED", "The user is no longer active.", 403);
  }
  if (!access.data || !permission.data) throw new ToolError("PERMISSION_DENIED", "That project is not available.", 404);
  if (!entitlement || !entitlement.allowed_tools?.includes(toolName) || !entitlement.allowed_scopes?.includes("project:read")) {
    throw new ToolError("TOOL_NOT_ALLOWED", "The Agent entitlement no longer permits that tool.", 403);
  }
}

async function auditDenied(
  claims: AgentSessionClaims,
  request: ToolRequest | null,
  code: string,
  digest?: string,
  startedAt = Date.now(),
) {
  if (!request) return;
  const completedAt = new Date();
  const { error } = await admin.from("agent_tool_runs").insert({
    tenant_id: claims.workspaceId,
    user_id: claims.userId,
    project_id: claims.projectId,
    agent_profile_id: claims.agentProfileId,
    session_id: claims.sessionId,
    tool_call_id: request.toolCallId,
    tool_name: request.name,
    arguments_digest: digest ?? await sha256Hex(JSON.stringify(request.arguments)),
    correlation_id: request.correlationId,
    permission_decision: "denied",
    result_status: "denied",
    denial_code: code,
    requested_at: new Date(startedAt).toISOString(),
    completed_at: completedAt.toISOString(),
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
  if (error) console.error("[agent-tools] denial audit failed", error.code ?? "unknown");
}

function configured() {
  try {
    new URL(SESSION_ISSUER);
    new URL(PROJ_OS_APP_URL);
    const ring = publicKeyRing();
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SESSION_KEY_ID && ring.some((jwk) => jwk.kid === SESSION_KEY_ID));
  } catch { return false; }
}

function publicKeyRing(): Array<JsonWebKey & { kid?: string }> {
  if (SESSION_PUBLIC_JWKS) return parseAgentPublicKeyRing(SESSION_PUBLIC_JWKS);
  const legacy = JSON.parse(SESSION_PUBLIC_JWK) as JsonWebKey & { kid?: string };
  return parseAgentPublicKeyRing(JSON.stringify({ keys: [{ ...legacy, kid: legacy.kid ?? SESSION_KEY_ID }] }));
}

function bearerToken(value: string | null) { return value?.startsWith("Bearer ") ? value.slice(7) : ""; }
function hasCallerIdentityHeaders(headers: Headers) {
  return ["x-workspace-id", "x-tenant-id", "x-user-id", "x-project-id", "x-agent-profile-id", "x-profile-id"]
    .some((name) => headers.has(name));
}

function errorResponse(code: string, message: string, status: number, retryable = false, correlationId: string = crypto.randomUUID()) {
  return json({ code, message, retryable, correlationId }, status);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}
