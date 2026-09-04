import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ApasCrmError,
  CRM_CONTRACT_VERSION,
  MAX_JSON_BYTES,
  createContactIntake,
  getCategories,
  getContactIntake,
  hmacHex,
  requestUploadGrants,
  safeFailure,
  sha256Hex,
  submitContactProposal,
  validateUploadDescriptors,
  type UploadDescriptor,
} from "../_shared/apas-crm-integration.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Json = Record<string, unknown>;
type Scope = {
  userId: string;
  workspaceId: string;
  projectId: string;
  displayName: string;
  userDb: SupabaseClient;
  admin: SupabaseClient;
};

class GatewayError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

const encoder = new TextEncoder();

function json(body: unknown, status = 200, correlationId?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(correlationId ? { "x-correlation-id": correlationId } : {}),
    },
  });
}

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new GatewayError("invalid_request", `${field} is required`, 400);
  }
  return value.trim();
}

function optionalString(value: unknown, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new GatewayError("invalid_request", "One or more fields are invalid", 400);
  return value.trim() || null;
}

function uuid(value: unknown, field: string): string {
  const text = requiredString(value, field, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new GatewayError("invalid_request", `${field} is invalid`, 400);
  }
  return text;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cleanContext(value: unknown): { shared: Json; privateContext: Json } {
  const input = isRecord(value) ? value : {};
  const shared: Json = {};
  const privateContext: Json = {};
  const sharedFields: Array<[string, number]> = [
    ["whereMet", 300], ["whenMet", 80], ["eventOrLocation", 300],
    ["introducer", 240], ["websiteOrSource", 500], ["followUp", 1_000],
  ];
  for (const [field, max] of sharedFields) {
    const cleaned = optionalString(input[field], max);
    if (cleaned) shared[field] = cleaned;
  }
  const privateNotes = optionalString(input.projectPrivateNotes, 5_000);
  if (privateNotes) privateContext.projectPrivateNotes = privateNotes;
  return { shared, privateContext };
}

function cleanPromotedSource(value: unknown): Json {
  if (!isRecord(value)) return {};
  const allowed: Array<[string, number]> = [
    ["whereMet", 300], ["whenMet", 80], ["eventOrLocation", 300],
    ["introducer", 240], ["notes", 2_000], ["websiteOrSource", 500], ["followUp", 1_000],
  ];
  const out: Json = {};
  for (const [field, max] of allowed) {
    const cleaned = optionalString(value[field], max);
    if (cleaned) out[field] = cleaned;
  }
  return out;
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new GatewayError("invalid_request", "One or more list fields are invalid", 400);
  return [...new Set(value.map((item) => requiredString(item, "list item", maxLength)))];
}

function cleanProposal(value: unknown): Json {
  if (!isRecord(value)) throw new GatewayError("invalid_proposal", "The contact proposal is required", 400);
  const contactInput = isRecord(value.contact) ? value.contact : {};
  const contact: Json = {};
  const contactFields: Array<[string, number]> = [
    ["firstName", 160], ["lastName", 160], ["displayName", 300], ["jobTitle", 240],
    ["companyName", 300], ["email", 320], ["phone", 80], ["mobile", 80],
    ["website", 500], ["address", 1_000],
  ];
  for (const [field, max] of contactFields) {
    const cleaned = optionalString(contactInput[field], max);
    if (cleaned) contact[field] = cleaned;
  }
  if (!contact.displayName && !contact.firstName && !contact.companyName) {
    throw new GatewayError("invalid_proposal", "Enter a contact or company name", 400);
  }
  const duplicateDecision = requiredString(value.duplicateDecision, "Duplicate decision", 40);
  if (!["create", "update", "link", "keep_separate"].includes(duplicateDecision)) {
    throw new GatewayError("invalid_proposal", "Choose how possible matches should be handled", 400);
  }
  const duplicateContactId = optionalString(value.duplicateContactId, 200);
  if (["update", "link"].includes(duplicateDecision) && !duplicateContactId) {
    throw new GatewayError("invalid_proposal", "Select the APAS CRM match for this decision", 400);
  }
  return {
    contact,
    duplicateDecision,
    ...(duplicateContactId ? { duplicateContactId } : {}),
    requestedCategoryIds: cleanStringList(value.requestedCategoryIds, 20, 200),
    catalogVersion: requiredString(value.catalogVersion, "Category catalog version", 200),
    projectRole: optionalString(value.projectRole, 200),
    promotedSourceContext: cleanPromotedSource(value.promotedSourceContext),
  };
}

async function authenticate(req: Request, projectIdValue: unknown): Promise<Scope> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new GatewayError("service_not_configured", "Proj OS integration service is not configured", 503);
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization) throw new GatewayError("authentication_required", "Authentication required", 401);
  const userDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });
  const { data: auth } = await userDb.auth.getUser();
  if (!auth.user) throw new GatewayError("authentication_required", "Authentication required", 401);
  const projectId = uuid(projectIdValue, "projectId");
  const { data: allowed, error: accessError } = await userDb.rpc("can_access_project", {
    _user_id: auth.user.id,
    _project_id: projectId,
  });
  if (accessError || allowed !== true) throw new GatewayError("project_not_found", "Project not found or not authorized", 404);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [{ data: project }, { data: profile }] = await Promise.all([
    admin.from("projects").select("id,workspace_id,deleted_at").eq("id", projectId).maybeSingle(),
    admin.from("profiles").select("workspace_id,full_name,email,status").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (!project || project.deleted_at || !project.workspace_id || project.workspace_id !== profile?.workspace_id || (profile?.status && profile.status !== "active")) {
    throw new GatewayError("project_not_found", "Project not found or not authorized", 404);
  }
  const { data: moduleRow } = await admin.from("workspace_modules")
    .select("apas_crm_integration_enabled,platform_apas_crm_integration")
    .eq("workspace_id", project.workspace_id).maybeSingle();
  if (!moduleRow || moduleRow.apas_crm_integration_enabled !== true || moduleRow.platform_apas_crm_integration === false) {
    throw new GatewayError("module_not_enabled", "APAS CRM integration is not enabled for this workspace", 403);
  }
  return {
    userId: auth.user.id,
    workspaceId: project.workspace_id,
    projectId,
    displayName: profile?.full_name || profile?.email || auth.user.email || "Proj OS user",
    userDb,
    admin,
  };
}

async function requireIntake(scope: Scope, intakeIdValue: unknown): Promise<Json> {
  const intakeId = uuid(intakeIdValue, "intakeId");
  const { data, error } = await scope.admin.from("crm_integration_intakes")
    .select("*")
    .eq("id", intakeId)
    .eq("tenant_id", scope.workspaceId)
    .eq("project_id", scope.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new GatewayError("intake_not_found", "Contact intake not found", 404);
  return data as Json;
}

async function audit(scope: Scope, intake: Json, action: string, details: Json = {}) {
  const { error } = await scope.admin.from("crm_integration_audit_log").insert({
    tenant_id: scope.workspaceId,
    project_id: scope.projectId,
    intake_id: intake.id,
    actor_user_id: scope.userId,
    actor_type: "user",
    action,
    correlation_id: intake.correlation_id,
    external_intake_id: intake.external_intake_id ?? null,
    details,
  });
  if (error) throw error;
}

async function markFailure(scope: Scope, intake: Json, error: unknown) {
  const failure = safeFailure(error);
  const nextRetry = failure.retryable ? new Date(Date.now() + 5 * 60_000).toISOString() : null;
  await scope.admin.from("crm_integration_intakes").update({
    status: "retry_queued",
    retryable: failure.retryable,
    next_retry_at: nextRetry,
    safe_failure_code: failure.code,
    safe_failure_reason: failure.reason,
  }).eq("id", intake.id);
  await audit(scope, intake, "integration_failed_safely", { code: failure.code, retryable: failure.retryable });
  return failure;
}

function remoteContext(intake: Json) {
  return {
    workspaceId: String(intake.tenant_id),
    correlationId: String(intake.correlation_id),
    idempotencyKey: String(intake.idempotency_key),
  };
}

async function startIntake(scope: Scope, body: Json) {
  const uploads = validateUploadDescriptors(body.uploads);
  const context = cleanContext(body.sourceContext);
  const clientRequestId = requiredString(body.clientRequestId, "clientRequestId", 200);
  const idempotencyKey = await sha256Hex(`${scope.workspaceId}:${scope.projectId}:${scope.userId}:${clientRequestId}`);
  const { data: existing } = await scope.admin.from("crm_integration_intakes").select("*")
    .eq("tenant_id", scope.workspaceId).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) {
    const intake = existing as Json;
    if (intake.external_intake_id) {
      return {
        intakeId: intake.id,
        correlationId: intake.correlation_id,
        grants: [],
        idempotentReplay: true,
        alreadySubmitted: true,
        status: intake.status,
        remoteStatus: intake.current_remote_status,
        reviewPayload: intake.review_payload ?? {},
      };
    }
    return continueUploads(scope, intake, uploads, true);
  }

  const intakeId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const envelope: Json = {
    sourceSystem: "proj_os",
    workspaceId: scope.workspaceId,
    projectId: scope.projectId,
    userId: scope.userId,
    displayNameSnapshot: scope.displayName,
    intakeActionId: intakeId,
    correlationId,
    idempotencyKey,
    submittedAt,
  };
  const signingSecret = Deno.env.get("APAS_CRM_SOURCE_SIGNING_SECRET") ?? "";
  if (signingSecret.length < 32) throw new GatewayError("integration_not_configured", "CRM source signing is not configured", 503);
  const sourceSignature = await hmacHex(signingSecret, canonicalJson(envelope));
  const { data: intake, error } = await scope.admin.from("crm_integration_intakes").insert({
    id: intakeId,
    tenant_id: scope.workspaceId,
    project_id: scope.projectId,
    submitter_user_id: scope.userId,
    source_contract_version: CRM_CONTRACT_VERSION,
    status: "uploading_securely",
    correlation_id: correlationId,
    idempotency_key: idempotencyKey,
    source_envelope: envelope,
    source_signature: sourceSignature,
    source_context: context.shared,
    project_private_context: context.privateContext,
    upload_refs: uploads,
  }).select("*").single();
  if (error || !intake) throw error || new GatewayError("intake_create_failed", "Could not create the intake", 500);
  await audit(scope, intake as Json, "intake_created", { upload_sides: uploads.map((upload) => upload.side) });
  return continueUploads(scope, intake as Json, uploads, false);
}

async function continueUploads(scope: Scope, intake: Json, uploads: UploadDescriptor[], idempotentReplay: boolean) {
  try {
    const grants = await requestUploadGrants(remoteContext(intake), uploads, {
      ...(intake.source_envelope as Json),
      signature: intake.source_signature,
      signatureAlgorithm: "hmac-sha256",
    });
    const stored = grants.map((grant) => ({ uploadId: grant.uploadId, side: grant.side, expiresAt: grant.expiresAt }));
    await scope.admin.from("crm_integration_intakes").update({
      status: "uploading_securely", upload_refs: stored, retryable: false,
      safe_failure_code: null, safe_failure_reason: null, next_retry_at: null,
    }).eq("id", intake.id);
    await audit(scope, intake, "secure_upload_grants_issued", { upload_sides: stored.map((grant) => grant.side) });
    return { intakeId: intake.id, correlationId: intake.correlation_id, grants, idempotentReplay };
  } catch (error) {
    const failure = await markFailure(scope, intake, error);
    throw new GatewayError(failure.code, failure.reason, failure.status);
  }
}

async function completeUpload(scope: Scope, body: Json) {
  const intake = await requireIntake(scope, body.intakeId);
  if (intake.submitter_user_id !== scope.userId) throw new GatewayError("forbidden", "Only the submitter can complete this card upload", 403);
  const uploadRefs = Array.isArray(intake.upload_refs) ? intake.upload_refs : [];
  if (uploadRefs.length < 1 || uploadRefs.some((ref) => !isRecord(ref) || !ref.uploadId)) {
    throw new GatewayError("upload_not_ready", "Secure card uploads are not ready", 409);
  }
  try {
    await scope.admin.from("crm_integration_intakes").update({ status: "reading_card" }).eq("id", intake.id);
    const result = await createContactIntake(remoteContext(intake), {
      contractVersion: CRM_CONTRACT_VERSION,
      uploadIds: uploadRefs.map((ref) => ({ side: ref.side, uploadId: ref.uploadId })),
      source: {
        ...(intake.source_envelope as Json),
        signature: intake.source_signature,
        signatureAlgorithm: "hmac-sha256",
      },
    });
    const candidates = Array.isArray(result.reviewPayload.duplicateCandidates)
      ? result.reviewPayload.duplicateCandidates.length
      : 0;
    const status = candidates > 0 ? "possible_matches_found" : "review_uncertain_fields";
    await scope.admin.from("crm_integration_intakes").update({
      external_intake_id: result.externalId,
      current_remote_status: result.status,
      review_payload: result.reviewPayload,
      status,
      submitted_at: new Date().toISOString(),
      retryable: false,
      safe_failure_code: null,
      safe_failure_reason: null,
      next_retry_at: null,
    }).eq("id", intake.id);
    await audit(scope, { ...intake, external_intake_id: result.externalId }, "intake_sent_to_apas_crm", { remote_status: result.status });
    return { intakeId: intake.id, status, remoteStatus: result.status, reviewPayload: result.reviewPayload };
  } catch (error) {
    const failure = await markFailure(scope, intake, error);
    throw new GatewayError(failure.code, failure.reason, failure.status);
  }
}

async function categories(scope: Scope) {
  const context = { workspaceId: scope.workspaceId, correlationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() };
  return getCategories(context);
}

async function prepareApproval(scope: Scope, body: Json) {
  const intake = await requireIntake(scope, body.intakeId);
  if (intake.submitter_user_id !== scope.userId) throw new GatewayError("forbidden", "Only the submitter can approve this contact proposal", 403);
  if (!intake.external_intake_id) throw new GatewayError("intake_not_ready", "The card must finish processing before approval", 409);
  const proposal = cleanProposal(body.proposal);
  const catalog = await getCategories(remoteContext(intake));
  if (proposal.catalogVersion !== catalog.catalogVersion) {
    throw new GatewayError("category_catalog_changed", "The APAS CRM category catalog changed. Review the categories again.", 409);
  }
  const validIds = new Set(catalog.categories.filter((item) => item.active).map((item) => item.id));
  if ((proposal.requestedCategoryIds as string[]).some((id) => !validIds.has(id))) {
    throw new GatewayError("invalid_category", "One or more APAS CRM categories are no longer available", 409);
  }
  const proposalHash = await sha256Hex(canonicalJson(proposal));
  const rawToken = randomToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await scope.admin.from("crm_integration_approvals").update({ status: "revoked" })
    .eq("intake_id", intake.id).eq("actor_user_id", scope.userId).eq("status", "pending");
  const { data: approval, error } = await scope.admin.from("crm_integration_approvals").insert({
    tenant_id: scope.workspaceId,
    project_id: scope.projectId,
    intake_id: intake.id,
    actor_user_id: scope.userId,
    token_hash: tokenHash,
    proposal_hash: proposalHash,
    approved_payload: proposal,
    expires_at: expiresAt,
  }).select("id").single();
  if (error || !approval) throw error || new GatewayError("approval_failed", "Could not prepare approval", 500);
  await scope.admin.from("crm_integration_intakes").update({ status: "waiting_proj_os_approval" }).eq("id", intake.id);
  await audit(scope, intake, "exact_proposal_approval_prepared", { proposal_hash: proposalHash, expires_at: expiresAt });
  return { approvalId: approval.id, approvalToken: rawToken, proposalHash, expiresAt, exactPreview: proposal };
}

async function executeApproval(scope: Scope, body: Json) {
  const intake = await requireIntake(scope, body.intakeId);
  const approvalId = uuid(body.approvalId, "approvalId");
  const approvalToken = requiredString(body.approvalToken, "approvalToken", 500);
  const proposalHash = requiredString(body.proposalHash, "proposalHash", 128);
  const tokenHash = await sha256Hex(approvalToken);
  const { data, error } = await scope.admin.rpc("consume_crm_integration_approval", {
    p_approval_id: approvalId,
    p_token_hash: tokenHash,
    p_actor_user_id: scope.userId,
    p_proposal_hash: proposalHash,
  });
  if (error) throw new GatewayError("approval_rejected", "The approval is invalid, expired, replayed, or no longer matches this proposal", 409);
  const consumed = Array.isArray(data) ? data[0] : data;
  if (!consumed || consumed.intake_id !== intake.id) {
    throw new GatewayError("approval_rejected", "The approval is invalid, expired, replayed, or no longer matches this proposal", 409);
  }
  try {
    const result = await submitContactProposal(remoteContext(intake), String(intake.external_intake_id), {
      contractVersion: CRM_CONTRACT_VERSION,
      proposal: consumed.approved_payload,
      proposalHash: consumed.proposal_hash,
      source: {
        ...(intake.source_envelope as Json),
        signature: intake.source_signature,
        signatureAlgorithm: "hmac-sha256",
      },
    });
    await scope.admin.from("crm_integration_intakes").update({
      status: "waiting_crm_review",
      current_remote_status: result.status,
      review_payload: result.reviewPayload,
      canonical_apas_contact_id: result.canonicalContactId ?? null,
      retryable: false,
      next_retry_at: null,
      safe_failure_code: null,
      safe_failure_reason: null,
    }).eq("id", intake.id);
    await audit(scope, intake, "approved_proposal_sent", { proposal_hash: consumed.proposal_hash, remote_status: result.status });
    return { intakeId: intake.id, status: "waiting_crm_review", remoteStatus: result.status };
  } catch (error) {
    const failure = await markFailure(scope, { ...intake, approved_proposal: consumed.approved_payload }, error);
    throw new GatewayError(failure.code, failure.reason, failure.status);
  }
}

async function refreshStatus(scope: Scope, body: Json) {
  const intake = await requireIntake(scope, body.intakeId);
  if (!intake.external_intake_id) throw new GatewayError("intake_not_ready", "The intake has not reached APAS CRM", 409);
  try {
    const result = await getContactIntake(remoteContext(intake), String(intake.external_intake_id));
    const nextStatus = intake.status === "waiting_crm_review"
      ? "waiting_crm_review"
      : Array.isArray(result.reviewPayload.duplicateCandidates) && result.reviewPayload.duplicateCandidates.length > 0
        ? "possible_matches_found"
        : "review_uncertain_fields";
    await scope.admin.from("crm_integration_intakes").update({
      status: nextStatus,
      current_remote_status: result.status,
      review_payload: result.reviewPayload,
      retryable: false,
      next_retry_at: null,
      safe_failure_code: null,
      safe_failure_reason: null,
    }).eq("id", intake.id);
    return { intakeId: intake.id, status: nextStatus, remoteStatus: result.status, reviewPayload: result.reviewPayload };
  } catch (error) {
    const failure = await markFailure(scope, intake, error);
    throw new GatewayError(failure.code, failure.reason, failure.status);
  }
}

async function retry(scope: Scope, body: Json) {
  const intake = await requireIntake(scope, body.intakeId);
  if (intake.status !== "retry_queued") throw new GatewayError("retry_not_available", "This intake is not waiting for retry", 409);
  await scope.admin.from("crm_integration_intakes").update({
    retry_count: Number(intake.retry_count ?? 0) + 1,
    retryable: false,
    next_retry_at: null,
  }).eq("id", intake.id);
  const refs = Array.isArray(intake.upload_refs) ? intake.upload_refs : [];
  if (!intake.external_intake_id && refs.length && refs.every((ref) => isRecord(ref) && ref.fileName && ref.contentType && ref.size)) {
    return continueUploads(scope, intake, validateUploadDescriptors(refs), true);
  }
  if (!intake.external_intake_id) {
    return completeUpload(scope, { intakeId: intake.id });
  }
  if (isRecord(intake.approved_proposal) && intake.proposal_hash) {
    try {
      const result = await submitContactProposal(remoteContext(intake), String(intake.external_intake_id), {
        contractVersion: CRM_CONTRACT_VERSION,
        proposal: intake.approved_proposal,
        proposalHash: intake.proposal_hash,
        source: {
          ...(intake.source_envelope as Json),
          signature: intake.source_signature,
          signatureAlgorithm: "hmac-sha256",
        },
      });
      await scope.admin.from("crm_integration_intakes").update({
        status: "waiting_crm_review", current_remote_status: result.status,
        retryable: false, safe_failure_code: null, safe_failure_reason: null,
      }).eq("id", intake.id);
      await audit(scope, intake, "approved_proposal_retry_succeeded", { proposal_hash: intake.proposal_hash });
      return { intakeId: intake.id, status: "waiting_crm_review", remoteStatus: result.status };
    } catch (error) {
      const failure = await markFailure(scope, intake, error);
      throw new GatewayError(failure.code, failure.reason, failure.status);
    }
  }
  return refreshStatus(scope, { intakeId: intake.id });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const requestCorrelation = req.headers.get("x-correlation-id") || crypto.randomUUID();
  try {
    if (req.method !== "POST") throw new GatewayError("method_not_allowed", "Method not allowed", 405);
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_JSON_BYTES) throw new GatewayError("payload_too_large", "Request is too large", 413);
    const text = await req.text();
    if (encoder.encode(text).byteLength > MAX_JSON_BYTES) throw new GatewayError("payload_too_large", "Request is too large", 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new GatewayError("invalid_json", "Invalid JSON", 400); }
    if (!isRecord(body)) throw new GatewayError("invalid_request", "Invalid request", 400);
    const operation = requiredString(body.operation, "operation", 80);
    const scope = await authenticate(req, body.projectId);
    let result: unknown;
    switch (operation) {
      case "start_intake": result = await startIntake(scope, body); break;
      case "complete_upload": result = await completeUpload(scope, body); break;
      case "categories": result = await categories(scope); break;
      case "prepare_approval": result = await prepareApproval(scope, body); break;
      case "execute_approval": result = await executeApproval(scope, body); break;
      case "refresh_status": result = await refreshStatus(scope, body); break;
      case "retry": result = await retry(scope, body); break;
      default: throw new GatewayError("unknown_operation", "Unknown operation", 404);
    }
    return json({ ok: true, data: result }, 200, requestCorrelation);
  } catch (error) {
    const safe = error instanceof GatewayError
      ? { code: error.code, reason: error.message, status: error.status }
      : error instanceof ApasCrmError
        ? { code: error.code, reason: error.message, status: error.status }
        : { code: "internal_error", reason: "The CRM integration failed safely", status: 500 };
    console.error("[crm-integration-gateway]", requestCorrelation, safe.code);
    return json({ ok: false, error: safe.code, message: safe.reason, correlationId: requestCorrelation }, safe.status, requestCorrelation);
  }
});
