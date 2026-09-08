import { describe, expect, it, vi } from "vitest";
import {
  AGENT_CONTRACT_VERSION,
  createHttpSessionInvoker,
  issueAgentSession,
  streamAgentMessage,
} from "../runtime";

const projectId = "10000000-0000-4000-8000-000000000003";
const profileId = "10000000-0000-4000-8000-000000000004";
const correlationId = "10000000-0000-4000-8000-000000000007";

describe("Agent browser client", () => {
  it("posts the scope-free session envelope to the development gateway", async () => {
    let sent: Record<string, unknown> | undefined;
    const request: typeof fetch = async (_input, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const invoke = createHttpSessionInvoker("http://127.0.0.1:8788/v1/sessions", request);
    await invoke({
      contractVersion: AGENT_CONTRACT_VERSION,
      projectId,
      correlationId,
      idempotencyKey: "local-idempotency-key",
    });
    expect(sent).toEqual({
      contractVersion: AGENT_CONTRACT_VERSION,
      projectId,
      correlationId,
      idempotencyKey: "local-idempotency-key",
    });
    expect(JSON.stringify(sent)).not.toMatch(/userId|profileId|workspaceId|tenantId|sessionId/i);
  });

  it("requests a session without caller-selected user or profile identity", async () => {
    const invoke = vi.fn(async (body: Record<string, unknown>) => ({
      data: {
        contractVersion: AGENT_CONTRACT_VERSION,
        sessionToken: "signed-session-".padEnd(80, "x"),
        expiresAt: "2026-09-01T12:10:00.000Z",
        projectId,
        agentProfile: { id: profileId, displayName: "Alex · project agent" },
        permissionMode: "read_only",
        allowedTools: ["project.tasks.list"],
        correlationId: body.correlationId,
      },
      error: null,
    }));

    await expect(issueAgentSession(projectId, invoke)).resolves.toMatchObject({ projectId, permissionMode: "read_only" });
    const body = invoke.mock.calls[0]?.[0];
    expect(body).toEqual({
      contractVersion: AGENT_CONTRACT_VERSION,
      projectId,
      correlationId: expect.any(String),
      idempotencyKey: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toMatch(/userId|user_id|profileId|profile_id|workspace|tenant|sessionId/i);
  });

  it("parses validated NDJSON events and keeps correlation bound", async () => {
    const base = {
      contractVersion: AGENT_CONTRACT_VERSION,
      eventId: "10000000-0000-4000-8000-000000000011",
      runId: "run-1",
      conversationId: "conversation-1",
      correlationId,
      sequence: 0,
      occurredAt: "2026-09-01T12:00:00.000Z",
    };
    const lines = [
      { ...base, type: "run.started" },
      { ...base, eventId: "10000000-0000-4000-8000-000000000012", sequence: 1, type: "message.completed", content: "Two open tasks.", sources: [] },
    ].map((event) => JSON.stringify(event)).join("\n") + "\n";
    let sentInit: RequestInit | undefined;
    const request: typeof fetch = async (_input, init) => {
      sentInit = init;
      return new Response(lines, {
        status: 200,
        headers: { "content-type": "application/x-ndjson", "x-run-id": "run-1" },
      });
    };
    const events: string[] = [];
    const onRunId = vi.fn();

    await streamAgentMessage({
      runtimeUrl: "https://agent.example.test",
      sessionToken: "signed-session",
      conversationId: "conversation-1",
      messageId: "message-1",
      correlationId,
      content: "Show my open tasks",
      signal: new AbortController().signal,
      onRunId,
      onEvent: (event) => events.push(event.type),
      request,
    });

    expect(events).toEqual(["run.started", "message.completed"]);
    expect(onRunId).toHaveBeenCalledWith("run-1");
    const sent = JSON.parse(String(sentInit?.body));
    expect(sent).not.toHaveProperty("projectId");
    expect(sent).not.toHaveProperty("userId");
    expect(sent).not.toHaveProperty("agentProfileId");
  });

  it("rejects a stream event for another request", async () => {
    const line = JSON.stringify({
      contractVersion: AGENT_CONTRACT_VERSION,
      eventId: "10000000-0000-4000-8000-000000000011",
      runId: "run-1",
      conversationId: "conversation-1",
      correlationId: "10000000-0000-4000-8000-000000000099",
      sequence: 0,
      occurredAt: "2026-09-01T12:00:00.000Z",
      type: "run.started",
    });
    await expect(streamAgentMessage({
      runtimeUrl: "https://agent.example.test",
      sessionToken: "signed-session",
      conversationId: "conversation-1",
      messageId: "message-1",
      correlationId,
      content: "Show my open tasks",
      signal: new AbortController().signal,
      onEvent: () => undefined,
      request: async () => new Response(`${line}\n`, { status: 200 }),
    })).rejects.toMatchObject({ code: "PROJECT_MISMATCH" });
  });
});
