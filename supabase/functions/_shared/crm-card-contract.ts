export const CRM_CARD_CONTRACT_VERSION = "2026-09-01" as const;
export const CRM_CARD_BUCKET = "crm-card-intake" as const;
export const CRM_CARD_APPROVAL_TTL_SECONDS = 300;
export const CRM_CARD_MAX_BYTES = 10 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/heic"]);
const ACTIONS = new Set(["create", "update", "link_existing"]);
const CONTACT_TYPES = new Set(["vendor", "regulator", "contractor", "tenant", "owner", "inspector", "utility", "government", "other"]);
const RESERVED_IDENTITY_KEYS = new Set([
  "workspaceId", "workspace_id", "tenantId", "tenant_id", "userId", "user_id",
  "projectId", "project_id", "agentProfileId", "agent_profile_id", "profileId",
  "profile_id", "sessionId", "session_id",
]);

export type ExtractedCardField = {
  field: "name" | "title" | "organization" | "email" | "phone" | "website" | "address";
  value: string;
  confidence: number;
  sourceSide: "front" | "back";
  reviewRequired: boolean;
};

export type CardSourceContext = {
  metAt?: string;
  metOn?: string;
  eventOrLocation?: string;
  introducer?: string;
  notes?: string;
  websiteOrSource?: string;
  tags: string[];
  desiredFollowUp?: string;
  projectRole?: string;
};

export type CreateIntakeInput = {
  operation: "create_intake";
  contractVersion: typeof CRM_CARD_CONTRACT_VERSION;
  projectId: string;
  correlationId: string;
  idempotencyKey: string;
  card: { mediaType: string; frontSha256: string; backSha256?: string };
  sourceContext: CardSourceContext;
};

export type ActionInput = {
  kind: "create" | "update" | "link_existing";
  targetContactId?: string;
  reviewedFields: Record<string, string>;
};

export class CardContractError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message);
    this.name = "CardContractError";
  }
}

export function parseCreateIntake(value: unknown): CreateIntakeInput {
  const body = strictObject(value, ["operation", "contractVersion", "projectId", "correlationId", "idempotencyKey", "card", "sourceContext"]);
  if (body.operation !== "create_intake") fail("VALIDATION_FAILED", "Invalid operation.");
  if (body.contractVersion !== CRM_CARD_CONTRACT_VERSION) fail("VALIDATION_FAILED", "Unsupported contract version.");
  const card = strictObject(body.card, ["mediaType", "frontSha256", "backSha256"]);
  const mediaType = text(card.mediaType, "card.mediaType", 1, 80);
  if (!MEDIA_TYPES.has(mediaType)) fail("UNSUPPORTED_IMAGE", "Use a JPEG, PNG, or HEIC image.", 415);
  const frontSha256 = hash(card.frontSha256, "card.frontSha256");
  const backSha256 = card.backSha256 === undefined ? undefined : hash(card.backSha256, "card.backSha256");
  return {
    operation: "create_intake",
    contractVersion: CRM_CARD_CONTRACT_VERSION,
    projectId: uuid(body.projectId, "projectId"),
    correlationId: uuid(body.correlationId, "correlationId"),
    idempotencyKey: text(body.idempotencyKey, "idempotencyKey", 16, 200),
    card: { mediaType, frontSha256, ...(backSha256 ? { backSha256 } : {}) },
    sourceContext: parseSourceContext(body.sourceContext),
  };
}

export function parseAction(value: unknown): ActionInput {
  const action = strictObject(value, ["kind", "targetContactId", "reviewedFields"]);
  const kind = text(action.kind, "action.kind", 1, 32);
  if (!ACTIONS.has(kind)) fail("VALIDATION_FAILED", "Invalid CRM action.");
  assertNoIdentityOverrides(action.reviewedFields ?? {}, "action.reviewedFields");
  const reviewed = strictObject(action.reviewedFields ?? {}, [
    "firstName", "lastName", "organization", "title", "email", "phone", "mobile",
    "website", "address", "city", "state", "zipCode", "country", "contactType",
  ]);
  const reviewedFields: Record<string, string> = {};
  for (const [key, entry] of Object.entries(reviewed)) {
    if (typeof entry !== "string" || entry.length > 4_000) fail("VALIDATION_FAILED", `Invalid ${key}.`);
    reviewedFields[key] = entry.trim();
  }
  if (reviewedFields.contactType && !CONTACT_TYPES.has(reviewedFields.contactType)) fail("VALIDATION_FAILED", "Invalid contactType.");
  if (reviewedFields.email && !normalizeEmail(reviewedFields.email)) fail("VALIDATION_FAILED", "Enter a valid email address.");
  if (reviewedFields.phone && !normalizePhone(reviewedFields.phone)) fail("VALIDATION_FAILED", "Enter a valid phone number.");
  if (reviewedFields.mobile && !normalizePhone(reviewedFields.mobile)) fail("VALIDATION_FAILED", "Enter a valid mobile number.");
  if (reviewedFields.website && !normalizeWebsite(reviewedFields.website)) fail("VALIDATION_FAILED", "Enter a valid website.");
  const targetContactId = action.targetContactId === undefined ? undefined : uuid(action.targetContactId, "targetContactId");
  if (kind === "create" && targetContactId) fail("VALIDATION_FAILED", "Create cannot specify a target contact.");
  if (kind !== "create" && !targetContactId) fail("VALIDATION_FAILED", "This action requires a target contact.");
  if (kind === "create" && !reviewedFields.firstName) fail("VALIDATION_FAILED", "First name is required.");
  return { kind: kind as ActionInput["kind"], ...(targetContactId ? { targetContactId } : {}), reviewedFields };
}

export function parseSourceContext(value: unknown): CardSourceContext {
  assertNoIdentityOverrides(value ?? {}, "sourceContext");
  const source = strictObject(value ?? {}, [
    "metAt", "metOn", "eventOrLocation", "introducer", "notes", "websiteOrSource",
    "tags", "desiredFollowUp", "projectRole",
  ]);
  const result: CardSourceContext = { tags: [] };
  const limits: Record<string, number> = {
    metAt: 240, metOn: 10, eventOrLocation: 240, introducer: 240, notes: 4000,
    websiteOrSource: 2000, desiredFollowUp: 2000, projectRole: 160,
  };
  for (const [key, limit] of Object.entries(limits)) {
    if (source[key] !== undefined) (result as Record<string, unknown>)[key] = text(source[key], key, 0, limit).trim();
  }
  if (source.metOn && !/^\d{4}-\d{2}-\d{2}$/.test(String(source.metOn))) fail("VALIDATION_FAILED", "metOn must be YYYY-MM-DD.");
  if (source.websiteOrSource) {
    try { new URL(String(source.websiteOrSource)); } catch { fail("VALIDATION_FAILED", "websiteOrSource must be a URL."); }
  }
  if (source.tags !== undefined) {
    if (!Array.isArray(source.tags) || source.tags.length > 40) fail("VALIDATION_FAILED", "tags must contain at most 40 items.");
    result.tags = source.tags.map((tag) => text(tag, "tag", 1, 80).trim());
  }
  return result;
}

export function assertNoIdentityOverrides(value: unknown, path = "payload"): void {
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoIdentityOverrides(entry, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (RESERVED_IDENTITY_KEYS.has(key)) fail("SCOPE_OVERRIDE_REJECTED", `Identity scope cannot appear in ${path}.${key}.`, 403);
    assertNoIdentityOverrides(entry, `${path}.${key}`);
  }
}

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const extension = value.match(/(?:ext\.?|x)\s*(\d+)$/i)?.[1];
  let digits = value.replace(/[^0-9]/g, "");
  if (extension && digits.endsWith(extension)) digits = digits.slice(0, -extension.length);
  if (digits.length === 10) digits = `1${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}${extension ? `x${extension}` : ""}`;
}

export function normalizeWebsite(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch { return null; }
}

export function normalizeName(value?: string | null): string {
  return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function strictObject(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("VALIDATION_FAILED", "Expected an object.");
  const object = value as Record<string, unknown>;
  const unknown = Object.keys(object).find((key) => !allowed.includes(key));
  if (unknown) fail("VALIDATION_FAILED", `Unexpected field: ${unknown}.`);
  return object;
}
function uuid(value: unknown, label: string): string { const v = text(value, label, 36, 36); if (!UUID.test(v)) fail("VALIDATION_FAILED", `${label} must be a UUID.`); return v; }
function hash(value: unknown, label: string): string { const v = text(value, label, 64, 64); if (!SHA256.test(v)) fail("VALIDATION_FAILED", `${label} must be SHA-256.`); return v; }
function text(value: unknown, label: string, min: number, max: number): string { if (typeof value !== "string" || value.length < min || value.length > max) fail("VALIDATION_FAILED", `Invalid ${label}.`); return value; }
function fail(code: string, message: string, status = 400): never { throw new CardContractError(code, message, status); }
