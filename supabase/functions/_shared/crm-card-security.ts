import { canonicalJson } from "./crm-card-contract.ts";

export type ApprovalClaims = {
  version: 1;
  approvalId: string;
  intakeId: string;
  actorUserId: string;
  tenantId: string;
  projectId: string;
  normalizedActionSha256: string;
  expiresAt: string;
};

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function actionDigest(action: unknown, sourceContext: unknown): Promise<string> {
  return sha256Hex(canonicalJson({ action, sourceContext }));
}

export async function signApproval(claims: ApprovalClaims, secret: string): Promise<string> {
  if (secret.length < 32) throw new Error("CRM_CARD_APPROVAL_SECRET must contain at least 32 characters.");
  const payload = base64Url(new TextEncoder().encode(canonicalJson(claims)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyApproval(token: string, secret: string, now = Date.now()): Promise<ApprovalClaims> {
  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra) throw new Error("Invalid approval token.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(encodedSignature).buffer as ArrayBuffer, new TextEncoder().encode(payload));
  if (!valid) throw new Error("Invalid approval signature.");
  const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as ApprovalClaims;
  if (claims.version !== 1 || Date.parse(claims.expiresAt) <= now) throw new Error("Approval expired.");
  return claims;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
