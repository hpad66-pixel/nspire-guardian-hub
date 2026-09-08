import { AGENT_CONTRACT_VERSION, AGENT_RUNTIME_AUDIENCE, type AgentSessionClaims } from "./agent-contract.ts";
import { parseAgentPublicKeyRing, signAgentSession, verifyAgentSession } from "./agent-jwt.ts";

Deno.test("ES256 agent sessions bind the authoritative scope and key ID", async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const now = Math.floor(Date.now() / 1000);
  const claims: AgentSessionClaims = {
    contractVersion: AGENT_CONTRACT_VERSION,
    iss: "https://projos.ai",
    aud: AGENT_RUNTIME_AUDIENCE,
    sub: "10000000-0000-4000-8000-000000000001",
    workspaceId: "10000000-0000-4000-8000-000000000002",
    userId: "10000000-0000-4000-8000-000000000001",
    projectId: "10000000-0000-4000-8000-000000000003",
    agentProfileId: "10000000-0000-4000-8000-000000000004",
    sessionId: "10000000-0000-4000-8000-000000000005",
    scopes: ["project:read"],
    tools: ["project.tasks.list"],
    iat: now,
    exp: now + 600,
    jti: "10000000-0000-4000-8000-000000000006",
  };

  const token = await signAgentSession(claims, privateJwk, "proj-os-agent-test");
  const verified = await verifyAgentSession(token, publicJwk, {
    issuer: claims.iss,
    audience: claims.aud,
    keyId: "proj-os-agent-test",
    nowSeconds: now,
  });
  if (verified.projectId !== claims.projectId || verified.userId !== claims.userId) {
    throw new Error("Verified session scope changed.");
  }

  let rejected = false;
  try {
    await verifyAgentSession(token, publicJwk, {
      issuer: claims.iss,
      audience: claims.aud,
      keyId: "wrong-key",
      nowSeconds: now,
    });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("A token with the wrong key ID was accepted.");
});

Deno.test("agent verification accepts a bounded rotation key ring and rejects unknown kids", async () => {
  const current = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const previous = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const currentPublic = { ...await crypto.subtle.exportKey("jwk", current.publicKey), kid: "proj-os-agent-current-test" };
  const previousPublic = { ...await crypto.subtle.exportKey("jwk", previous.publicKey), kid: "proj-os-agent-previous-test" };
  const now = Math.floor(Date.now() / 1000);
  const claims: AgentSessionClaims = {
    contractVersion: AGENT_CONTRACT_VERSION, iss: "https://projos.ai", aud: AGENT_RUNTIME_AUDIENCE,
    sub: "10000000-0000-4000-8000-000000000001", workspaceId: "10000000-0000-4000-8000-000000000002",
    userId: "10000000-0000-4000-8000-000000000001", projectId: "10000000-0000-4000-8000-000000000003",
    agentProfileId: "10000000-0000-4000-8000-000000000004", sessionId: "10000000-0000-4000-8000-000000000005",
    scopes: ["project:read"], tools: ["project.tasks.list"], iat: now, exp: now + 300,
    jti: "10000000-0000-4000-8000-000000000006",
  };
  const previousToken = await signAgentSession(claims, await crypto.subtle.exportKey("jwk", previous.privateKey), previousPublic.kid);
  const ring = parseAgentPublicKeyRing(JSON.stringify({ keys: [currentPublic, previousPublic] }));
  const verified = await verifyAgentSession(previousToken, ring, { issuer: claims.iss, audience: claims.aud, nowSeconds: now });
  if (verified.projectId !== claims.projectId) throw new Error("Rotation key changed the session scope.");
});
