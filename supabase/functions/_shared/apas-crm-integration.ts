export const CRM_CONTRACT_VERSION = "crm-integration.v1" as const;
export const CRM_CONTRACT_MAJOR = 1;
export const MAX_JSON_BYTES = 1_000_000;
export const MAX_CARD_BYTES = 12_000_000;
export const ALLOWED_CARD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type CardSide = "front" | "back";
export type UploadDescriptor = {
  side: CardSide;
  fileName: string;
  contentType: typeof ALLOWED_CARD_TYPES[number];
  size: number;
  sha256?: string;
};

export type UploadGrant = {
  uploadId: string;
  side: CardSide;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
};

export type CategoryCatalog = {
  contractVersion: typeof CRM_CONTRACT_VERSION;
  catalogVersion: string;
  categories: Array<{ id: string; name: string; active: boolean }>;
};

export type ContactIntakeResult = {
  contractVersion: typeof CRM_CONTRACT_VERSION;
  externalId: string;
  status: string;
  reviewPayload: Record<string, unknown>;
};

export type ProposalResult = ContactIntakeResult & {
  canonicalContactId?: string;
  contactUrl?: string;
};

export type CanonicalContact = {
  contractVersion: typeof CRM_CONTRACT_VERSION;
  id: string;
  displayName: string;
  companyName?: string;
  primaryEmail?: string;
  contactUrl?: string;
  status: string;
};

export type ApasEvent = {
  contractVersion: typeof CRM_CONTRACT_VERSION;
  eventId: string;
  type:
    | "contact_intake.review_required"
    | "contact_intake.resolved"
    | "contact.created"
    | "contact.updated"
    | "contact.canonicalized"
    | "contact.merged";
  issuer: string;
  audience: string;
  occurredAt: string;
  data: {
    externalIntakeId: string;
    correlationId: string;
    remoteStatus?: string;
    canonicalContactId?: string;
    retiredContactId?: string;
    survivingContactId?: string;
    displayName?: string;
    companyName?: string;
    primaryEmail?: string;
    contactUrl?: string;
    reviewPayload?: Record<string, unknown>;
  };
};

export class ApasCrmError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public status = 502,
  ) {
    super(message);
  }
}

type AdapterContext = {
  workspaceId: string;
  correlationId: string;
  idempotencyKey: string;
};

type AdapterConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  issuer: string;
  timeoutMs: number;
};

const encoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ApasCrmError("invalid_contract_response", `APAS CRM returned an invalid ${field}`, false);
  }
  return value;
}

function optionalString(value: unknown, field: string, max = 1_000): string | undefined {
  if (value == null) return undefined;
  return requiredString(value, field, max);
}

function isoDate(value: unknown, field: string): string {
  const text = requiredString(value, field, 80);
  if (!Number.isFinite(Date.parse(text))) {
    throw new ApasCrmError("invalid_contract_response", `APAS CRM returned an invalid ${field}`, false);
  }
  return text;
}

function uuid(value: unknown, field: string): string {
  const text = requiredString(value, field, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new ApasCrmError("invalid_contract_response", `APAS CRM returned an invalid ${field}`, false);
  }
  return text;
}

function assertContract(value: Record<string, unknown>) {
  if (value.contractVersion !== CRM_CONTRACT_VERSION) {
    throw new ApasCrmError("incompatible_contract", "APAS CRM returned an incompatible contract version", false, 502);
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value: string): string {
  return base64Url(encoder.encode(value));
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signedCredential(config: AdapterConfig, workspaceId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "HS256", typ: "JWT", kid: config.clientId }));
  const payload = base64UrlText(JSON.stringify({
    iss: config.issuer,
    sub: config.clientId,
    aud: config.audience,
    iat: now,
    nbf: now - 5,
    exp: now + 60,
    jti: crypto.randomUUID(),
    workspace_id: workspaceId,
    contract: CRM_CONTRACT_VERSION,
  }));
  const input = `${header}.${payload}`;
  const signatureHex = await hmacHex(config.clientSecret, input);
  const signatureBytes = new Uint8Array(signatureHex.match(/.{2}/g)!.map((pair) => parseInt(pair, 16)));
  return `${input}.${base64Url(signatureBytes)}`;
}

function loadConfig(): AdapterConfig {
  const mode = Deno.env.get("APAS_CRM_MODE") ?? "remote";
  const production = Boolean(Deno.env.get("DENO_DEPLOYMENT_ID")) || Deno.env.get("ENVIRONMENT") === "production";
  if (mode !== "remote") {
    if (production || mode !== "synthetic" || Deno.env.get("APAS_CRM_ALLOW_SYNTHETIC") !== "true") {
      throw new ApasCrmError("integration_not_configured", "APAS CRM integration is not configured", false, 503);
    }
    throw new ApasCrmError("synthetic_adapter_only", "The synthetic CRM adapter is test-only and cannot execute an intake", false, 503);
  }
  const baseUrl = (Deno.env.get("APAS_CRM_BASE_URL") ?? "").replace(/\/+$/, "");
  const clientId = Deno.env.get("APAS_CRM_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("APAS_CRM_CLIENT_SECRET") ?? "";
  const audience = Deno.env.get("APAS_CRM_AUDIENCE") ?? "apas-crm";
  const issuer = Deno.env.get("APAS_CRM_ISSUER") ?? "proj-os";
  if (!baseUrl || !clientId || clientSecret.length < 32) {
    throw new ApasCrmError("integration_not_configured", "APAS CRM integration is not configured", false, 503);
  }
  return { baseUrl, clientId, clientSecret, audience, issuer, timeoutMs: 10_000 };
}

function safeRemoteMessage(status: number): string {
  if (status === 401 || status === 403) return "APAS CRM rejected the integration credential";
  if (status === 409) return "APAS CRM reported a conflicting intake state";
  if (status === 413) return "APAS CRM rejected the payload size";
  if (status === 429) return "APAS CRM is busy; this intake can be retried";
  if (status >= 500) return "APAS CRM is temporarily unavailable";
  return "APAS CRM rejected the request";
}

async function requestJson(
  method: "GET" | "POST",
  path: string,
  context: AdapterContext,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const encoded = body == null ? "" : JSON.stringify(body);
  if (encoder.encode(encoded).byteLength > MAX_JSON_BYTES) {
    throw new ApasCrmError("payload_too_large", "The CRM intake payload is too large", false, 413);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const credential = await signedCredential(config, context.workspaceId);
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${credential}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-apas-contract-version": CRM_CONTRACT_VERSION,
        "x-correlation-id": context.correlationId,
        "idempotency-key": context.idempotencyKey,
      },
      body: body == null ? undefined : encoded,
    });
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_JSON_BYTES) {
      throw new ApasCrmError("response_too_large", "APAS CRM returned an oversized response", false);
    }
    const text = await response.text();
    if (encoder.encode(text).byteLength > MAX_JSON_BYTES) {
      throw new ApasCrmError("response_too_large", "APAS CRM returned an oversized response", false);
    }
    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      throw new ApasCrmError("apas_crm_request_failed", safeRemoteMessage(response.status), retryable, response.status);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ApasCrmError("invalid_contract_response", "APAS CRM returned invalid JSON", false);
    }
    if (!isRecord(parsed)) throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid response", false);
    assertContract(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof ApasCrmError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApasCrmError("apas_crm_timeout", "APAS CRM timed out; this intake can be retried", true, 504);
    }
    throw new ApasCrmError("apas_crm_unavailable", "APAS CRM is temporarily unavailable", true, 503);
  } finally {
    clearTimeout(timeout);
  }
}

export function validateUploadDescriptors(value: unknown): UploadDescriptor[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    throw new ApasCrmError("invalid_uploads", "A front image and optional back image are required", false, 400);
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!isRecord(item)) throw new ApasCrmError("invalid_upload", "Invalid card upload", false, 400);
    const side = item.side === "front" || item.side === "back" ? item.side : null;
    const contentType = ALLOWED_CARD_TYPES.includes(item.contentType as typeof ALLOWED_CARD_TYPES[number])
      ? item.contentType as typeof ALLOWED_CARD_TYPES[number]
      : null;
    const size = Number(item.size);
    if (!side || seen.has(side) || !contentType || !Number.isInteger(size) || size < 1 || size > MAX_CARD_BYTES) {
      throw new ApasCrmError("invalid_upload", "Card files must be JPEG, PNG, WebP, or PDF and no larger than 12 MB", false, 400);
    }
    seen.add(side);
    let uploadUrl: URL;
    try { uploadUrl = new URL(requiredString(raw.uploadUrl, "uploadUrl", 2_000)); }
    catch { throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid upload URL", false); }
    if (uploadUrl.protocol !== "https:") {
      throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an insecure upload URL", false);
    }
    return {
      side,
      contentType,
      size,
      fileName: requiredString(item.fileName, "fileName", 240),
      sha256: optionalString(item.sha256, "sha256", 128),
    };
  });
}

export async function requestUploadGrants(
  context: AdapterContext,
  uploads: UploadDescriptor[],
  source: Record<string, unknown>,
): Promise<UploadGrant[]> {
  const value = await requestJson("POST", "/v1/integrations/proj-os/upload-grants", context, {
    contractVersion: CRM_CONTRACT_VERSION,
    uploads,
    source,
  });
  if (!Array.isArray(value.grants) || value.grants.length !== uploads.length) {
    throw new ApasCrmError("invalid_contract_response", "APAS CRM returned invalid upload grants", false);
  }
  return value.grants.map((raw) => {
    if (!isRecord(raw)) throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid upload grant", false);
    const side = raw.side === "front" || raw.side === "back" ? raw.side : null;
    if (!side || raw.method !== "PUT" || !isRecord(raw.headers)) {
      throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid upload grant", false);
    }
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw.headers)) {
      if (typeof val !== "string" || key.toLowerCase() === "authorization") {
        throw new ApasCrmError("invalid_contract_response", "APAS CRM returned unsafe upload headers", false);
      }
      headers[key] = val;
    }
    const maxBytes = Number(raw.maxBytes);
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_CARD_BYTES) {
      throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid upload limit", false);
    }
    return {
      uploadId: requiredString(raw.uploadId, "uploadId", 200),
      side,
      uploadUrl: uploadUrl.toString(),
      method: "PUT",
      headers,
      expiresAt: isoDate(raw.expiresAt, "expiresAt"),
      maxBytes,
    };
  });
}

function parseIntakeResult(value: Record<string, unknown>): ContactIntakeResult {
  const reviewPayload = value.reviewPayload == null ? {} : value.reviewPayload;
  if (!isRecord(reviewPayload)) throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid review payload", false);
  return {
    contractVersion: CRM_CONTRACT_VERSION,
    externalId: requiredString(value.externalId, "externalId", 200),
    status: requiredString(value.status, "status", 100),
    reviewPayload,
  };
}

export async function createContactIntake(
  context: AdapterContext,
  body: Record<string, unknown>,
): Promise<ContactIntakeResult> {
  return parseIntakeResult(await requestJson("POST", "/v1/integrations/proj-os/contact-intakes", context, body));
}

export async function getContactIntake(
  context: AdapterContext,
  externalId: string,
): Promise<ContactIntakeResult> {
  return parseIntakeResult(await requestJson(
    "GET",
    `/v1/integrations/proj-os/contact-intakes/${encodeURIComponent(externalId)}`,
    context,
  ));
}

export async function submitContactProposal(
  context: AdapterContext,
  externalId: string,
  body: Record<string, unknown>,
): Promise<ProposalResult> {
  const value = await requestJson(
    "POST",
    `/v1/integrations/proj-os/contact-intakes/${encodeURIComponent(externalId)}/proposals`,
    context,
    body,
  );
  const parsed = parseIntakeResult(value);
  return {
    ...parsed,
    canonicalContactId: optionalString(value.canonicalContactId, "canonicalContactId", 200),
    contactUrl: optionalString(value.contactUrl, "contactUrl", 2_000),
  };
}

export async function getCategories(context: AdapterContext): Promise<CategoryCatalog> {
  const value = await requestJson("GET", "/v1/integrations/proj-os/categories", context);
  if (!Array.isArray(value.categories)) throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid category catalog", false);
  const categories = value.categories.map((raw) => {
    if (!isRecord(raw)) throw new ApasCrmError("invalid_contract_response", "APAS CRM returned an invalid category", false);
    return {
      id: requiredString(raw.id, "category.id", 200),
      name: requiredString(raw.name, "category.name", 200),
      active: raw.active !== false,
    };
  });
  return {
    contractVersion: CRM_CONTRACT_VERSION,
    catalogVersion: requiredString(value.catalogVersion, "catalogVersion", 200),
    categories,
  };
}

export async function getCanonicalContact(
  context: AdapterContext,
  apasContactId: string,
): Promise<CanonicalContact> {
  const value = await requestJson(
    "GET",
    `/v1/integrations/proj-os/contacts/${encodeURIComponent(apasContactId)}`,
    context,
  );
  return {
    contractVersion: CRM_CONTRACT_VERSION,
    id: requiredString(value.id, "contact.id", 200),
    displayName: requiredString(value.displayName, "contact.displayName", 300),
    companyName: optionalString(value.companyName, "contact.companyName", 300),
    primaryEmail: optionalString(value.primaryEmail, "contact.primaryEmail", 320),
    contactUrl: optionalString(value.contactUrl, "contact.contactUrl", 2_000),
    status: requiredString(value.status, "contact.status", 100),
  };
}

export function validateApasEvent(value: unknown): ApasEvent {
  if (!isRecord(value)) throw new ApasCrmError("invalid_event", "Invalid APAS CRM event", false, 400);
  assertContract(value);
  const allowed = new Set([
    "contact_intake.review_required", "contact_intake.resolved", "contact.created",
    "contact.updated", "contact.canonicalized", "contact.merged",
  ]);
  const type = requiredString(value.type, "event type", 100);
  if (!allowed.has(type)) throw new ApasCrmError("invalid_event", "Unsupported APAS CRM event", false, 400);
  if (!isRecord(value.data)) throw new ApasCrmError("invalid_event", "Invalid APAS CRM event data", false, 400);
  const data = value.data;
  const event: ApasEvent = {
    contractVersion: CRM_CONTRACT_VERSION,
    eventId: requiredString(value.eventId, "eventId", 200),
    type: type as ApasEvent["type"],
    issuer: requiredString(value.issuer, "issuer", 200),
    audience: requiredString(value.audience, "audience", 200),
    occurredAt: isoDate(value.occurredAt, "occurredAt"),
    data: {
      externalIntakeId: requiredString(data.externalIntakeId, "externalIntakeId", 200),
      correlationId: uuid(data.correlationId, "correlationId"),
      remoteStatus: optionalString(data.remoteStatus, "remoteStatus", 100),
      canonicalContactId: optionalString(data.canonicalContactId, "canonicalContactId", 200),
      retiredContactId: optionalString(data.retiredContactId, "retiredContactId", 200),
      survivingContactId: optionalString(data.survivingContactId, "survivingContactId", 200),
      displayName: optionalString(data.displayName, "displayName", 300),
      companyName: optionalString(data.companyName, "companyName", 300),
      primaryEmail: optionalString(data.primaryEmail, "primaryEmail", 320),
      contactUrl: optionalString(data.contactUrl, "contactUrl", 2_000),
      reviewPayload: data.reviewPayload == null
        ? undefined
        : isRecord(data.reviewPayload)
          ? data.reviewPayload
          : (() => { throw new ApasCrmError("invalid_event", "Invalid event review payload", false, 400); })(),
    },
  };
  if (["contact_intake.resolved", "contact.created", "contact.canonicalized"].includes(event.type) && !event.data.canonicalContactId) {
    throw new ApasCrmError("invalid_event", "Resolved event requires a canonical contact ID", false, 400);
  }
  if (event.type === "contact.merged" && (!event.data.retiredContactId || !event.data.survivingContactId || event.data.retiredContactId === event.data.survivingContactId)) {
    throw new ApasCrmError("invalid_event", "Merge event requires distinct retired and surviving contact IDs", false, 400);
  }
  return event;
}

export function safeFailure(error: unknown): { code: string; reason: string; retryable: boolean; status: number } {
  if (error instanceof ApasCrmError) {
    return { code: error.code, reason: error.message.slice(0, 500), retryable: error.retryable, status: error.status };
  }
  return { code: "integration_failure", reason: "APAS CRM integration failed safely", retryable: false, status: 500 };
}
