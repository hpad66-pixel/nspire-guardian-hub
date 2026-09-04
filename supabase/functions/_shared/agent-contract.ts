export const AGENT_CONTRACT_VERSION = "2026-09-01" as const;
export const AGENT_RUNTIME_KIND = "hermes" as const;
export const AGENT_RUNTIME_AUDIENCE = "proj-os-agent-runtime" as const;
export const AGENT_SESSION_MAX_SECONDS = 600;
export const PROJECT_TASKS_TOOL = "project.tasks.list" as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const TASK_STATUSES = new Set(["todo", "in_progress", "in_review", "done", "cancelled"]);

const RESERVED_IDENTITY_KEYS = new Set([
  "workspaceId", "workspace_id", "tenantId", "tenant_id", "userId", "user_id",
  "projectId", "project_id", "agentProfileId", "agent_profile_id", "profileId",
  "profile_id", "sessionId", "session_id",
]);

export class AgentContractError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AgentContractError";
  }
}

export interface SessionRequest {
  contractVersion: typeof AGENT_CONTRACT_VERSION;
  projectId: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface ToolRequest {
  contractVersion: typeof AGENT_CONTRACT_VERSION;
  toolCallId: string;
  name: typeof PROJECT_TASKS_TOOL;
  arguments: { status?: string[]; limit: number };
  correlationId: string;
}

export interface AgentSessionClaims {
  contractVersion: typeof AGENT_CONTRACT_VERSION;
  iss: string;
  aud: string;
  sub: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  agentProfileId: string;
  sessionId: string;
  scopes: string[];
  tools: string[];
  iat: number;
  exp: number;
  jti: string;
}

export function parseSessionRequest(value: unknown): SessionRequest {
  const body = strictObject(value, ["contractVersion", "projectId", "correlationId", "idempotencyKey"]);
  if (body.contractVersion !== AGENT_CONTRACT_VERSION) fail("VALIDATION_FAILED", "Unsupported contract version.");
  const projectId = requireUuid(body.projectId, "projectId");
  const correlationId = requireUuid(body.correlationId, "correlationId");
  const idempotencyKey = requireString(body.idempotencyKey, "idempotencyKey", 16, 200);
  return { contractVersion: AGENT_CONTRACT_VERSION, projectId, correlationId, idempotencyKey };
}

export function parseToolRequest(value: unknown): ToolRequest {
  const body = strictObject(value, ["contractVersion", "toolCallId", "name", "arguments", "correlationId"]);
  if (body.contractVersion !== AGENT_CONTRACT_VERSION) fail("VALIDATION_FAILED", "Unsupported contract version.");
  if (body.name !== PROJECT_TASKS_TOOL) fail("TOOL_NOT_ALLOWED", "That tool is not enabled.", 403);
  const args = strictObject(body.arguments, ["status", "limit"]);
  assertNoIdentityOverrides(args);

  const statuses = args.status === undefined
    ? undefined
    : (Array.isArray(args.status) ? args.status : [args.status]).map((status) => String(status));
  if (statuses?.some((status) => !TASK_STATUSES.has(status))) {
    fail("VALIDATION_FAILED", "Invalid task status filter.");
  }
  const numericLimit = args.limit === undefined ? 50 : Number(args.limit);
  if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 100) {
    fail("VALIDATION_FAILED", "limit must be an integer from 1 to 100.");
  }

  return {
    contractVersion: AGENT_CONTRACT_VERSION,
    toolCallId: requireUuid(body.toolCallId, "toolCallId"),
    name: PROJECT_TASKS_TOOL,
    arguments: { ...(statuses ? { status: statuses } : {}), limit: numericLimit },
    correlationId: requireUuid(body.correlationId, "correlationId"),
  };
}

export function validateAgentSessionClaims(
  value: unknown,
  expected: { issuer: string; audience: string; nowSeconds?: number },
): AgentSessionClaims {
  const claims = strictObject(value, [
    "contractVersion", "iss", "aud", "sub", "workspaceId", "userId", "projectId",
    "agentProfileId", "sessionId", "scopes", "tools", "iat", "exp", "jti",
  ]);
  if (claims.contractVersion !== AGENT_CONTRACT_VERSION) fail("INVALID_SESSION", "Unsupported session contract.", 403);
  if (claims.iss !== expected.issuer || claims.aud !== expected.audience) fail("INVALID_SESSION", "Session issuer or audience is invalid.", 403);
  const now = expected.nowSeconds ?? Math.floor(Date.now() / 1000);
  const iat = Number(claims.iat);
  const exp = Number(claims.exp);
  if (!Number.isInteger(iat) || !Number.isInteger(exp) || exp <= iat || exp - iat > AGENT_SESSION_MAX_SECONDS) {
    fail("INVALID_SESSION", "Session lifetime is invalid.", 403);
  }
  if (iat > now + 30) fail("INVALID_SESSION", "Session issue time is invalid.", 403);
  if (exp <= now) fail("SESSION_EXPIRED", "The agent session has expired.", 403);

  const userId = requireUuid(claims.userId, "userId");
  const sub = requireUuid(claims.sub, "sub");
  if (sub !== userId) fail("INVALID_SESSION", "Session subject does not match its user.", 403);
  const scopes = requireStringArray(claims.scopes, "scopes", 64);
  const tools = requireStringArray(claims.tools, "tools", 64);

  return {
    contractVersion: AGENT_CONTRACT_VERSION,
    iss: requireString(claims.iss, "iss", 1, 500),
    aud: requireString(claims.aud, "aud", 1, 200),
    sub,
    workspaceId: requireUuid(claims.workspaceId, "workspaceId"),
    userId,
    projectId: requireUuid(claims.projectId, "projectId"),
    agentProfileId: requireUuid(claims.agentProfileId, "agentProfileId"),
    sessionId: requireUuid(claims.sessionId, "sessionId"),
    scopes,
    tools,
    iat,
    exp,
    jti: requireUuid(claims.jti, "jti"),
  };
}

export function assertNoIdentityOverrides(value: unknown, path = "arguments"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoIdentityOverrides(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (RESERVED_IDENTITY_KEYS.has(key)) {
      fail("PROJECT_MISMATCH", `Identity scope cannot appear in tool arguments (${path}.${key}).`, 403);
    }
    assertNoIdentityOverrides(entry, `${path}.${key}`);
  }
}

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function strictObject(value: unknown, allowedKeys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("VALIDATION_FAILED", "Expected a JSON object.");
  const object = value as Record<string, unknown>;
  const unknownKey = Object.keys(object).find((key) => !allowedKeys.includes(key));
  if (unknownKey) fail("VALIDATION_FAILED", `Unknown field: ${unknownKey}.`);
  return object;
}

function requireUuid(value: unknown, field: string): string {
  const text = String(value ?? "");
  if (!UUID.test(text)) fail("VALIDATION_FAILED", `${field} must be a UUID.`);
  return text;
}

function requireString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") fail("VALIDATION_FAILED", `${field} must be a string.`);
  const text = value.trim();
  if (text.length < min || text.length > max) fail("VALIDATION_FAILED", `${field} has an invalid length.`);
  return text;
}

function requireStringArray(value: unknown, field: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== "string" || !item)) {
    fail("INVALID_SESSION", `${field} is invalid.`, 403);
  }
  return [...value] as string[];
}

function fail(code: string, message: string, status = 400): never {
  throw new AgentContractError(code, message, status);
}
