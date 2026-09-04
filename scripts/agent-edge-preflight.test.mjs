import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { before, test } from "node:test";
import { validateAgentEdgeEnvironment } from "./agent-edge-preflight.mjs";

let environment;
before(async () => {
  const keyId = "proj-os-agent-staging-2026-09";
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = { ...await webcrypto.subtle.exportKey("jwk", pair.privateKey), kid: keyId };
  const publicJwk = { ...await webcrypto.subtle.exportKey("jwk", pair.publicKey), kid: keyId };
  environment = {
    AGENT_DEPLOYMENT_ENV: "staging",
    AGENT_SESSION_ISSUER: "https://staging.projos.example",
    AGENT_SESSION_AUDIENCE: "proj-os-agent-runtime",
    AGENT_SESSION_KEY_ID: keyId,
    AGENT_SESSION_PRIVATE_JWK: JSON.stringify(privateJwk),
    AGENT_SESSION_PUBLIC_JWKS: JSON.stringify({ keys: [publicJwk] }),
    AGENT_GATEWAY_ALLOWED_ORIGINS: "https://staging.projos.example",
    PROJ_OS_APP_URL: "https://staging.projos.example",
  };
});

test("verifies the Edge signing pair and exact application origin", async () => {
  const result = await validateAgentEdgeEnvironment(environment);
  assert.equal(result.keyPairVerified, true);
  assert.deepEqual(result.allowedOrigins, ["https://staging.projos.example"]);
});

test("rejects a mismatched public key", async () => {
  const other = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const otherPublic = { ...await webcrypto.subtle.exportKey("jwk", other.publicKey), kid: environment.AGENT_SESSION_KEY_ID };
  await assert.rejects(
    validateAgentEdgeEnvironment({ ...environment, AGENT_SESSION_PUBLIC_JWKS: JSON.stringify({ keys: [otherPublic] }) }),
    /do not form a pair/,
  );
});

test("accepts a previous public key during rotation while requiring the active signing key", async () => {
  const previous = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const previousPublic = { ...await webcrypto.subtle.exportKey("jwk", previous.publicKey), kid: "proj-os-agent-staging-2026-08" };
  const current = JSON.parse(environment.AGENT_SESSION_PUBLIC_JWKS).keys[0];
  const result = await validateAgentEdgeEnvironment({
    ...environment,
    AGENT_SESSION_PUBLIC_JWKS: JSON.stringify({ keys: [current, previousPublic] }),
  });
  assert.deepEqual(result.acceptedKeyIds, [environment.AGENT_SESSION_KEY_ID, previousPublic.kid]);
});

test("rejects unsafe origins and a missing application origin", async () => {
  await assert.rejects(validateAgentEdgeEnvironment({ ...environment, AGENT_GATEWAY_ALLOWED_ORIGINS: "*" }), /https/i);
  await assert.rejects(
    validateAgentEdgeEnvironment({ ...environment, AGENT_GATEWAY_ALLOWED_ORIGINS: "https://other.example" }),
    /include PROJ_OS_APP_URL/,
  );
});
