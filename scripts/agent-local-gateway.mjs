/**
 * Development-only Proj OS Agent Gateway.
 *
 * This process exists so the local UI can exercise the real browser ->
 * session gateway -> runtime -> tool gateway boundary without a Supabase
 * stack or production credentials. It binds to loopback, uses synthetic
 * records, keeps only in-memory audit metadata, and must never be deployed.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const LOCAL_AGENT_CONTRACT_VERSION = "2026-09-01";
export const LOCAL_AGENT_PROJECT_ID = "10000000-0000-4000-8000-000000000003";
const LOCAL_WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const LOCAL_USER_ID = "10000000-0000-4000-8000-000000000002";
const LOCAL_PROFILE_ID = "10000000-0000-4000-8000-000000000004";
const LOCAL_ISSUER = "https://proj-os.local";
const LOCAL_AUDIENCE = "proj-os-agent-runtime";
const LOCAL_TOOL = "project.tasks.list";
const DEFAULT_SECRET = "local-reference-only-change-before-shared-use";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_STATUSES = new Set(["todo", "in_progress", "in_review", "done", "cancelled"]);
const IDENTITY_KEYS = new Set([
  "workspaceId", "workspace_id", "tenantId", "tenant_id", "userId", "user_id",
  "projectId", "project_id", "agentProfileId", "agent_profile_id", "profileId",
  "profile_id", "sessionId", "session_id",
]);

const syntheticTasks = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    title: "Confirm the electrical rough-in walkthrough",
    description: "Coordinate the walkthrough before the walls are closed.",
    status: "todo",
    priority: "high",
    assigned_to: null,
    due_date: "2026-09-04",
    completed_at: null,
    updated_at: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    title: "Review updated finish schedule",
    description: "Check the latest owner selections against the procurement log.",
    status: "in_progress",
    priority: "medium",
    assigned_to: null,
    due_date: "2026-09-06",
    completed_at: null,
    updated_at: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    title: "Close the pending site-access question",
    description: "Record the agreed delivery access window.",
    status: "in_review",
    priority: "medium",
    assigned_to: null,
    due_date: null,
    completed_at: null,
    updated_at: "2026-09-01T12:00:00.000Z",
  },
];

export function createLocalAgentGateway(options = {}) {
  const secret = options.secret ?? process.env.AGENT_LOCAL_SESSION_SECRET ?? DEFAULT_SECRET;
  const allowedOrigin = options.allowedOrigin ?? process.env.AGENT_LOCAL_ALLOWED_ORIGIN ?? "http://127.0.0.1:8080";
  const appUrl = (options.appUrl ?? process.env.AGENT_LOCAL_APP_URL ?? allowedOrigin).replace(/\/$/, "");
  const sessions = new Map();
  const sessionResponses = new Map();
  const usedToolCalls = new Set();
  const auditLog = [];

  const server = createServer(async (request, response) => {
    const correlationId = validUuid(request.headers["x-correlation-id"]) ? request.headers["x-correlation-id"] : randomUUID();
    try {
      if (request.method === "GET" && request.url === "/health/live") {
        return sendJson(response, 200, { status: "up", mode: "synthetic-local-gateway" });
      }

      if (request.url === "/v1/sessions") {
        if (!applyBrowserCors(request, response, allowedOrigin, correlationId)) return;
        if (request.method === "OPTIONS") return sendEmpty(response, 204);
        if (request.method !== "POST") throw new GatewayError("VALIDATION_FAILED", "Method not allowed.", 405, correlationId);
        rejectIdentityHeaders(request.headers, correlationId);
        const body = strictObject(await readJson(request), ["contractVersion", "projectId", "correlationId", "idempotencyKey"]);
        requireContract(body.contractVersion, correlationId);
        const projectId = requireUuid(body.projectId, "projectId", correlationId);
        const requestCorrelationId = requireUuid(body.correlationId, "correlationId", correlationId);
        const idempotencyKey = requireString(body.idempotencyKey, "idempotencyKey", 16, 200, requestCorrelationId);
        if (projectId !== LOCAL_AGENT_PROJECT_ID) {
          throw new GatewayError("PERMISSION_DENIED", "That project is not enabled in the local pilot.", 403, requestCorrelationId);
        }

        const keyHash = sha256(idempotencyKey);
        const previous = sessionResponses.get(keyHash);
        if (previous) return sendJson(response, 200, previous, allowedOrigin);

        const issuedAt = Math.floor(Date.now() / 1000);
        const sessionId = randomUUID();
        const claims = {
          contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
          iss: LOCAL_ISSUER,
          aud: LOCAL_AUDIENCE,
          sub: LOCAL_USER_ID,
          workspaceId: LOCAL_WORKSPACE_ID,
          userId: LOCAL_USER_ID,
          projectId,
          agentProfileId: LOCAL_PROFILE_ID,
          sessionId,
          scopes: ["project:read"],
          tools: [LOCAL_TOOL],
          iat: issuedAt,
          exp: issuedAt + 300,
          jti: randomUUID(),
        };
        sessions.set(sessionId, claims);
        const result = {
          contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
          sessionToken: signJwt(claims, secret),
          expiresAt: new Date(claims.exp * 1000).toISOString(),
          projectId,
          agentProfile: { id: LOCAL_PROFILE_ID, displayName: "Local project agent" },
          permissionMode: "read_only",
          allowedTools: [LOCAL_TOOL],
          correlationId: requestCorrelationId,
        };
        sessionResponses.set(keyHash, result);
        return sendJson(response, 201, result, allowedOrigin);
      }

      if (request.url === "/v1/tools") {
        if (request.headers.origin) throw new GatewayError("PERMISSION_DENIED", "Tool access is server-to-server only.", 403, correlationId);
        if (request.method !== "POST") throw new GatewayError("VALIDATION_FAILED", "Method not allowed.", 405, correlationId);
        rejectIdentityHeaders(request.headers, correlationId);
        const claims = verifyJwt(bearerToken(request.headers.authorization), secret, sessions, correlationId);
        const raw = strictObject(await readJson(request), ["contractVersion", "toolCallId", "name", "arguments", "correlationId"]);
        requireContract(raw.contractVersion, correlationId);
        const toolCorrelationId = requireUuid(raw.correlationId, "correlationId", correlationId);
        const toolCallId = requireUuid(raw.toolCallId, "toolCallId", toolCorrelationId);
        if (raw.name !== LOCAL_TOOL || !claims.tools.includes(LOCAL_TOOL) || !claims.scopes.includes("project:read")) {
          throw new GatewayError("TOOL_NOT_ALLOWED", "That tool is not enabled for this session.", 403, toolCorrelationId);
        }
        assertNoIdentityOverrides(raw.arguments, "arguments", toolCorrelationId);
        const args = strictObject(raw.arguments, ["status", "limit"]);
        const statuses = args.status === undefined
          ? undefined
          : (Array.isArray(args.status) ? args.status : [args.status]).map(String);
        if (statuses?.some((status) => !TASK_STATUSES.has(status))) {
          throw new GatewayError("VALIDATION_FAILED", "Invalid task status filter.", 400, toolCorrelationId);
        }
        const limit = args.limit === undefined ? 50 : Number(args.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new GatewayError("VALIDATION_FAILED", "limit must be an integer from 1 to 100.", 400, toolCorrelationId);
        }

        const uniqueCall = `${claims.sessionId}:${toolCallId}`;
        if (usedToolCalls.has(uniqueCall)) {
          throw new GatewayError("VALIDATION_FAILED", "That tool call ID has already been used.", 409, toolCorrelationId);
        }
        usedToolCalls.add(uniqueCall);

        const startedAt = Date.now();
        const items = syntheticTasks.filter((task) => !statuses || statuses.includes(task.status)).slice(0, limit);
        const completedAt = new Date();
        auditLog.push(Object.freeze({
          workspaceId: claims.workspaceId,
          userId: claims.userId,
          projectId: claims.projectId,
          agentProfileId: claims.agentProfileId,
          sessionId: claims.sessionId,
          toolCallId,
          toolName: LOCAL_TOOL,
          argumentsDigest: sha256(JSON.stringify({ ...(statuses ? { status: statuses } : {}), limit })),
          correlationId: toolCorrelationId,
          permissionDecision: "allowed",
          resultStatus: "succeeded",
          recordCount: items.length,
          sourceRecordIds: items.map((item) => item.id),
          durationMs: Math.max(0, Date.now() - startedAt),
        }));

        const sources = items.map((item) => ({
          recordId: item.id,
          recordType: "project_action_item",
          label: item.title,
          url: `${appUrl}/agent-foundation-preview#task-${item.id}`,
          retrievedAt: completedAt.toISOString(),
        }));
        return sendJson(response, 200, {
          contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
          toolCallId,
          status: "succeeded",
          output: { items, authoritative: false, environment: "synthetic_local_gateway" },
          sources,
          completedAt: completedAt.toISOString(),
          correlationId: toolCorrelationId,
        });
      }

      throw new GatewayError("VALIDATION_FAILED", "Route not found.", 404, correlationId);
    } catch (error) {
      const gatewayError = error instanceof GatewayError
        ? error
        : new GatewayError("INTERNAL_ERROR", "The local Agent gateway could not complete the request.", 500, correlationId, true);
      if (!(error instanceof GatewayError)) console.error("[agent-local-gateway]", error);
      return sendJson(response, gatewayError.status, {
        code: gatewayError.code,
        message: gatewayError.message,
        retryable: gatewayError.retryable,
        correlationId: gatewayError.correlationId,
      }, request.url === "/v1/sessions" ? allowedOrigin : undefined);
    }
  });

  return { server, getAuditLog: () => auditLog.map((entry) => ({ ...entry })) };
}

class GatewayError extends Error {
  constructor(code, message, status, correlationId, retryable = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
    this.retryable = retryable;
  }
}

function applyBrowserCors(request, response, allowedOrigin, correlationId) {
  const origin = request.headers.origin;
  if (origin && origin !== allowedOrigin) {
    sendJson(response, 403, { code: "PERMISSION_DENIED", message: "Origin is not allowed.", retryable: false, correlationId });
    return false;
  }
  if (origin) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("access-control-allow-methods", "POST, OPTIONS");
    response.setHeader("access-control-allow-headers", "content-type, x-correlation-id");
    response.setHeader("access-control-max-age", "600");
    response.setHeader("vary", "Origin");
  }
  return true;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new GatewayError("VALIDATION_FAILED", "Request body is too large.", 413, randomUUID());
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new GatewayError("VALIDATION_FAILED", "Request body must be valid JSON.", 400, randomUUID()); }
}

function strictObject(value, allowedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GatewayError("VALIDATION_FAILED", "Expected a JSON object.", 400, randomUUID());
  }
  const unknown = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknown) throw new GatewayError("VALIDATION_FAILED", `Unknown field: ${unknown}.`, 400, randomUUID());
  return value;
}

function rejectIdentityHeaders(headers, correlationId) {
  const supplied = ["x-workspace-id", "x-tenant-id", "x-user-id", "x-project-id", "x-agent-profile-id", "x-profile-id"]
    .find((name) => headers[name] !== undefined);
  if (supplied) throw new GatewayError("VALIDATION_FAILED", "Caller identity headers are not accepted.", 400, correlationId);
}

function assertNoIdentityOverrides(value, path, correlationId) {
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoIdentityOverrides(entry, `${path}[${index}]`, correlationId));
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (IDENTITY_KEYS.has(key)) {
      throw new GatewayError("PROJECT_MISMATCH", `Identity scope cannot appear in tool arguments (${path}.${key}).`, 403, correlationId);
    }
    assertNoIdentityOverrides(entry, `${path}.${key}`, correlationId);
  }
}

function requireContract(value, correlationId) {
  if (value !== LOCAL_AGENT_CONTRACT_VERSION) throw new GatewayError("VALIDATION_FAILED", "Unsupported contract version.", 400, correlationId);
}

function requireUuid(value, field, correlationId) {
  if (!validUuid(value)) throw new GatewayError("VALIDATION_FAILED", `${field} must be a UUID.`, 400, correlationId);
  return value;
}

function requireString(value, field, min, max, correlationId) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new GatewayError("VALIDATION_FAILED", `${field} has an invalid length.`, 400, correlationId);
  }
  return value.trim();
}

function validUuid(value) { return typeof value === "string" && UUID.test(value); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function encode(value) { return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url"); }
function signJwt(claims, secret) {
  const value = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}`;
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64url")}`;
}

function verifyJwt(token, secret, sessions, correlationId) {
  if (!token) throw new GatewayError("AUTHENTICATION_REQUIRED", "A signed Agent session is required.", 401, correlationId);
  const [headerPart, payloadPart, signaturePart, extra] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart || extra) throw new GatewayError("INVALID_SESSION", "The Agent session is invalid.", 403, correlationId);
  const signed = `${headerPart}.${payloadPart}`;
  const actual = Buffer.from(signaturePart, "base64url");
  const expected = createHmac("sha256", secret).update(signed).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new GatewayError("INVALID_SESSION", "The Agent session is invalid.", 403, correlationId);
  }
  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    throw new GatewayError("INVALID_SESSION", "The Agent session is invalid.", 403, correlationId);
  }
  const active = sessions.get(claims.sessionId);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "HS256" || header.typ !== "JWT" || claims.iss !== LOCAL_ISSUER || claims.aud !== LOCAL_AUDIENCE
    || claims.sub !== claims.userId || claims.exp <= now || claims.iat > now + 30 || claims.exp - claims.iat > 600
    || !active || active.jti !== claims.jti || active.projectId !== claims.projectId) {
    throw new GatewayError(claims.exp <= now ? "SESSION_EXPIRED" : "INVALID_SESSION", "The Agent session is invalid.", 403, correlationId);
  }
  return claims;
}

function bearerToken(value) { return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7) : ""; }
function sendEmpty(response, status) { response.writeHead(status); response.end(); }
function sendJson(response, status, body, origin) {
  const headers = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.AGENT_LOCAL_GATEWAY_PORT ?? "8788", 10);
  const { server } = createLocalAgentGateway();
  server.listen(port, "127.0.0.1", () => {
    console.log(`[agent-local-gateway] synthetic development gateway listening on http://127.0.0.1:${port}`);
  });
}
