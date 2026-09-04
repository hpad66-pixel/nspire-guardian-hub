/**
 * Authenticated APAS CRM card-intake boundary.
 * Identity and scope are derived from the verified Supabase user and database;
 * request headers/body cannot assert workspace, user, profile, or session identity.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";
import {
  CRM_CARD_APPROVAL_TTL_SECONDS, CRM_CARD_BUCKET, CRM_CARD_CONTRACT_VERSION,
  CardContractError, normalizeEmail, normalizeName,
  normalizePhone, normalizeWebsite, parseAction, parseCreateIntake, parseSourceContext,
  type ActionInput, type ExtractedCardField,
} from "../_shared/crm-card-contract.ts";
import { extractBusinessCard, OcrError, type CardImage } from "../_shared/crm-card-ocr.ts";
import { actionDigest, sha256Hex, signApproval, verifyApproval, type ApprovalClaims } from "../_shared/crm-card-security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APPROVAL_SECRET = Deno.env.get("CRM_CARD_APPROVAL_SECRET") ?? "";
const ALLOWED_ORIGINS = new Set((Deno.env.get("CRM_CARD_ALLOWED_ORIGINS") ?? Deno.env.get("APP_ORIGIN") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean));
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const IDENTITY_HEADERS = ["x-user-id", "x-workspace-id", "x-tenant-id", "x-project-id", "x-agent-profile-id", "x-session-id"];

type Scope = { userId: string; tenantId: string; projectId: string };
type ScopedDatabaseRow = { id: string; tenant_id: string; user_id: string; project_id: string };
type PublicIntakeRow = ScopedDatabaseRow & {
  correlation_id: string; status: string; extracted_fields?: unknown; duplicate_candidates?: unknown;
  review_reason?: string | null; guidance?: string | null; failure_code?: string | null;
  failure_message?: string | null; failure_retryable?: boolean | null; processed_at?: string | null;
};

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return failure("PERMISSION_DENIED", "Origin is not allowed.", 403);
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (request.method !== "POST") return failure("VALIDATION_FAILED", "Method not allowed.", 405, origin);
  if (!SUPABASE_URL || !SERVICE_KEY || APPROVAL_SECRET.length < 32) {
    return failure("SERVICE_UNAVAILABLE", "Card intake is not configured.", 503, origin, true);
  }
  if (IDENTITY_HEADERS.some((header) => request.headers.has(header))) {
    return failure("SCOPE_OVERRIDE_REJECTED", "Caller identity headers are not accepted.", 400, origin);
  }
  const bearer = bearerToken(request.headers.get("authorization"));
  if (!bearer) return failure("AUTHENTICATION_REQUIRED", "Sign in to Proj OS first.", 401, origin);

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new CardContractError("VALIDATION_FAILED", "Expected a JSON object.");
    body = value as Record<string, unknown>;
  } catch (error) { return handleError(error, origin); }

  try {
    const { data: auth, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !auth.user) throw new ApiError("AUTHENTICATION_REQUIRED", "The Proj OS session is invalid.", 401);
    const userId = auth.user.id;
    switch (body.operation) {
      case "entitlement": return await entitlement(userId, body, origin);
      case "create_intake": return await createIntake(userId, body, origin);
      case "status": return await getStatus(userId, body, origin);
      case "process": return await processIntake(userId, body, origin);
      case "approval_preview": return await createApproval(userId, body, origin);
      case "execute": return await executeAction(userId, body, origin);
      default: throw new ApiError("VALIDATION_FAILED", "Unknown operation.", 400);
    }
  } catch (error) {
    if (!(error instanceof ApiError || error instanceof CardContractError || error instanceof OcrError)) {
      console.error("[crm-card-intake]", error instanceof Error ? error.message : "unknown error");
    }
    return handleError(error, origin);
  }
});

async function entitlement(userId: string, body: Record<string, unknown>, origin: string | null) {
  exactKeys(body, ["operation", "contractVersion", "projectId"]);
  version(body.contractVersion);
  const projectId = uuid(body.projectId, "projectId");
  const scope = await authorize(userId, projectId, "view");
  return json({ contractVersion: CRM_CARD_CONTRACT_VERSION, enabled: true, projectId: scope.projectId }, 200, origin);
}

async function createIntake(userId: string, raw: Record<string, unknown>, origin: string | null) {
  const input = parseCreateIntake(raw);
  const scope = await authorize(userId, input.projectId, "create");
  const idempotencyHash = await sha256Hex(input.idempotencyKey);
  const { data: existing, error: existingError } = await admin.from("crm_card_intakes").select("*")
    .eq("tenant_id", scope.tenantId).eq("user_id", userId).eq("project_id", input.projectId)
    .eq("idempotency_key_hash", idempotencyHash).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return await intakeUploadResponse(existing, origin, true);

  const intakeId = crypto.randomUUID();
  const extension = input.card.mediaType === "image/png" ? "png" : input.card.mediaType === "image/heic" ? "heic" : "jpg";
  const prefix = `${scope.tenantId}/${userId}/${intakeId}`;
  const row = {
    id: intakeId, tenant_id: scope.tenantId, user_id: userId, project_id: input.projectId,
    correlation_id: input.correlationId, idempotency_key_hash: idempotencyHash,
    front_object_path: `${prefix}/front.${extension}`,
    back_object_path: input.card.backSha256 ? `${prefix}/back.${extension}` : null,
    media_type: input.card.mediaType, front_sha256: input.card.frontSha256,
    back_sha256: input.card.backSha256 ?? null, source_context: input.sourceContext,
  };
  const { data, error } = await admin.from("crm_card_intakes").insert(row).select("*").single();
  if (error) throw error;
  await audit(scope, data.id, null, null, data.correlation_id, "intake_created", "allowed", {
    mediaType: data.media_type, hasBack: Boolean(data.back_object_path), frontSha256: data.front_sha256,
  });
  return await intakeUploadResponse(data, origin, false);
}

async function intakeUploadResponse(intake: Record<string, unknown>, origin: string | null, replayed: boolean) {
  if (intake.status !== "awaiting_upload") {
    return json({ contractVersion: CRM_CARD_CONTRACT_VERSION, intakeId: intake.id, state: intake.status, replayed }, 200, origin);
  }
  const [front, back] = await Promise.all([
    admin.storage.from(CRM_CARD_BUCKET).createSignedUploadUrl(String(intake.front_object_path)),
    intake.back_object_path ? admin.storage.from(CRM_CARD_BUCKET).createSignedUploadUrl(String(intake.back_object_path)) : Promise.resolve(null),
  ]);
  if (front.error || back?.error) throw new ApiError("SERVICE_UNAVAILABLE", "Secure upload could not be prepared.", 503, true);
  return json({
    contractVersion: CRM_CARD_CONTRACT_VERSION, intakeId: intake.id, correlationId: intake.correlation_id,
    state: intake.status, mediaType: intake.media_type, replayed,
    uploads: {
      front: { path: front.data.path, token: front.data.token },
      ...(back?.data ? { back: { path: back.data.path, token: back.data.token } } : {}),
    },
  }, 201, origin);
}

async function getStatus(userId: string, body: Record<string, unknown>, origin: string | null) {
  exactKeys(body, ["operation", "contractVersion", "intakeId"]); version(body.contractVersion);
  const intake = await scopedIntake(userId, uuid(body.intakeId, "intakeId"), "view");
  return json(publicIntake(intake), 200, origin);
}

async function processIntake(userId: string, body: Record<string, unknown>, origin: string | null) {
  exactKeys(body, ["operation", "contractVersion", "intakeId"]); version(body.contractVersion);
  const intake = await scopedIntake(userId, uuid(body.intakeId, "intakeId"), "create");
  if (["processed", "review_required", "completed"].includes(intake.status)) return json(publicIntake(intake), 200, origin);
  if (intake.status === "processing") throw new ApiError("ALREADY_PROCESSING", "This card is already being read.", 409, true);
  if (!inputPathIsScoped(intake.front_object_path, intake) || (intake.back_object_path && !inputPathIsScoped(intake.back_object_path, intake))) {
    throw new ApiError("SCOPE_MISMATCH", "Stored card path is outside the authorized scope.", 409);
  }
  await admin.from("crm_card_intakes").update({ status: "processing", failure_code: null, failure_message: null }).eq("id", intake.id);
  try {
    const images: CardImage[] = [];
    for (const [side, path, expectedHash] of [
      ["front", intake.front_object_path, intake.front_sha256],
      ["back", intake.back_object_path, intake.back_sha256],
    ] as const) {
      if (!path) continue;
      const { data, error } = await admin.storage.from(CRM_CARD_BUCKET).download(path);
      if (error || !data) throw new OcrError("unreadable", `The ${side} image has not been uploaded.`, true);
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (await sha256Hex(bytes) !== expectedHash) throw new OcrError("processing_error", `The ${side} image did not match its upload digest.`, false);
      images.push({ bytes, mediaType: intake.media_type, side });
    }
    const extraction = await extractBusinessCard(images);
    const fields = extraction.fields.map((field) => ({ ...field, reviewRequired: field.reviewRequired || fieldNeedsReview(field) }));
    const duplicates = await findDuplicates(intake.tenant_id, fields);
    const hasName = fields.some((field) => field.field === "name" && field.value.trim());
    const lowConfidence = fields.some((field) => field.reviewRequired);
    const state = !hasName || lowConfidence || duplicates.length ? "review_required" : "processed";
    const reviewReason = !hasName ? "missing_required_field" : duplicates.length ? "possible_duplicate" : lowConfidence ? "low_confidence" : null;
    const guidance = reviewReason === "possible_duplicate" ? "Choose whether to update or link the existing APAS CRM contact, or create a new contact."
      : reviewReason ? "Check the highlighted details against the card before continuing." : null;
    const update = {
      status: state, extracted_fields: fields, duplicate_candidates: duplicates,
      review_reason: reviewReason, guidance, processed_at: new Date().toISOString(),
      failure_code: null, failure_message: null, failure_retryable: null,
    };
    const { data, error } = await admin.from("crm_card_intakes").update(update).eq("id", intake.id).select("*").single();
    if (error) throw error;
    await audit(scopeOf(intake), intake.id, null, null, intake.correlation_id,
      state === "processed" ? "ocr_processed" : "ocr_review_required", "not_applicable",
      { provider: extraction.provider, model: extraction.model, fieldCount: fields.length, duplicateCount: duplicates.length });
    return json(publicIntake(data), 200, origin);
  } catch (error) {
    const failure = error instanceof OcrError ? error : new OcrError("processing_error", "The card could not be processed.", true);
    await admin.from("crm_card_intakes").update({
      status: "failed", failure_code: failure.code, failure_message: failure.message,
      failure_retryable: failure.retryable, processed_at: new Date().toISOString(),
    }).eq("id", intake.id);
    await audit(scopeOf(intake), intake.id, null, null, intake.correlation_id, "ocr_failed", "not_applicable", { code: failure.code, retryable: failure.retryable });
    throw failure;
  }
}

async function createApproval(userId: string, body: Record<string, unknown>, origin: string | null) {
  exactKeys(body, ["operation", "contractVersion", "intakeId", "correlationId", "idempotencyKey", "action", "sourceContext"]);
  version(body.contractVersion);
  const intake = await scopedIntake(userId, uuid(body.intakeId, "intakeId"), "create");
  if (!["processed", "review_required"].includes(intake.status)) throw new ApiError("INVALID_STATE", "Process and review this card first.", 409);
  const correlationId = uuid(body.correlationId, "correlationId");
  if (correlationId !== intake.correlation_id) throw new ApiError("SCOPE_MISMATCH", "Correlation does not match this intake.", 409);
  const action = normalizeAction(parseAction(body.action));
  const sourceContext = parseSourceContext(body.sourceContext ?? intake.source_context);
  const permission = action.kind === "create" ? "create" : "edit";
  const scope = await authorize(userId, intake.project_id, permission);
  if (action.targetContactId) await requireContact(scope.tenantId, action.targetContactId);
  const idempotencyHash = await sha256Hex(string(body.idempotencyKey, "idempotencyKey", 16, 200));
  const normalizedActionSha256 = await actionDigest(action, sourceContext);
  const { data: prior, error: priorError } = await admin.from("crm_contact_actions").select("*")
    .eq("tenant_id", scope.tenantId).eq("user_id", userId).eq("project_id", scope.projectId)
    .eq("idempotency_key_hash", idempotencyHash).maybeSingle();
  if (priorError) throw priorError;
  if (prior && prior.normalized_action_sha256 !== normalizedActionSha256) {
    throw new ApiError("IDEMPOTENCY_CONFLICT", "That idempotency key belongs to a different action.", 409);
  }
  const approvalId = prior?.id ?? crypto.randomUUID();
  const expiresAt = prior?.approval_expires_at ?? new Date(Date.now() + CRM_CARD_APPROVAL_TTL_SECONDS * 1000).toISOString();
  const claims: ApprovalClaims = {
    version: 1, approvalId, intakeId: intake.id, actorUserId: userId, tenantId: scope.tenantId,
    projectId: scope.projectId, normalizedActionSha256, expiresAt,
  };
  const approvalToken = await signApproval(claims, APPROVAL_SECRET);
  if (!prior) {
    const row = {
      id: approvalId, intake_id: intake.id, tenant_id: scope.tenantId, user_id: userId, project_id: scope.projectId,
      correlation_id: correlationId, idempotency_key_hash: idempotencyHash, action_kind: action.kind,
      target_contact_id: action.targetContactId ?? null, reviewed_fields: action.reviewedFields, source_context: sourceContext,
      normalized_action_sha256: normalizedActionSha256, approval_token_sha256: await sha256Hex(approvalToken), approval_expires_at: expiresAt,
    };
    const { error } = await admin.from("crm_contact_actions").insert(row); if (error) throw error;
    await audit(scope, intake.id, approvalId, action.targetContactId ?? null, correlationId, "approval_created", "not_applicable", {
      actionKind: action.kind, normalizedActionSha256, expiresAt,
    });
  }
  return json({
    contractVersion: CRM_CARD_CONTRACT_VERSION, state: prior?.status ?? "approval_required", approvalId,
    intakeId: intake.id, correlationId, normalizedActionSha256, approvalToken, expiresAt,
    preview: actionPreview(action), replayed: Boolean(prior),
  }, 200, origin);
}

async function executeAction(userId: string, body: Record<string, unknown>, origin: string | null) {
  exactKeys(body, ["operation", "contractVersion", "approvalId", "approvalToken"]); version(body.contractVersion);
  const approvalId = uuid(body.approvalId, "approvalId");
  const token = string(body.approvalToken, "approvalToken", 40, 4_000);
  let claims: ApprovalClaims;
  try { claims = await verifyApproval(token, APPROVAL_SECRET); }
  catch { throw new ApiError("APPROVAL_INVALID", "This approval is invalid or expired. Review the action again.", 403); }
  if (claims.approvalId !== approvalId || claims.actorUserId !== userId) throw new ApiError("APPROVAL_INVALID", "This approval belongs to a different action or user.", 403);
  const { data: action, error } = await admin.from("crm_contact_actions").select("*").eq("id", approvalId).maybeSingle();
  if (error) throw error;
  if (!action || action.user_id !== userId || action.tenant_id !== claims.tenantId || action.project_id !== claims.projectId
    || action.intake_id !== claims.intakeId || action.normalized_action_sha256 !== claims.normalizedActionSha256) {
    throw new ApiError("APPROVAL_INVALID", "The approval no longer matches the requested action.", 403);
  }
  await authorize(userId, action.project_id, action.action_kind === "create" ? "create" : "edit");
  const tokenHash = await sha256Hex(token);
  if (tokenHash !== action.approval_token_sha256) throw new ApiError("APPROVAL_INVALID", "The approval token does not match.", 403);
  const { data: result, error: rpcError } = await admin.rpc("execute_crm_card_action", {
    p_action_id: approvalId, p_actor_user_id: userId, p_approval_token_sha256: tokenHash,
  });
  if (rpcError) {
    await audit(scopeOf(action), action.intake_id, action.id, action.target_contact_id, action.correlation_id, "action_failed", "denied", { code: "APPROVAL_INVALID" });
    throw new ApiError("APPROVAL_INVALID", "The approved action could not be completed. Review it again.", 409);
  }
  const intake = await scopedIntake(userId, action.intake_id, "view");
  const paths = [intake.front_object_path, intake.back_object_path].filter(Boolean);
  if (paths.length) {
    const { error: cleanupError } = await admin.storage.from(CRM_CARD_BUCKET).remove(paths);
    if (cleanupError) console.warn("[crm-card-intake] completed source-image cleanup will need retry", intake.id);
  }
  return json({
    contractVersion: CRM_CARD_CONTRACT_VERSION, state: "completed", intakeId: action.intake_id,
    correlationId: action.correlation_id, completedAt: new Date().toISOString(), replayed: Boolean(result.replayed),
    identity: { system: "apas-platform", tenantExternalId: action.tenant_id, contactExternalId: result.contactId,
      projectDirectoryLinkExternalId: result.directoryEntryId },
  }, 200, origin);
}

async function authorize(userId: string, projectId: string, action: "view" | "create" | "edit"): Promise<Scope> {
  const [{ data: profile, error: profileError }, { data: access, error: accessError }, { data: permission, error: permissionError }] = await Promise.all([
    admin.from("profiles").select("workspace_id, status").eq("user_id", userId).maybeSingle(),
    admin.rpc("can_access_project", { _user_id: userId, _project_id: projectId }),
    admin.rpc("effective_project_permission", { _user_id: userId, _project_id: projectId, _module: "people", _action: action }),
  ]);
  if (profileError || accessError || permissionError) throw new ApiError("SERVICE_UNAVAILABLE", "Access could not be checked.", 503, true);
  if (!profile?.workspace_id || (profile.status && profile.status !== "active") || !access || !permission) {
    throw new ApiError("PERMISSION_DENIED", "This project is not available.", 404);
  }
  const { data: enabled, error } = await admin.from("crm_card_scan_entitlements").select("id")
    .eq("tenant_id", profile.workspace_id).eq("user_id", userId).eq("project_id", projectId).eq("status", "enabled").maybeSingle();
  if (error) throw new ApiError("SERVICE_UNAVAILABLE", "Card-scan enrollment could not be checked.", 503, true);
  if (!enabled) throw new ApiError("FEATURE_DISABLED", "Business-card scan is not enabled for this project.", 403);
  return { userId, tenantId: profile.workspace_id, projectId };
}

async function scopedIntake(userId: string, intakeId: string, permission: "view" | "create") {
  const { data, error } = await admin.from("crm_card_intakes").select("*").eq("id", intakeId).eq("user_id", userId).maybeSingle();
  if (error) throw error; if (!data) throw new ApiError("NOT_FOUND", "Card intake not found.", 404);
  const scope = await authorize(userId, data.project_id, permission);
  if (scope.tenantId !== data.tenant_id) throw new ApiError("SCOPE_MISMATCH", "Card intake is outside the current workspace.", 404);
  return data;
}

async function findDuplicates(tenantId: string, fields: ExtractedCardField[]) {
  const field = (name: ExtractedCardField["field"]) => fields.find((entry) => entry.field === name)?.value;
  const email = normalizeEmail(field("email")); const phone = normalizePhone(field("phone"));
  const name = normalizeName(field("name")); const org = normalizeName(field("organization"));
  const website = normalizeWebsite(field("website"));
  const { data, error } = await admin.from("crm_contacts")
    .select("id, first_name, last_name, company_name, email, phone, mobile, website")
    .eq("workspace_id", tenantId).eq("is_active", true).limit(500);
  if (error) throw error;
  return (data ?? []).flatMap((contact) => {
    const matchedOn: string[] = []; let score = 0;
    if (email && email === normalizeEmail(contact.email)) { matchedOn.push("email"); score = Math.max(score, 1); }
    const candidatePhones = [normalizePhone(contact.phone), normalizePhone(contact.mobile)].filter(Boolean);
    if (phone && candidatePhones.includes(phone)) { matchedOn.push("phone"); score = Math.max(score, 0.98); }
    const candidateName = normalizeName(`${contact.first_name ?? ""} ${contact.last_name ?? ""}`);
    if (name && name === candidateName) { matchedOn.push("name"); score += 0.55; }
    if (org && org === normalizeName(contact.company_name)) { matchedOn.push("organization"); score += 0.3; }
    if (website && website === normalizeWebsite(contact.website)) { matchedOn.push("website"); score += 0.75; }
    if (!matchedOn.length || Math.min(score, 1) < 0.55) return [];
    return [{ apasContactExternalId: contact.id, displayName: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || contact.company_name || "APAS CRM contact",
      matchScore: Math.min(score, 1), matchedOn, safePreview: { company: contact.company_name ?? "", email: contact.email ?? "", phone: contact.phone ?? contact.mobile ?? "" } }];
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

function fieldNeedsReview(field: ExtractedCardField) {
  if (field.field === "email") return normalizeEmail(field.value) === null;
  if (field.field === "phone") return normalizePhone(field.value) === null;
  if (field.field === "website") return normalizeWebsite(field.value) === null;
  return false;
}

function normalizeAction(action: ActionInput): ActionInput {
  return { ...action, reviewedFields: {
    ...action.reviewedFields,
    ...(action.reviewedFields.email ? { email: normalizeEmail(action.reviewedFields.email) ?? action.reviewedFields.email } : {}),
    ...(action.reviewedFields.phone ? { phone: normalizePhone(action.reviewedFields.phone) ?? action.reviewedFields.phone } : {}),
    ...(action.reviewedFields.mobile ? { mobile: normalizePhone(action.reviewedFields.mobile) ?? action.reviewedFields.mobile } : {}),
    ...(action.reviewedFields.website ? { website: normalizeWebsite(action.reviewedFields.website) ?? action.reviewedFields.website } : {}),
  } };
}

async function requireContact(tenantId: string, contactId: string) {
  const { data, error } = await admin.from("crm_contacts").select("id").eq("id", contactId).eq("workspace_id", tenantId).eq("is_active", true).maybeSingle();
  if (error) throw error; if (!data) throw new ApiError("NOT_FOUND", "The selected APAS CRM contact was not found.", 404);
}

function publicIntake(intake: PublicIntakeRow) {
  return { contractVersion: CRM_CARD_CONTRACT_VERSION, intakeId: intake.id, correlationId: intake.correlation_id,
    state: intake.status, fields: intake.extracted_fields ?? [], duplicateCandidates: intake.duplicate_candidates ?? [],
    ...(intake.review_reason ? { reason: intake.review_reason, guidance: intake.guidance } : {}),
    ...(intake.failure_code ? { failureCode: intake.failure_code, message: intake.failure_message, retryable: intake.failure_retryable } : {}),
    processedAt: intake.processed_at };
}
function actionPreview(action: ActionInput) {
  const name = [action.reviewedFields.firstName, action.reviewedFields.lastName].filter(Boolean).join(" ");
  if (action.kind === "create") return { title: "Create APAS CRM contact", summary: `Create ${name || "this contact"} and link them to this project.`, action };
  if (action.kind === "update") return { title: "Update APAS CRM contact", summary: `Update ${name || "the selected contact"} and link them to this project.`, action };
  return { title: "Link existing APAS CRM contact", summary: "Link the selected existing contact to this project without changing their contact details.", action };
}
async function audit(scope: Scope, intakeId: string | null, actionId: string | null, contactId: string | null, correlationId: string,
  eventType: string, decision: string, details: Record<string, unknown>) {
  const { error } = await admin.from("crm_card_audit_events").insert({ tenant_id: scope.tenantId, user_id: scope.userId,
    project_id: scope.projectId, intake_id: intakeId, action_id: actionId, contact_id: contactId,
    correlation_id: correlationId, event_type: eventType, decision, details });
  if (error) throw new ApiError("AUDIT_FAILED", "The operation could not be safely audited.", 500);
}
function scopeOf(row: ScopedDatabaseRow): Scope { return { userId: row.user_id, tenantId: row.tenant_id, projectId: row.project_id }; }
function inputPathIsScoped(path: string, intake: ScopedDatabaseRow) { return path.startsWith(`${intake.tenant_id}/${intake.user_id}/${intake.id}/`); }
function exactKeys(body: Record<string, unknown>, keys: string[]) { const extra = Object.keys(body).find((key) => !keys.includes(key)); if (extra) throw new ApiError("VALIDATION_FAILED", `Unexpected field: ${extra}.`, 400); }
function version(value: unknown) { if (value !== CRM_CARD_CONTRACT_VERSION) throw new ApiError("VALIDATION_FAILED", "Unsupported contract version.", 400); }
function uuid(value: unknown, label: string) { const v = string(value, label, 36, 36); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) throw new ApiError("VALIDATION_FAILED", `${label} must be a UUID.`, 400); return v; }
function string(value: unknown, label: string, min: number, max: number) { if (typeof value !== "string" || value.length < min || value.length > max) throw new ApiError("VALIDATION_FAILED", `Invalid ${label}.`, 400); return value; }
function bearerToken(header: string | null) { const match = header?.match(/^Bearer\s+(.+)$/i); return match?.[1] ?? null; }
class ApiError extends Error { constructor(readonly code: string, message: string, readonly status: number, readonly retryable = false) { super(message); } }
function handleError(error: unknown, origin: string | null) {
  if (error instanceof ApiError || error instanceof CardContractError) return failure(error.code, error.message, error.status, origin, "retryable" in error ? Boolean(error.retryable) : false);
  if (error instanceof OcrError) return failure(error.code.toUpperCase(), error.message, error.code === "unsupported_image" ? 415 : 422, origin, error.retryable);
  return failure("INTERNAL_ERROR", "Proj OS could not complete card intake.", 500, origin, true);
}
function responseHeaders(origin: string | null) { return { "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" }; }
function json(value: unknown, status: number, origin: string | null) { return new Response(JSON.stringify(value), { status, headers: { ...responseHeaders(origin), "Content-Type": "application/json" } }); }
function failure(code: string, message: string, status: number, origin: string | null = null, retryable = false) { return json({ contractVersion: CRM_CARD_CONTRACT_VERSION, error: { code, message, retryable }, correlationId: crypto.randomUUID() }, status, origin); }
