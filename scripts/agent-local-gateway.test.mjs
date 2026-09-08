import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createLocalAgentGateway, LOCAL_AGENT_CONTRACT_VERSION, LOCAL_AGENT_PROJECT_ID } from "./agent-local-gateway.mjs";

const origin = "http://127.0.0.1:8080";
const gateway = createLocalAgentGateway({ allowedOrigin: origin });
let base;

before(async () => {
  await new Promise((resolve) => gateway.server.listen(0, "127.0.0.1", resolve));
  const address = gateway.server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP address.");
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => gateway.server.close(resolve));
});

async function issueSession(extra = {}, headers = {}) {
  return fetch(`${base}/v1/sessions`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify({
      contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
      projectId: LOCAL_AGENT_PROJECT_ID,
      correlationId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      ...extra,
    }),
  });
}

test("issues a short-lived synthetic session without accepting caller identity", async () => {
  const denied = await issueSession({}, { "x-user-id": "attacker" });
  assert.equal(denied.status, 400);
  assert.equal((await denied.json()).code, "VALIDATION_FAILED");

  const response = await issueSession();
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  const session = await response.json();
  assert.equal(session.projectId, LOCAL_AGENT_PROJECT_ID);
  assert.equal(session.permissionMode, "read_only");
  assert.deepEqual(session.allowedTools, ["project.tasks.list"]);
  assert.equal(Object.hasOwn(session, "userId"), false);
});

test("derives task scope from the signed session and stores sanitized audit metadata", async () => {
  const session = await (await issueSession()).json();
  const correlationId = crypto.randomUUID();
  const toolCallId = crypto.randomUUID();
  const response = await fetch(`${base}/v1/tools`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
      toolCallId,
      name: "project.tasks.list",
      arguments: { status: ["todo", "in_progress"], limit: 5 },
      correlationId,
    }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.output.authoritative, false);
  assert.equal(result.output.items.length, 2);
  assert.equal(result.sources.length, 2);

  const audit = gateway.getAuditLog().at(-1);
  assert.equal(audit.projectId, LOCAL_AGENT_PROJECT_ID);
  assert.equal(audit.toolCallId, toolCallId);
  assert.match(audit.argumentsDigest, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(audit, "arguments"), false);

  const duplicate = await fetch(`${base}/v1/tools`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
      toolCallId,
      name: "project.tasks.list",
      arguments: { limit: 5 },
      correlationId,
    }),
  });
  assert.equal(duplicate.status, 409);
});

test("rejects identity in nested tool arguments and browser tool calls", async () => {
  const session = await (await issueSession()).json();
  const identityAttempt = await fetch(`${base}/v1/tools`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      contractVersion: LOCAL_AGENT_CONTRACT_VERSION,
      toolCallId: crypto.randomUUID(),
      name: "project.tasks.list",
      arguments: { filter: { projectId: crypto.randomUUID() } },
      correlationId: crypto.randomUUID(),
    }),
  });
  assert.equal(identityAttempt.status, 403);
  assert.equal((await identityAttempt.json()).code, "PROJECT_MISMATCH");

  const browserAttempt = await fetch(`${base}/v1/tools`, {
    method: "POST",
    headers: { origin, authorization: `Bearer ${session.sessionToken}`, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(browserAttempt.status, 403);
});
