import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CONTRACT_VERSION = "crm-integration.v1";
const MAX_JSON_BYTES = 1_000_000;
const PROJECT_ROLES = new Set([
  "client", "owner", "vendor", "subcontractor", "consultant",
  "property_manager", "inspector", "regulator", "utility", "other",
]);

type Json = Record<string, unknown>;
type Identity = {
  organizationId: string;
  workspaceId: string;
  actorUserId: string;
  scopes: Set<string>;
  correlationId: string;
  idempotencyKey?: string;
};

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

const encoder = new TextEncoder();
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function required(value: unknown, field: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new HttpError(400, "invalid_request", `${field} is required`);
  }
  return value.trim();
}

function optional(value: unknown, field: string, max = 500): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) {
    throw new HttpError(400, "invalid_request", `${field} is invalid`);
  }
  return value.trim() || undefined;
}

function uuid(value: unknown, field: string): string {
  const text = required(value, field, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new HttpError(400, "invalid_request", `${field} is invalid`);
  }
  return text;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacBytes(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function response(body: unknown, status = 200, correlationId?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(correlationId ? { "x-correlation-id": correlationId } : {}),
    },
  });
}

function normalizedPath(request: Request): string {
  const path = new URL(request.url).pathname;
  const marker = path.indexOf("/v1/");
  if (marker >= 0) return path.slice(marker);
  return path.endsWith("/health") ? "/health" : "/";
}

async function readJson(request: Request): Promise<Json> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new HttpError(413, "payload_too_large", "The request is too large");
  const raw = await request.text();
  if (encoder.encode(raw).byteLength > MAX_JSON_BYTES) throw new HttpError(413, "payload_too_large", "The request is too large");
  let value: unknown;
  try { value = raw ? JSON.parse(raw) : {}; } catch { throw new HttpError(400, "invalid_json", "The request body must be valid JSON"); }
  if (!isRecord(value)) throw new HttpError(400, "invalid_request", "The request body must be an object");
  return value;
}

async function verifyIdentity(request: Request, mutation: boolean): Promise<Identity> {
  if (!supabaseUrl || !serviceRoleKey) throw new HttpError(503, "service_not_configured", "Proj OS is not configured");
  const clientId = Deno.env.get("APAS_CRM_PROJECT_LINK_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("APAS_CRM_PROJECT_LINK_CLIENT_SECRET") ?? "";
  const issuer = Deno.env.get("APAS_CRM_PROJECT_LINK_ISSUER") ?? "apas-crm";
  const audience = Deno.env.get("APAS_CRM_PROJECT_LINK_AUDIENCE") ?? "proj-os";
  const organizationId = Deno.env.get("APAS_CRM_ORGANIZATION_ID") ?? "";
  const workspaceId = Deno.env.get("APAS_CRM_WORKSPACE_ID") ?? "";
  if (!clientId || clientSecret.length < 32 || !organizationId || !workspaceId) {
    throw new HttpError(503, "integration_not_configured", "The APAS CRM project link is not configured");
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "invalid_credential", "The integration credential is invalid");
  let header: Json;
  let payload: Json;
  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as Json;
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as Json;
  } catch {
    throw new HttpError(401, "invalid_credential", "The integration credential is invalid");
  }
  const expectedSignature = base64Url(await hmacBytes(clientSecret, `${parts[0]}.${parts[1]}`));
  const now = Math.floor(Date.now() / 1000);
  const scopes = Array.isArray(payload.scopes)
    ? payload.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  if (
    header.alg !== "HS256" || header.kid !== clientId || !constantTimeEqual(parts[2], expectedSignature)
    || payload.iss !== issuer || payload.sub !== clientId || payload.aud !== audience
    || payload.contract !== CONTRACT_VERSION || payload.organization_id !== organizationId
    || payload.workspace_id !== workspaceId || typeof payload.actor_user_id !== "string"
    || typeof payload.iat !== "number" || payload.iat < now - 120 || payload.iat > now + 5
    || typeof payload.exp !== "number" || payload.exp < now || payload.exp > now + 120
    || typeof payload.nbf !== "number" || payload.nbf > now + 5 || typeof payload.jti !== "string"
  ) throw new HttpError(401, "invalid_credential", "The integration credential is invalid");

  if (request.headers.get("x-apas-contract-version") !== CONTRACT_VERSION) {
    throw new HttpError(409, "incompatible_contract", "The integration contract is incompatible");
  }
  const requiredScope = mutation ? "project_parties.write" : "projects.read";
  if (!scopes.includes(requiredScope)) throw new HttpError(403, "scope_required", `The ${requiredScope} scope is required`);
  const correlationId = uuid(request.headers.get("x-correlation-id"), "Correlation identifier");
  const idempotencyKey = mutation
    ? required(request.headers.get("idempotency-key"), "Idempotency key", 200)
    : undefined;
  return {
    organizationId: uuid(organizationId, "APAS organization identifier"),
    workspaceId: uuid(workspaceId, "Proj OS workspace identifier"),
    actorUserId: required(payload.actor_user_id, "Actor identifier", 240),
    scopes: new Set(scopes), correlationId, idempotencyKey,
  };
}

async function requireProject(identity: Identity, projectId: string) {
  const { data, error } = await admin.from("projects")
    .select("id,name,description,status,project_type,client_id,property_id,start_date,target_end_date,updated_at")
    .eq("id", projectId).eq("workspace_id", identity.workspaceId).is("deleted_at", null).maybeSingle();
  if (error) throw new HttpError(503, "database_unavailable", "Proj OS could not load the project");
  if (!data) throw new HttpError(404, "project_not_found", "The project was not found");
  return data;
}

function projectResult(project: Json) {
  return {
    id: String(project.id),
    name: String(project.name),
    description: typeof project.description === "string" ? project.description : undefined,
    status: String(project.status),
    projectType: typeof project.project_type === "string" ? project.project_type : "other",
    clientId: typeof project.client_id === "string" ? project.client_id : undefined,
    propertyId: typeof project.property_id === "string" ? project.property_id : undefined,
    startDate: typeof project.start_date === "string" ? project.start_date : undefined,
    targetEndDate: typeof project.target_end_date === "string" ? project.target_end_date : undefined,
    updatedAt: String(project.updated_at),
  };
}

function partyResult(row: Json) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    partyType: row.party_type,
    apasCompanyId: row.apas_company_id ?? undefined,
    apasContactId: row.apas_contact_id ?? undefined,
    relationshipRole: row.relationship_role,
    relationshipStatus: row.relationship_status,
    displayName: row.display_name_snapshot,
    companyName: row.company_name_snapshot ?? undefined,
    primaryEmail: row.primary_email_snapshot ?? undefined,
    phone: row.phone_snapshot ?? undefined,
    website: row.website_snapshot ?? undefined,
    apasCrmUrl: row.apas_crm_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

async function listProjects(identity: Identity) {
  const { data, error } = await admin.from("projects")
    .select("id,name,description,status,project_type,client_id,property_id,start_date,target_end_date,updated_at")
    .eq("workspace_id", identity.workspaceId).is("deleted_at", null)
    .order("name", { ascending: true }).limit(500);
  if (error) throw new HttpError(503, "database_unavailable", "Proj OS could not load projects");
  return (data ?? []).map((project) => projectResult(project as Json));
}

async function listParties(identity: Identity, projectId: string) {
  await requireProject(identity, projectId);
  const { data, error } = await admin.from("apas_crm_project_parties").select("*")
    .eq("tenant_id", identity.workspaceId).eq("project_id", projectId)
    .order("relationship_status", { ascending: true }).order("display_name_snapshot", { ascending: true });
  if (error) throw new HttpError(503, "database_unavailable", "Proj OS could not load project parties");
  return (data ?? []).map((party) => partyResult(party as Json));
}

function cleanParty(value: unknown): Json {
  if (!isRecord(value)) throw new HttpError(400, "invalid_project_party", "Choose a company or contact to link");
  const partyType = value.partyType === "company" || value.partyType === "contact" ? value.partyType : "";
  const companyId = value.apasCompanyId ? uuid(value.apasCompanyId, "APAS CRM company identifier") : undefined;
  const contactId = value.apasContactId ? uuid(value.apasContactId, "APAS CRM contact identifier") : undefined;
  const role = required(value.relationshipRole, "Project role", 80);
  if (!PROJECT_ROLES.has(role)) throw new HttpError(400, "invalid_project_party", "Choose a supported project role");
  if ((partyType === "company" && (!companyId || contactId)) || (partyType === "contact" && !contactId)) {
    throw new HttpError(400, "invalid_project_party", "The project-party identity is invalid");
  }
  const companyName = optional(value.companyName, "Company name", 240);
  const primaryEmail = optional(value.primaryEmail, "Primary email", 320);
  const phone = optional(value.phone, "Phone", 80);
  const website = optional(value.website, "Website", 500);
  const apasCrmUrl = optional(value.apasCrmUrl, "APAS CRM URL", 2_000);
  return {
    partyType,
    ...(companyId ? { apasCompanyId: companyId } : {}),
    ...(contactId ? { apasContactId: contactId } : {}),
    relationshipRole: role,
    displayName: required(value.displayName, "Display name", 240),
    ...(companyName ? { companyName } : {}),
    ...(primaryEmail ? { primaryEmail } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
    ...(apasCrmUrl ? { apasCrmUrl } : {}),
  };
}

async function mutateParty(identity: Identity, projectId: string, body: Json, partyId?: string) {
  await requireProject(identity, projectId);
  if (body.contractVersion !== CONTRACT_VERSION) throw new HttpError(409, "incompatible_contract", "The integration contract is incompatible");
  const action = partyId ? "archive" : "upsert";
  const party = action === "upsert" ? cleanParty(body.party) : {};
  const canonicalRequest = { contractVersion: CONTRACT_VERSION, action, projectId, ...(partyId ? { partyId } : { party }) };
  const requestHash = await sha256Hex(canonicalJson(canonicalRequest));
  const { data, error } = await admin.rpc("apply_apas_crm_project_party_mutation", {
    p_tenant_id: identity.workspaceId,
    p_project_id: projectId,
    p_apas_organization_id: identity.organizationId,
    p_actor_external_user_id: identity.actorUserId,
    p_idempotency_key: identity.idempotencyKey,
    p_request_hash: requestHash,
    p_correlation_id: identity.correlationId,
    p_action: action,
    p_party_id: partyId ?? null,
    p_party: party,
  });
  if (error) {
    const message = String(error.message ?? "");
    if (/not found/i.test(message)) throw new HttpError(404, "project_party_not_found", "The project party was not found");
    if (/idempotency/i.test(message)) throw new HttpError(409, "idempotency_conflict", "That request key was already used for another change");
    throw new HttpError(503, "database_unavailable", "Proj OS could not save the project party");
  }
  const result = isRecord(data) ? data : {};
  if (!isRecord(result.party)) throw new HttpError(503, "invalid_database_result", "Proj OS returned an invalid project-party result");
  return { party: partyResult(result.party), idempotentReplay: result.idempotentReplay === true };
}

serve(async (request) => {
  const path = normalizedPath(request);
  const fallbackCorrelationId = crypto.randomUUID();
  try {
    if (request.method === "GET" && path === "/health") {
      return response({ status: "ok", service: "apas-crm-project-links", version: CONTRACT_VERSION });
    }
    const projectPartiesMatch = path.match(/^\/v1\/integrations\/apas-crm\/projects\/([0-9a-f-]{36})\/parties$/i);
    const archiveMatch = path.match(/^\/v1\/integrations\/apas-crm\/projects\/([0-9a-f-]{36})\/parties\/([0-9a-f-]{36})\/archive$/i);
    const isMutation = request.method === "POST" && Boolean(projectPartiesMatch || archiveMatch);
    const identity = await verifyIdentity(request, isMutation);

    if (request.method === "GET" && path === "/v1/integrations/apas-crm/projects") {
      return response({ contractVersion: CONTRACT_VERSION, projects: await listProjects(identity) }, 200, identity.correlationId);
    }
    if (request.method === "GET" && projectPartiesMatch) {
      const projectId = uuid(projectPartiesMatch[1], "Project identifier");
      return response({ contractVersion: CONTRACT_VERSION, projectId, parties: await listParties(identity, projectId) }, 200, identity.correlationId);
    }
    if (request.method === "POST" && projectPartiesMatch) {
      const projectId = uuid(projectPartiesMatch[1], "Project identifier");
      return response({ contractVersion: CONTRACT_VERSION, ...(await mutateParty(identity, projectId, await readJson(request))) }, 200, identity.correlationId);
    }
    if (request.method === "POST" && archiveMatch) {
      const projectId = uuid(archiveMatch[1], "Project identifier");
      const partyId = uuid(archiveMatch[2], "Project-party identifier");
      return response({ contractVersion: CONTRACT_VERSION, ...(await mutateParty(identity, projectId, await readJson(request), partyId)) }, 200, identity.correlationId);
    }
    throw new HttpError(404, "not_found", "The requested Proj OS integration route was not found");
  } catch (error) {
    const safe = error instanceof HttpError
      ? error
      : new HttpError(500, "internal_error", "Proj OS could not complete the project-link request");
    console.error("[apas-crm-project-links]", fallbackCorrelationId, safe.code);
    return response({ contractVersion: CONTRACT_VERSION, error: { code: safe.code, message: safe.message }, correlationId: fallbackCorrelationId }, safe.status, fallbackCorrelationId);
  }
});
