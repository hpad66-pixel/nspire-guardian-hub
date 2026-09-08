import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const AGENT_CONTRACT_VERSION = "2026-09-01" as const;
export const AGENT_RUNTIME_URL = String(import.meta.env.VITE_AGENT_RUNTIME_URL ?? "").replace(/\/$/, "");
export const AGENT_FOUNDATION_ENABLED = import.meta.env.VITE_AGENT_FOUNDATION_ENABLED === "true";
export const AGENT_LOCAL_SESSION_URL = import.meta.env.DEV
  ? String(import.meta.env.VITE_AGENT_LOCAL_SESSION_URL ?? "").replace(/\/$/, "")
  : "";

const correlationId = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const id = z.string().trim().min(1).max(128);

const sourceSchema = z.object({
  recordId: id,
  recordType: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(160),
  url: z.string().url(),
  retrievedAt: timestamp,
}).strict();

const errorCodeSchema = z.enum([
  "AUTHENTICATION_REQUIRED", "INVALID_SESSION", "SESSION_EXPIRED", "SESSION_REVOKED",
  "PERMISSION_DENIED", "PROJECT_MISMATCH", "PROFILE_MISMATCH", "TOOL_NOT_ALLOWED",
  "APPROVAL_REQUIRED", "APPROVAL_EXPIRED", "APPROVAL_INVALID", "RATE_LIMITED",
  "RUNTIME_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "VALIDATION_FAILED", "REQUEST_CANCELLED",
  "REQUEST_TIMED_OUT", "INTERNAL_ERROR",
]);

const runtimeErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().trim().min(1),
  retryable: z.boolean(),
  correlationId,
  details: z.record(z.unknown()).optional(),
}).strict();

const eventBase = z.object({
  contractVersion: z.literal(AGENT_CONTRACT_VERSION),
  eventId: z.string().uuid(),
  runId: id,
  conversationId: id,
  correlationId,
  sequence: z.number().int().nonnegative(),
  occurredAt: timestamp,
});

const toolRequestSchema = z.object({
  toolCallId: id,
  name: z.string().trim().min(1).max(100),
  arguments: z.record(z.unknown()),
  correlationId,
  requestedAt: timestamp,
}).strict();

const toolResultSchema = z.object({
  toolCallId: id,
  status: z.enum(["succeeded", "denied", "failed", "timed_out"]),
  output: z.unknown().optional(),
  sources: z.array(sourceSchema),
  completedAt: timestamp,
}).strict();

const memorySchema = z.object({
  memoryId: id,
  scope: z.enum(["personal_project", "project_working"]),
  category: z.enum(["preference", "summary", "glossary", "open_question", "working_context"]),
  sourceKind: z.enum(["user_explicit", "proj_os_record", "model_summary"]),
  sourceRecordId: id.optional(),
  state: z.enum(["active", "stale", "archived", "pending_consent"]),
  confidence: z.number().min(0).max(1),
  createdBy: z.enum(["user", "runtime", "proj_os"]),
  createdAt: timestamp,
  retentionUntil: timestamp.nullable(),
}).strict();

export const agentStreamEventSchema = z.discriminatedUnion("type", [
  eventBase.extend({ type: z.literal("run.started") }).strict(),
  eventBase.extend({ type: z.literal("message.delta"), delta: z.string() }).strict(),
  eventBase.extend({ type: z.literal("message.completed"), content: z.string(), sources: z.array(sourceSchema) }).strict(),
  eventBase.extend({ type: z.literal("tool.requested"), request: toolRequestSchema }).strict(),
  eventBase.extend({
    type: z.literal("tool.approval_required"),
    preview: z.object({
      approvalRequestId: id,
      toolCallId: id,
      toolName: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      actionHash: z.string().regex(/^[a-f0-9]{64}$/),
      expiresAt: timestamp,
      materialFields: z.record(z.unknown()),
    }).strict(),
  }).strict(),
  eventBase.extend({ type: z.literal("tool.result"), result: toolResultSchema }).strict(),
  eventBase.extend({ type: z.literal("memory.provenance"), memories: z.array(memorySchema) }).strict(),
  eventBase.extend({
    type: z.literal("usage"),
    usage: z.object({
      provider: z.string().trim().min(1),
      model: z.string().trim().min(1),
      inputUnits: z.number().int().nonnegative(),
      outputUnits: z.number().int().nonnegative(),
      estimatedCostUsd: z.number().nonnegative().nullable(),
      latencyMs: z.number().int().nonnegative(),
    }).strict(),
  }).strict(),
  eventBase.extend({ type: z.literal("error"), error: runtimeErrorSchema }).strict(),
  eventBase.extend({ type: z.literal("run.cancelled"), reason: z.string() }).strict(),
  eventBase.extend({ type: z.literal("run.completed"), status: z.enum(["succeeded", "failed"]) }).strict(),
]);

const sessionResponseSchema = z.object({
  contractVersion: z.literal(AGENT_CONTRACT_VERSION),
  sessionToken: z.string().min(64),
  expiresAt: timestamp,
  projectId: z.string().uuid(),
  agentProfile: z.object({ id: z.string().uuid(), displayName: z.string().trim().min(1) }).strict(),
  permissionMode: z.literal("read_only"),
  allowedTools: z.array(z.string()),
  correlationId,
}).strict();

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;
export type AgentSource = z.infer<typeof sourceSchema>;
export type AgentRuntimeError = z.infer<typeof runtimeErrorSchema>;
export type AgentSession = z.infer<typeof sessionResponseSchema>;

export type InvokeAgentSession = (body: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export function createHttpSessionInvoker(endpoint: string, request: typeof fetch = fetch): InvokeAgentSession {
  return async (body) => {
    try {
      const response = await request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "The local Proj OS Agent gateway could not create a session.";
        return { data: null, error: { message } };
      }
      return { data: payload, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
}

const defaultSessionInvoker: InvokeAgentSession = AGENT_LOCAL_SESSION_URL
  ? createHttpSessionInvoker(AGENT_LOCAL_SESSION_URL)
  : async (body) => supabase.functions.invoke("agent-session", { body });

export async function issueAgentSession(
  projectId: string,
  invoke: InvokeAgentSession = defaultSessionInvoker,
): Promise<AgentSession> {
  const body = {
    contractVersion: AGENT_CONTRACT_VERSION,
    projectId,
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
  };
  const { data, error } = await invoke(body);
  if (error) throw new AgentClientError("RUNTIME_UNAVAILABLE", readableFunctionError(error), true, body.correlationId);
  const parsed = sessionResponseSchema.safeParse(data);
  if (!parsed.success || parsed.data.projectId !== projectId) {
    throw new AgentClientError("PROJECT_MISMATCH", "Proj OS returned an invalid Agent session.", false, body.correlationId);
  }
  return parsed.data;
}

export async function streamAgentMessage(options: {
  runtimeUrl: string;
  sessionToken: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  content: string;
  signal: AbortSignal;
  onRunId?: (runId: string) => void;
  onEvent: (event: AgentStreamEvent) => void;
  request?: typeof fetch;
}): Promise<void> {
  if (!options.runtimeUrl) {
    throw new AgentClientError("RUNTIME_UNAVAILABLE", "The Agent runtime is not configured in this environment.", true, options.correlationId);
  }
  const request = options.request ?? fetch;
  const response = await request(`${options.runtimeUrl}/v1/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.sessionToken}`,
      "content-type": "application/json",
      "x-correlation-id": options.correlationId,
    },
    body: JSON.stringify({
      contractVersion: AGENT_CONTRACT_VERSION,
      conversationId: options.conversationId,
      messageId: options.messageId,
      correlationId: options.correlationId,
      content: options.content,
    }),
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: options.signal,
  });

  const runId = response.headers.get("x-run-id");
  if (runId) options.onRunId?.(runId);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const parsed = runtimeErrorSchema.safeParse(payload);
    if (parsed.success) throw AgentClientError.fromRuntime(parsed.data, response.status);
    throw new AgentClientError("RUNTIME_UNAVAILABLE", "The Agent runtime could not be reached.", response.status >= 500, options.correlationId);
  }
  if (!response.body) throw new AgentClientError("RUNTIME_UNAVAILABLE", "The Agent response stream was empty.", true, options.correlationId);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    if (buffer.length > 512_000) throw new AgentClientError("VALIDATION_FAILED", "The Agent response was too large.", false, options.correlationId);
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) parseEventLine(line, options.onEvent, options.correlationId);
    if (done) break;
  }
  parseEventLine(buffer, options.onEvent, options.correlationId);
}

export async function cancelAgentRun(options: {
  runtimeUrl: string;
  sessionToken: string;
  runId: string;
  correlationId: string;
  request?: typeof fetch;
}): Promise<void> {
  if (!options.runtimeUrl) return;
  await (options.request ?? fetch)(`${options.runtimeUrl}/v1/cancellations`, {
    method: "POST",
    headers: { authorization: `Bearer ${options.sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      contractVersion: AGENT_CONTRACT_VERSION,
      runId: options.runId,
      correlationId: options.correlationId,
      reason: "Cancelled by the user.",
    }),
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  }).catch(() => undefined);
}

export class AgentClientError extends Error {
  constructor(
    readonly code: z.infer<typeof errorCodeSchema>,
    message: string,
    readonly retryable: boolean,
    readonly correlationId: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AgentClientError";
  }

  static fromRuntime(error: AgentRuntimeError, status?: number) {
    return new AgentClientError(error.code, error.message, error.retryable, error.correlationId, status);
  }
}

function parseEventLine(line: string, onEvent: (event: AgentStreamEvent) => void, requestCorrelationId: string) {
  if (!line.trim()) return;
  let value: unknown;
  try { value = JSON.parse(line); }
  catch { throw new AgentClientError("VALIDATION_FAILED", "The Agent returned an unreadable stream event.", false, requestCorrelationId); }
  const event = agentStreamEventSchema.safeParse(value);
  if (!event.success || event.data.correlationId !== requestCorrelationId) {
    throw new AgentClientError("PROJECT_MISMATCH", "The Agent returned an event for a different request.", false, requestCorrelationId);
  }
  onEvent(event.data);
}

function readableFunctionError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Proj OS could not start the Agent session.";
}
