/**
 * Proge OS public API v1.
 *
 * OAuth client-credential authentication, per-client scopes/rate limits, strict
 * workspace/project boundaries, narrow write allowlists, and API audit entries.
 * This API is also the capability layer used by the Proge OS MCP endpoint.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const rlWindow = new Map<string, { count: number; resetAt: number }>();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key, x-correlation-id, x-proge-requester-id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json",
};

type ApiClient = { id: string; tenant_id: string; created_by: string | null; is_active: boolean; rate_limit: number | null };
type RequestContext = {
  apiClient: ApiClient;
  actorUserId: string | null;
  correlationId: string;
  requesterId: string | null;
  tenantId: string;
};
type ProjectRow = { id: string; client_id: string | null; property_id: string | null; [key: string]: unknown };

class ApiError extends Error {
  constructor(public status: number, public code: string, message = code) { super(message); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "missing_token" }, 401);

  const tokenHash = await sha256Hex(token);
  const { data: tokenRow } = await admin.from("api_tokens")
    .select("*, api_clients(*)").eq("access_token_hash", tokenHash)
    .gte("expires_at", new Date().toISOString()).maybeSingle();
  if (!tokenRow) return json({ error: "invalid_token" }, 401);
  const apiClient = (tokenRow as any).api_clients as ApiClient | null;
  if (!apiClient?.is_active) return json({ error: "client_revoked" }, 401);

  const rateLimited = enforceRateLimit(apiClient);
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const resourceIdx = parts.indexOf("api-v1") === -1
    ? (parts[0] === "api" && parts[1] === "v1" ? 2 : 1)
    : parts.indexOf("api-v1") + 1;
  const resource = parts[resourceIdx] ?? "";
  const id = parts[resourceIdx + 1];
  const scopes: string[] = (tokenRow as any).scopes ?? [];
  const tenantId = (tokenRow as any).tenant_id as string;
  const neededScope = req.method === "GET" ? `read:${resource}` : `write:${resource}`;
  if (!scopes.includes(neededScope)) {
    await meter(tenantId, apiClient.id, true);
    return json({ error: "insufficient_scope", required: neededScope }, 403);
  }

  const ctx: RequestContext = {
    apiClient,
    actorUserId: apiClient.created_by,
    correlationId: normalizeCorrelationId(req.headers.get("x-correlation-id")),
    requesterId: cleanOptionalText(req.headers.get("x-proge-requester-id"), 200),
    tenantId,
  };

  try {
    let response: Response;
    switch (resource) {
      case "projects": response = await routeProjects(req.method, ctx, id, url); break;
      case "contacts": response = await routeContacts(req.method, ctx, id, req, url); break;
      case "project-directory": response = await routeProjectDirectory(req.method, ctx, req, url); break;
      case "action-items": response = await routeActionItems(req.method, ctx, id, req, url); break;
      case "project-status": response = await routeProjectStatus(req.method, ctx, url); break;
      case "commitments": response = await routeCommitments(req.method, ctx, id, req); break;
      case "change-orders": response = await routeChangeOrders(req.method, ctx, id, url); break;
      case "budget": response = await routeBudget(ctx, url); break;
      case "rfis": response = await routeRfis(ctx, url); break;
      case "direct-costs": response = await routeDirectCosts(req.method, ctx, req); break;
      default: response = json({ error: "unknown_resource" }, 404);
    }
    await meter(tenantId, apiClient.id, response.status >= 400);
    return withCorrelation(response, ctx.correlationId);
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : new ApiError(500, "internal_error", (err as Error).message);
    console.error("[api-v1]", ctx.correlationId, apiErr.message);
    await meter(tenantId, apiClient.id, true);
    return withCorrelation(json({ error: apiErr.code, correlation_id: ctx.correlationId }, apiErr.status), ctx.correlationId);
  }
});

function enforceRateLimit(client: ApiClient): Response | null {
  const limit = client.rate_limit ?? 600;
  const now = Date.now();
  const current = rlWindow.get(client.id);
  if (!current || current.resetAt < now) {
    rlWindow.set(client.id, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  return json({ error: "rate_limit_exceeded" }, 429, { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) });
}

async function routeProjects(method: string, ctx: RequestContext, id: string | undefined, url: URL) {
  if (method !== "GET") throw new ApiError(405, "method_not_allowed");
  if (id) return json({ data: await requireProject(ctx.tenantId, id) });
  const projects = await listAuthorizedProjects(ctx.tenantId);
  const q = cleanOptionalText(url.searchParams.get("q"), 120)?.toLowerCase();
  const data = q
    ? projects.filter((p: any) => [p.name, p.description, p.scope, p.program_meta?.project_key]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q)))
    : projects;
  return json({ data: data.slice(0, boundedLimit(url, 100)) });
}

async function routeContacts(method: string, ctx: RequestContext, id: string | undefined, req: Request, url: URL) {
  if (method === "GET") {
    if (id) return json({ data: await requireContact(ctx.tenantId, id) });
    let query = admin.from("crm_contacts").select(CONTACT_SELECT)
      .eq("workspace_id", ctx.tenantId).eq("is_active", true).order("updated_at", { ascending: false });
    const search = sanitizeSearch(url.searchParams.get("q"));
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%,mobile.ilike.%${search}%`);
    const { data, error } = await query.limit(boundedLimit(url, 50));
    if (error) throw error;
    return json({ data: data ?? [] });
  }

  requireActor(ctx);
  if (method === "POST") {
    const body = asObject(await req.json());
    const insert = pick(body, CONTACT_WRITE_FIELDS);
    insert.first_name = requiredText(body.first_name, "first_name", 120);
    insert.workspace_id = ctx.tenantId;
    insert.user_id = ctx.actorUserId;
    insert.created_by = ctx.actorUserId;
    insert.id = await idempotentUuid(req, ctx.apiClient.id, "contacts");
    const { data, error } = await admin.from("crm_contacts").insert(insert).select(CONTACT_SELECT).single();
    if (error?.code === "23505") {
      const existing = await requireContact(ctx.tenantId, String(insert.id));
      await auditWrite(ctx, "contact", existing.id, "create", null);
      return json({ data: existing, idempotent_replay: true });
    }
    if (error) throw error;
    await auditWrite(ctx, "contact", data.id, "create", null);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    await requireContact(ctx.tenantId, id);
    const patch = pick(asObject(await req.json()), CONTACT_WRITE_FIELDS);
    if (Object.keys(patch).length === 0) throw new ApiError(400, "empty_patch");
    const { data, error } = await admin.from("crm_contacts").update(patch)
      .eq("id", id).eq("workspace_id", ctx.tenantId).select(CONTACT_SELECT).single();
    if (error) throw error;
    await auditWrite(ctx, "contact", id, "update", null);
    return json({ data });
  }
  throw new ApiError(405, "method_not_allowed");
}

async function routeProjectDirectory(method: string, ctx: RequestContext, req: Request, url: URL) {
  if (method === "GET") {
    const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
    await requireProject(ctx.tenantId, projectId);
    const { data, error } = await admin.from("project_directory_entries")
      .select(DIRECTORY_SELECT).eq("tenant_id", ctx.tenantId).eq("project_id", projectId)
      .limit(boundedLimit(url, 100));
    if (error) throw error;
    return json({ data: data ?? [] });
  }
  if (method !== "POST") throw new ApiError(405, "method_not_allowed");
  requireActor(ctx);
  const body = asObject(await req.json());
  const projectId = requiredUuid(body.project_id, "project_id");
  const contactId = requiredUuid(body.contact_id, "contact_id");
  const organizationId = optionalUuid(body.organization_id, "organization_id");
  await Promise.all([
    requireProject(ctx.tenantId, projectId),
    requireContact(ctx.tenantId, contactId),
    organizationId ? requireOrganization(ctx.tenantId, organizationId) : Promise.resolve(),
  ]);
  const id = await idempotentUuid(req, ctx.apiClient.id, "project-directory");
  const { data, error } = await admin.from("project_directory_entries").insert({
    id, tenant_id: ctx.tenantId, project_id: projectId, contact_id: contactId,
    organization_id: organizationId,
    role_label: cleanOptionalText(body.role_label, 160), is_key_contact: body.is_key_contact === true,
  }).select(DIRECTORY_SELECT).single();
  if (error?.code === "23505") {
    const { data: existing } = await admin.from("project_directory_entries").select(DIRECTORY_SELECT)
      .eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
    if (!existing) throw error;
    await auditWrite(ctx, "project_directory_entry", existing.id, "create", projectId);
    return json({ data: existing, idempotent_replay: true });
  }
  if (error) throw error;
  await auditWrite(ctx, "project_directory_entry", data.id, "create", projectId);
  return json({ data }, 201);
}

async function routeActionItems(method: string, ctx: RequestContext, id: string | undefined, req: Request, url: URL) {
  if (method === "GET") {
    const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
    await requireProject(ctx.tenantId, projectId);
    let query = admin.from("project_action_items").select(ACTION_ITEM_SELECT)
      .eq("project_id", projectId).order("created_at", { ascending: false });
    const status = cleanOptionalText(url.searchParams.get("status"), 30);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.limit(boundedLimit(url, 100));
    if (error) throw error;
    return json({ data: data ?? [] });
  }
  requireActor(ctx);
  if (method === "POST") {
    const body = asObject(await req.json());
    const projectId = requiredUuid(body.project_id, "project_id");
    await requireProject(ctx.tenantId, projectId);
    const insert = pick(body, ACTION_ITEM_WRITE_FIELDS);
    insert.id = await idempotentUuid(req, ctx.apiClient.id, "action-items");
    insert.project_id = projectId;
    insert.title = requiredText(body.title, "title", 240);
    insert.created_by = ctx.actorUserId;
    validateActionItem(insert);
    if (insert.assigned_to) await requireProjectAssignee(ctx.tenantId, projectId, insert.assigned_to);
    const { data, error } = await admin.from("project_action_items").insert(insert).select(ACTION_ITEM_SELECT).single();
    if (error?.code === "23505") {
      const { data: existing } = await admin.from("project_action_items").select(ACTION_ITEM_SELECT)
        .eq("id", insert.id).maybeSingle();
      if (!existing) throw error;
      await auditWrite(ctx, "project_action_item", existing.id, "create", projectId);
      return json({ data: existing, idempotent_replay: true });
    }
    if (error) throw error;
    await auditWrite(ctx, "project_action_item", data.id, "create", projectId);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data: existing, error: findError } = await admin.from("project_action_items")
      .select("id, project_id").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new ApiError(404, "action_item_not_found");
    await requireProject(ctx.tenantId, existing.project_id);
    const patch = pick(asObject(await req.json()), ACTION_ITEM_WRITE_FIELDS);
    delete patch.project_id;
    validateActionItem(patch);
    if (patch.assigned_to) await requireProjectAssignee(ctx.tenantId, existing.project_id, patch.assigned_to);
    if (Object.keys(patch).length === 0) throw new ApiError(400, "empty_patch");
    const { data, error } = await admin.from("project_action_items").update(patch)
      .eq("id", id).eq("project_id", existing.project_id).select(ACTION_ITEM_SELECT).single();
    if (error) throw error;
    await auditWrite(ctx, "project_action_item", id, "update", existing.project_id);
    return json({ data });
  }
  throw new ApiError(405, "method_not_allowed");
}

async function routeProjectStatus(method: string, ctx: RequestContext, url: URL) {
  if (method !== "GET") throw new ApiError(405, "method_not_allowed");
  const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
  const project = await requireProject(ctx.tenantId, projectId);
  const [{ data: items, error: itemError }, { data: milestones, error: milestoneError }] = await Promise.all([
    admin.from("project_action_items").select("id, status, priority, due_date, title").eq("project_id", projectId),
    admin.from("project_milestones").select("id, name, status, due_date, completed_at").eq("project_id", projectId),
  ]);
  if (itemError) throw itemError;
  if (milestoneError) throw milestoneError;
  const today = new Date().toISOString().slice(0, 10);
  const open = (items ?? []).filter((item: any) => !["done", "cancelled"].includes(item.status));
  return json({ data: {
    project,
    action_items: {
      total: (items ?? []).length, open: open.length,
      overdue: open.filter((item: any) => item.due_date && item.due_date < today).length,
      urgent_or_high: open.filter((item: any) => ["urgent", "high"].includes(item.priority)).length,
    },
    milestones: {
      total: (milestones ?? []).length,
      completed: (milestones ?? []).filter((m: any) => m.status === "completed").length,
      upcoming: (milestones ?? []).filter((m: any) => m.status !== "completed")
        .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 5),
    },
  } });
}

async function routeCommitments(method: string, ctx: RequestContext, id: string | undefined, req: Request) {
  if (method === "GET") {
    let q = admin.from("commitments").select("*").eq("tenant_id", ctx.tenantId);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return json({ data });
  }
  if (method === "POST") {
    const body = asObject(await req.json());
    const projectId = requiredUuid(body.project_id, "project_id");
    await requireProject(ctx.tenantId, projectId);
    const { data, error } = await admin.from("commitments")
      .insert({ ...body, tenant_id: ctx.tenantId, project_id: projectId }).select().single();
    if (error) throw error;
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const body = asObject(await req.json());
    delete body.tenant_id;
    delete body.project_id;
    const { data, error } = await admin.from("commitments").update(body)
      .eq("id", id).eq("tenant_id", ctx.tenantId).select().single();
    if (error) throw error;
    return json({ data });
  }
  throw new ApiError(405, "method_not_allowed");
}

async function routeChangeOrders(method: string, ctx: RequestContext, id: string | undefined, url: URL) {
  if (method !== "GET") throw new ApiError(405, "method_not_allowed");
  let q = admin.from("change_orders").select("*").eq("tenant_id", ctx.tenantId);
  const projectId = url.searchParams.get("project_id");
  if (projectId) {
    await requireProject(ctx.tenantId, requiredUuid(projectId, "project_id"));
    q = q.eq("project_id", projectId);
  }
  if (id) q = q.eq("id", id);
  const { data, error } = await q;
  if (error) throw error;
  return json({ data });
}

async function routeBudget(ctx: RequestContext, url: URL) {
  const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
  await requireProject(ctx.tenantId, projectId);
  const { data: budget } = await admin.from("project_budgets").select("id")
    .eq("project_id", projectId).eq("is_active", true).maybeSingle();
  if (!budget) return json({ data: [] });
  const { data, error } = await admin.from("budget_matrix").select("*")
    .eq("project_budget_id", (budget as any).id);
  if (error) throw error;
  return json({ data });
}

async function routeRfis(ctx: RequestContext, url: URL) {
  const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
  await requireProject(ctx.tenantId, projectId);
  const { data, error } = await admin.from("project_rfis").select("*").eq("project_id", projectId);
  if (error) throw error;
  return json({ data });
}

async function routeDirectCosts(method: string, ctx: RequestContext, req: Request) {
  if (method !== "POST") throw new ApiError(405, "method_not_allowed");
  const body = asObject(await req.json());
  const projectId = requiredUuid(body.project_id, "project_id");
  await requireProject(ctx.tenantId, projectId);
  const { data, error } = await admin.from("direct_costs")
    .insert({ ...body, tenant_id: ctx.tenantId, project_id: projectId }).select().single();
  if (error) throw error;
  return json({ data }, 201);
}

async function listAuthorizedProjects(tenantId: string): Promise<ProjectRow[]> {
  const [{ data: properties, error: propertyError }, { data: clients, error: clientError }] = await Promise.all([
    admin.from("properties").select("id").eq("workspace_id", tenantId),
    admin.from("clients").select("id").eq("workspace_id", tenantId),
  ]);
  if (propertyError) throw propertyError;
  if (clientError) throw clientError;
  const propertyIds = (properties ?? []).map((row: any) => row.id);
  const clientIds = (clients ?? []).map((row: any) => row.id);
  if (propertyIds.length === 0 && clientIds.length === 0) return [];
  const filters: string[] = [];
  if (propertyIds.length) filters.push(`property_id.in.(${propertyIds.join(",")})`);
  if (clientIds.length) filters.push(`client_id.in.(${clientIds.join(",")})`);
  const { data, error } = await admin.from("projects").select(PROJECT_SELECT)
    .or(filters.join(",")).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

async function requireProject(tenantId: string, projectId: string): Promise<ProjectRow> {
  const { data: project, error } = await admin.from("projects").select(PROJECT_SELECT)
    .eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!project) throw new ApiError(404, "project_not_found");
  let allowed = false;
  if ((project as any).property_id) {
    const { data } = await admin.from("properties").select("id")
      .eq("id", (project as any).property_id).eq("workspace_id", tenantId).maybeSingle();
    allowed ||= Boolean(data);
  }
  if ((project as any).client_id) {
    const { data } = await admin.from("clients").select("id")
      .eq("id", (project as any).client_id).eq("workspace_id", tenantId).maybeSingle();
    allowed ||= Boolean(data);
  }
  if (!allowed) throw new ApiError(404, "project_not_found");
  return project as ProjectRow;
}

async function requireContact(tenantId: string, contactId: string) {
  const { data, error } = await admin.from("crm_contacts").select(CONTACT_SELECT)
    .eq("id", contactId).eq("workspace_id", tenantId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "contact_not_found");
  return data;
}

async function requireOrganization(tenantId: string, organizationId: string) {
  const { data, error } = await admin.from("organizations").select("id")
    .eq("id", organizationId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "organization_not_found");
}

async function requireProjectAssignee(tenantId: string, projectId: string, userId: string) {
  const { data, error } = await admin.from("project_directory_entries").select("id")
    .eq("tenant_id", tenantId).eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(400, "assignee_not_in_project_directory");
}

function requireActor(ctx: RequestContext): asserts ctx is RequestContext & { actorUserId: string } {
  if (!ctx.actorUserId) throw new ApiError(409, "api_client_actor_required");
}

async function auditWrite(ctx: RequestContext, entityType: string, entityId: string, action: string, projectId: string | null) {
  const { error } = await admin.from("agent_api_audit_log").insert({
    tenant_id: ctx.tenantId,
    api_client_id: ctx.apiClient.id,
    actor_user_id: ctx.actorUserId,
    requester_id: ctx.requesterId,
    correlation_id: ctx.correlationId,
    project_id: projectId,
    entity_type: entityType,
    entity_id: entityId,
    action,
  });
  if (error) throw new ApiError(500, "audit_write_failed", error.message);
}

async function idempotentUuid(req: Request, clientId: string, resource: string) {
  const key = cleanOptionalText(req.headers.get("idempotency-key"), 200);
  if (!key) throw new ApiError(400, "idempotency_key_required");
  const chars = (await sha256Hex(`${clientId}:${resource}:${key}`)).slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function validateActionItem(input: Record<string, any>) {
  if (input.status && !["todo", "in_progress", "in_review", "done", "cancelled"].includes(input.status)) throw new ApiError(400, "invalid_action_item_status");
  if (input.priority && !["urgent", "high", "medium", "low"].includes(input.priority)) throw new ApiError(400, "invalid_action_item_priority");
  if (input.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(input.due_date))) throw new ApiError(400, "invalid_due_date");
}

function asObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "json_object_required");
  return value as Record<string, any>;
}
function pick(source: Record<string, any>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}
function requiredText(value: unknown, field: string, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ApiError(400, `${field}_required`);
  if (text.length > max) throw new ApiError(400, `${field}_too_long`);
  return text;
}
function cleanOptionalText(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}
function requiredUuid(value: unknown, field: string) {
  const text = String(value ?? "");
  if (!UUID_RE.test(text)) throw new ApiError(400, `${field}_invalid`);
  return text;
}
function optionalUuid(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  return requiredUuid(value, field);
}
function normalizeCorrelationId(value: string | null) {
  return value && UUID_RE.test(value) ? value : crypto.randomUUID();
}
function sanitizeSearch(value: string | null) { return cleanOptionalText(value, 120)?.replace(/[,().%]/g, " ") ?? null; }
function boundedLimit(url: URL, fallback: number) {
  const value = Number(url.searchParams.get("limit") ?? fallback);
  return Number.isFinite(value) ? Math.max(1, Math.min(200, Math.floor(value))) : fallback;
}
async function meter(tenantId: string, clientId: string, isError: boolean) {
  await admin.rpc("bump_api_usage", { p_tenant_id: tenantId, p_client_id: clientId, p_is_error: isError } as any);
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function withCorrelation(response: Response, correlationId: string) {
  const headers = new Headers(response.headers);
  headers.set("x-correlation-id", correlationId);
  return new Response(response.body, { status: response.status, headers });
}
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_SELECT = "id, name, description, scope, status, budget, spent, start_date, target_end_date, actual_end_date, property_id, client_id, parent_project_id, program_meta, updated_at";
const CONTACT_SELECT = "id, first_name, last_name, company_name, job_title, contact_type, email, phone, mobile, address_line1, address_line2, city, state, zip_code, country, website, tags, notes, is_favorite, is_active, created_at, updated_at";
const CONTACT_WRITE_FIELDS = ["first_name", "last_name", "company_name", "job_title", "contact_type", "email", "phone", "mobile", "fax", "address_line1", "address_line2", "city", "state", "zip_code", "country", "website", "license_number", "insurance_expiry", "tags", "notes", "is_favorite", "is_active"] as const;
const DIRECTORY_SELECT = "id, project_id, contact_id, organization_id, role_label, is_key_contact, created_at";
const ACTION_ITEM_SELECT = "id, project_id, title, description, status, priority, assigned_to, created_by, due_date, completed_at, tags, linked_entity_type, linked_entity_id, sort_order, created_at, updated_at";
const ACTION_ITEM_WRITE_FIELDS = ["project_id", "title", "description", "status", "priority", "assigned_to", "due_date", "completed_at", "tags", "sort_order"] as const;
