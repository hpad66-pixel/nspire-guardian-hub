import {
  validateAgentSessionClaims,
  type AgentSessionClaims,
} from "./agent-contract.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
type AgentPublicJwk = JsonWebKey & { kid?: string };

export async function signAgentSession(
  claims: AgentSessionClaims,
  privateJwk: JsonWebKey,
  keyId: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = encodeJson({ alg: "ES256", typ: "JWT", kid: keyId });
  const payload = encodeJson(claims);
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyAgentSession(
  token: string,
  publicJwkOrRing: AgentPublicJwk | AgentPublicJwk[],
  expected: { issuer: string; audience: string; keyId?: string; nowSeconds?: number },
): Promise<AgentSessionClaims> {
  if (token.length > 16_384) throw new Error("Agent session is too large.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Agent session format is invalid.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader) as Record<string, unknown>;
  if (header.alg !== "ES256" || header.typ !== "JWT" || typeof header.kid !== "string") {
    throw new Error("Agent session header is invalid.");
  }
  if (expected.keyId && header.kid !== expected.keyId) throw new Error("Agent session header is invalid.");
  const keyRing = Array.isArray(publicJwkOrRing) ? publicJwkOrRing : [publicJwkOrRing];
  const publicJwk = keyRing.find((candidate) => candidate.kid === header.kid || (keyRing.length === 1 && !candidate.kid));
  if (!publicJwk) throw new Error("Agent session key ID is not accepted.");
  const key = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    base64UrlDecode(encodedSignature).buffer as ArrayBuffer,
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!verified) throw new Error("Agent session signature is invalid.");
  return validateAgentSessionClaims(decodeJson(encodedPayload), expected);
}

export function parseAgentPublicKeyRing(value: string): AgentPublicJwk[] {
  const parsed = JSON.parse(value) as { keys?: AgentPublicJwk[] };
  if (!Array.isArray(parsed.keys) || parsed.keys.length < 1 || parsed.keys.length > 4) {
    throw new Error("Agent session JWKS must contain one to four keys.");
  }
  const seen = new Set<string>();
  for (const key of parsed.keys) {
    if (key.kty !== "EC" || key.crv !== "P-256" || !/^[A-Za-z0-9_-]{43}$/.test(key.x ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(key.y ?? "") || key.d || typeof key.kid !== "string" || seen.has(key.kid)) {
      throw new Error("Agent session JWKS contains an invalid or duplicate public key.");
    }
    seen.add(key.kid);
  }
  return parsed.keys;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeJson(value: unknown): string {
  return base64UrlEncode(encoder.encode(JSON.stringify(value)));
}

function decodeJson(value: string): unknown {
  return JSON.parse(decoder.decode(base64UrlDecode(value)));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
