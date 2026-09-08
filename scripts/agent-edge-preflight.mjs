import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";

const KEY_ID = /^proj-os-agent-[a-z0-9][a-z0-9._-]{5,80}$/i;
const COORDINATE = /^[A-Za-z0-9_-]{43}$/;

export async function validateAgentEdgeEnvironment(environment) {
  const deployment = required(environment, "AGENT_DEPLOYMENT_ENV");
  if (!new Set(["staging", "production"]).has(deployment)) {
    throw new Error("AGENT_DEPLOYMENT_ENV must be staging or production.");
  }
  const issuer = exactHttpsOrigin(required(environment, "AGENT_SESSION_ISSUER"), "AGENT_SESSION_ISSUER");
  const appUrl = exactHttpsOrigin(required(environment, "PROJ_OS_APP_URL"), "PROJ_OS_APP_URL");
  const audience = required(environment, "AGENT_SESSION_AUDIENCE");
  if (audience !== "proj-os-agent-runtime") throw new Error("AGENT_SESSION_AUDIENCE must match the runtime contract.");
  const keyId = required(environment, "AGENT_SESSION_KEY_ID");
  if (!KEY_ID.test(keyId)) throw new Error("AGENT_SESSION_KEY_ID has an invalid format.");

  const privateJwk = parseJwk(required(environment, "AGENT_SESSION_PRIVATE_JWK"), "AGENT_SESSION_PRIVATE_JWK");
  const publicJwks = parseJwk(required(environment, "AGENT_SESSION_PUBLIC_JWKS"), "AGENT_SESSION_PUBLIC_JWKS");
  if (!isP256(privateJwk) || typeof privateJwk.d !== "string" || !COORDINATE.test(privateJwk.d)) {
    throw new Error("AGENT_SESSION_PRIVATE_JWK must be a private P-256 signing key.");
  }
  if (!Array.isArray(publicJwks.keys) || publicJwks.keys.length < 1 || publicJwks.keys.length > 4) throw new Error("AGENT_SESSION_PUBLIC_JWKS must contain one to four keys.");
  const keyIds = new Set();
  for (const candidate of publicJwks.keys) {
    if (!isP256(candidate) || candidate.d || !KEY_ID.test(candidate.kid ?? "") || keyIds.has(candidate.kid)) {
      throw new Error("AGENT_SESSION_PUBLIC_JWKS must contain unique public P-256 keys with valid kid values.");
    }
    keyIds.add(candidate.kid);
  }
  const publicJwk = publicJwks.keys.find((candidate) => candidate.kid === keyId);
  if (!publicJwk) throw new Error("AGENT_SESSION_PUBLIC_JWKS must contain the active AGENT_SESSION_KEY_ID.");
  if (privateJwk.x !== publicJwk.x || privateJwk.y !== publicJwk.y) {
    throw new Error("The Agent session private and public JWKs do not form a pair.");
  }
  if ((privateJwk.kid && privateJwk.kid !== keyId) || publicJwk.kid !== keyId) {
    throw new Error("Agent session JWK kid must match AGENT_SESSION_KEY_ID.");
  }

  try {
    const privateKey = await webcrypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const publicKey = await webcrypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const message = new TextEncoder().encode("proj-os-agent-staging-preflight");
    const signature = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, message);
    if (!await webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, message)) throw new Error();
  } catch {
    throw new Error("The Agent session key pair failed a sign/verify preflight.");
  }

  const origins = required(environment, "AGENT_GATEWAY_ALLOWED_ORIGINS").split(",").map((value) => value.trim()).filter(Boolean);
  if (origins.length === 0) throw new Error("AGENT_GATEWAY_ALLOWED_ORIGINS must include the Proj OS application origin.");
  for (const origin of origins) exactHttpsOrigin(origin, "AGENT_GATEWAY_ALLOWED_ORIGINS");
  if (!origins.includes(appUrl)) throw new Error("AGENT_GATEWAY_ALLOWED_ORIGINS must include PROJ_OS_APP_URL.");

  return {
    deployment,
    issuer,
    audience,
    keyId,
    acceptedKeyIds: [...keyIds],
    appUrl,
    allowedOrigins: [...new Set(origins)],
    keyPairVerified: true,
  };
}

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function exactHttpsOrigin(value, name) {
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error(`${name} must contain exact HTTPS origins.`); }
  if (parsed.protocol !== "https:" || parsed.origin !== value || value === "null") {
    throw new Error(`${name} must contain exact HTTPS origins.`);
  }
  return value;
}

function parseJwk(value, name) {
  try { return JSON.parse(value); }
  catch { throw new Error(`${name} must be valid JSON.`); }
}

function isP256(jwk) {
  return jwk?.kty === "EC" && jwk?.crv === "P-256" && COORDINATE.test(jwk.x ?? "") && COORDINATE.test(jwk.y ?? "");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await validateAgentEdgeEnvironment(process.env);
    console.log(JSON.stringify({ status: "ready", ...result }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Agent Edge preflight failed.");
    process.exitCode = 1;
  }
}
