import { describe, expect, it } from "vitest";
import {
  AGENT_CONTRACT_VERSION,
  AGENT_RUNTIME_AUDIENCE,
  PROJECT_TASKS_TOOL,
  AgentContractError,
  assertNoIdentityOverrides,
  parseSessionRequest,
  parseToolRequest,
  validateAgentSessionClaims,
} from "../../../../supabase/functions/_shared/agent-contract.ts";

const UUIDS = {
  user: "10000000-0000-4000-8000-000000000001",
  workspace: "10000000-0000-4000-8000-000000000002",
  project: "10000000-0000-4000-8000-000000000003",
  profile: "10000000-0000-4000-8000-000000000004",
  session: "10000000-0000-4000-8000-000000000005",
  call: "10000000-0000-4000-8000-000000000006",
  correlation: "10000000-0000-4000-8000-000000000007",
  jti: "10000000-0000-4000-8000-000000000008",
} as const;

function expectContractError(run: () => unknown, code: string) {
  try {
    run();
    throw new Error("Expected an AgentContractError");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentContractError);
    expect((error as AgentContractError).code).toBe(code);
  }
}

describe("Proj OS Agent Gateway contract", () => {
  it("accepts only project selection plus request metadata when issuing a session", () => {
    const parsed = parseSessionRequest({
      contractVersion: AGENT_CONTRACT_VERSION,
      projectId: UUIDS.project,
      correlationId: UUIDS.correlation,
      idempotencyKey: "browser-generated-key-0001",
    });
    expect(parsed.projectId).toBe(UUIDS.project);

    expectContractError(() => parseSessionRequest({
      ...parsed,
      userId: UUIDS.user,
    }), "VALIDATION_FAILED");
    expectContractError(() => parseSessionRequest({
      ...parsed,
      agentProfileId: UUIDS.profile,
    }), "VALIDATION_FAILED");
  });

  it("rejects identity and project scope anywhere inside tool arguments", () => {
    for (const value of [
      { projectId: UUIDS.project },
      { project_id: UUIDS.project },
      { filters: { userId: UUIDS.user } },
      { nested: [{ agent_profile_id: UUIDS.profile }] },
    ]) {
      expectContractError(() => assertNoIdentityOverrides(value), "PROJECT_MISMATCH");
    }
  });

  it("parses the one allowlisted read tool without accepting arbitrary arguments", () => {
    const parsed = parseToolRequest({
      contractVersion: AGENT_CONTRACT_VERSION,
      toolCallId: UUIDS.call,
      name: PROJECT_TASKS_TOOL,
      arguments: { status: ["todo", "in_progress"], limit: 25 },
      correlationId: UUIDS.correlation,
    });
    expect(parsed.arguments).toEqual({ status: ["todo", "in_progress"], limit: 25 });

    expectContractError(() => parseToolRequest({
      ...parsed,
      arguments: { ...parsed.arguments, projectId: UUIDS.project },
    }), "VALIDATION_FAILED");
  });

  it("requires immutable subject identity and a lifetime no longer than ten minutes", () => {
    const now = 1_800_000_000;
    const claims = {
      contractVersion: AGENT_CONTRACT_VERSION,
      iss: "https://projos.ai",
      aud: AGENT_RUNTIME_AUDIENCE,
      sub: UUIDS.user,
      workspaceId: UUIDS.workspace,
      userId: UUIDS.user,
      projectId: UUIDS.project,
      agentProfileId: UUIDS.profile,
      sessionId: UUIDS.session,
      scopes: ["project:read", "workflows:view"],
      tools: [PROJECT_TASKS_TOOL],
      iat: now,
      exp: now + 600,
      jti: UUIDS.jti,
    };

    expect(validateAgentSessionClaims(claims, {
      issuer: claims.iss,
      audience: claims.aud,
      nowSeconds: now,
    }).projectId).toBe(UUIDS.project);

    expectContractError(() => validateAgentSessionClaims({
      ...claims,
      sub: UUIDS.workspace,
    }, { issuer: claims.iss, audience: claims.aud, nowSeconds: now }), "INVALID_SESSION");
    expectContractError(() => validateAgentSessionClaims({
      ...claims,
      exp: now + 601,
    }, { issuer: claims.iss, audience: claims.aud, nowSeconds: now }), "INVALID_SESSION");
  });

  it("accepts canonical PostgreSQL UUIDs used by legacy seeded workspaces", () => {
    const now = 1_800_000_000;
    const claims = {
      contractVersion: AGENT_CONTRACT_VERSION,
      iss: "https://projos.ai",
      aud: AGENT_RUNTIME_AUDIENCE,
      sub: UUIDS.user,
      workspaceId: "00000000-0000-0000-0000-000000000001",
      userId: UUIDS.user,
      projectId: UUIDS.project,
      agentProfileId: UUIDS.profile,
      sessionId: UUIDS.session,
      scopes: ["project:read"],
      tools: [PROJECT_TASKS_TOOL],
      iat: now,
      exp: now + 600,
      jti: UUIDS.jti,
    };

    expect(validateAgentSessionClaims(claims, {
      issuer: claims.iss,
      audience: claims.aud,
      nowSeconds: now,
    }).workspaceId).toBe(claims.workspaceId);

    expectContractError(() => validateAgentSessionClaims({
      ...claims,
      workspaceId: "not-a-postgres-uuid",
    }, { issuer: claims.iss, audience: claims.aud, nowSeconds: now }), "VALIDATION_FAILED");
  });
});
