/**
 * Proj OS public API v1.
 *
 * OAuth client-credential authentication, per-client scopes/rate limits, strict
 * workspace/project boundaries, narrow write allowlists, and API audit entries.
 * This API is also the capability layer used by the Proj OS MCP endpoint.
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
  "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key, x-correlation-id, x-proj-requester-id",
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
    requesterId: cleanOptionalText(req.headers.get("x-proj-requester-id"), 200),
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
      case "change-orders": response = await routeChangeOrders(req.method, ctx, id, req, url); break;
      case "proposals": response = await routeProposals(req.method, ctx, id, req, url); break;
      case "pay-apps": response = await routePayApps(req.method, ctx, id, req, url); break;
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

async function routeChangeOrders(
  method: string,
  ctx: RequestContext,
  id: string | undefined,
  req: Request,
  url: URL,
) {
  if (method === "GET") {
    if (id) {
      const { data, error } = await admin.from("change_orders").select(CHANGE_ORDER_SELECT)
        .eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError(404, "change_order_not_found");
      await requireProject(ctx.tenantId, data.project_id);
      return json({ data });
    }
    const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
    await requireProject(ctx.tenantId, projectId);
    let q = admin.from("change_orders").select(CHANGE_ORDER_SELECT)
      .eq("tenant_id", ctx.tenantId).eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const status = cleanOptionalText(url.searchParams.get("status"), 40);
    if (status) q = q.eq("status", status);
    const coType = cleanOptionalText(url.searchParams.get("co_type"), 10);
    if (coType) q = q.eq("co_type", coType);
    const { data, error } = await q.limit(boundedLimit(url, 100));
    if (error) throw error;
    return json({ data: data ?? [] });
  }

  requireActor(ctx);
  if (method === "POST") {
    const body = asObject(await req.json());
    const projectId = requiredUuid(body.project_id, "project_id");
    await requireProject(ctx.tenantId, projectId);
    const coType = String(body.co_type || "PCO").toUpperCase();
    if (!["PCO", "CCO"].includes(coType)) throw new ApiError(400, "invalid_co_type");

    let primeContractId = optionalUuid(body.prime_contract_id, "prime_contract_id");
    let commitmentId = optionalUuid(body.commitment_id, "commitment_id");
    if (coType === "PCO") {
      if (!primeContractId) {
        primeContractId = (await resolvePrimeContractForProject(ctx.tenantId, projectId)).id;
      } else {
        await requirePrimeContract(ctx.tenantId, primeContractId, projectId);
      }
      commitmentId = null;
    } else {
      if (!commitmentId) throw new ApiError(400, "commitment_id_required");
      await requireCommitment(ctx.tenantId, commitmentId, projectId);
      primeContractId = null;
    }

    const insertId = await idempotentUuid(req, ctx.apiClient.id, "change-orders");
    const insert = {
      id: insertId,
      tenant_id: ctx.tenantId,
      project_id: projectId,
      prime_contract_id: primeContractId,
      commitment_id: commitmentId,
      co_type: coType,
      title: requiredText(body.title, "title", 240),
      description: cleanOptionalText(body.description, 4000),
      amount: Number.isFinite(Number(body.amount)) ? Number(body.amount) : 0,
      days_impact: Number.isFinite(Number(body.days_impact)) ? Number(body.days_impact) : 0,
      status: "draft",
      requested_by: ctx.actorUserId,
    };
    const { data, error } = await admin.from("change_orders").insert(insert).select(CHANGE_ORDER_SELECT).single();
    if (error?.code === "23505") {
      const { data: existing } = await admin.from("change_orders").select(CHANGE_ORDER_SELECT)
        .eq("id", insertId).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (!existing) throw error;
      await auditWrite(ctx, "change_order", existing.id, "create", projectId);
      return json({ data: existing, idempotent_replay: true });
    }
    if (error) throw error;
    await auditWrite(ctx, "change_order", data.id, "create", projectId);
    return json({ data }, 201);
  }

  if (method === "PATCH" && id) {
    const { data: existing, error: findError } = await admin.from("change_orders")
      .select("id, project_id, status").eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new ApiError(404, "change_order_not_found");
    await requireProject(ctx.tenantId, existing.project_id);
    if (!["draft", "pending"].includes(String(existing.status))) {
      throw new ApiError(409, "change_order_not_editable");
    }
    const patch = pick(asObject(await req.json()), CHANGE_ORDER_WRITE_FIELDS);
    if (patch.status && !["draft", "pending"].includes(String(patch.status))) {
      throw new ApiError(400, "invalid_change_order_status");
    }
    if (Object.keys(patch).length === 0) throw new ApiError(400, "empty_patch");
    const { data, error } = await admin.from("change_orders").update(patch)
      .eq("id", id).eq("tenant_id", ctx.tenantId).select(CHANGE_ORDER_SELECT).single();
    if (error) throw error;
    await auditWrite(ctx, "change_order", id, "update", existing.project_id);
    return json({ data });
  }

  throw new ApiError(405, "method_not_allowed");
}

async function routeProposals(
  method: string,
  ctx: RequestContext,
  id: string | undefined,
  req: Request,
  url: URL,
) {
  if (method === "GET") {
    if (id) {
      const { data, error } = await admin.from("proposals").select(PROPOSAL_SELECT)
        .eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError(404, "proposal_not_found");
      await requireProject(ctx.tenantId, data.project_id);
      return json({ data });
    }
    const projectId = requiredUuid(url.searchParams.get("project_id"), "project_id");
    await requireProject(ctx.tenantId, projectId);
    let q = admin.from("proposals").select(PROPOSAL_SELECT)
      .eq("tenant_id", ctx.tenantId).eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const status = cleanOptionalText(url.searchParams.get("status"), 40);
    if (status) q = q.eq("status", status);
    const { data, error } = await q.limit(boundedLimit(url, 100));
    if (error) throw error;
    return json({ data: data ?? [] });
  }

  requireActor(ctx);
  if (method === "POST") {
    const body = asObject(await req.json());
    const projectId = requiredUuid(body.project_id, "project_id");
    await requireProject(ctx.tenantId, projectId);
    const insertId = await idempotentUuid(req, ctx.apiClient.id, "proposals");
    const proposalNo = cleanOptionalText(body.proposal_no, 80)
      || await nextProposalNo(ctx.tenantId, projectId);
    const insert = {
      id: insertId,
      tenant_id: ctx.tenantId,
      project_id: projectId,
      proposal_no: proposalNo,
      title: requiredText(body.title, "title", 240),
      client_name: cleanOptionalText(body.client_name, 200),
      client_email: cleanOptionalText(body.client_email, 200),
      valid_until: cleanOptionalText(body.valid_until, 40),
      notes: cleanOptionalText(body.notes, 8000),
      terms: cleanOptionalText(body.terms, 8000),
      scope_bullets: Array.isArray(body.scope_bullets) ? body.scope_bullets.map(String).slice(0, 50) : null,
      deliverables: Array.isArray(body.deliverables) ? body.deliverables.map(String).slice(0, 50) : null,
      markup_pct: Number.isFinite(Number(body.markup_pct)) ? Number(body.markup_pct) : undefined,
      overhead_pct: Number.isFinite(Number(body.overhead_pct)) ? Number(body.overhead_pct) : undefined,
      profit_pct: Number.isFinite(Number(body.profit_pct)) ? Number(body.profit_pct) : undefined,
      status: "draft",
    };
    const { data, error } = await admin.from("proposals").insert(insert).select(PROPOSAL_SELECT).single();
    if (error?.code === "23505") {
      const { data: existing } = await admin.from("proposals").select(PROPOSAL_SELECT)
        .eq("id", insertId).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (!existing) throw error;
      await auditWrite(ctx, "proposal", existing.id, "create", projectId);
      return json({ data: existing, idempotent_replay: true });
    }
    if (error) throw error;

    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length > 0) {
      const lineRows = lines.slice(0, 100).map((line: any, index: number) => ({
        tenant_id: ctx.tenantId,
        proposal_id: data.id,
        line_no: index + 1,
        category: ["labor", "material", "equipment", "subcontract", "other"].includes(line?.category)
          ? line.category
          : "other",
        description: requiredText(line?.description, "lines.description", 500),
        quantity: Number.isFinite(Number(line?.quantity)) ? Number(line.quantity) : 1,
        unit: cleanOptionalText(line?.unit, 40) || "ea",
        unit_cost: Number.isFinite(Number(line?.unit_cost)) ? Number(line.unit_cost) : 0,
        markup_pct: Number.isFinite(Number(line?.markup_pct)) ? Number(line.markup_pct) : 0,
      }));
      const { error: lineError } = await admin.from("proposal_lines").insert(lineRows);
      if (lineError) throw lineError;
    }

    await auditWrite(ctx, "proposal", data.id, "create", projectId);
    return json({ data }, 201);
  }

  if (method === "PATCH" && id) {
    const { data: existing, error: findError } = await admin.from("proposals")
      .select("id, project_id, status, locked").eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new ApiError(404, "proposal_not_found");
    await requireProject(ctx.tenantId, existing.project_id);
    if (existing.locked || !["draft"].includes(String(existing.status))) {
      throw new ApiError(409, "proposal_not_editable");
    }
    const patch = pick(asObject(await req.json()), PROPOSAL_WRITE_FIELDS);
    if (Object.keys(patch).length === 0) throw new ApiError(400, "empty_patch");
    const { data, error } = await admin.from("proposals").update(patch)
      .eq("id", id).eq("tenant_id", ctx.tenantId).select(PROPOSAL_SELECT).single();
    if (error) throw error;
    await auditWrite(ctx, "proposal", id, "update", existing.project_id);
    return json({ data });
  }

  throw new ApiError(405, "method_not_allowed");
}

async function routePayApps(
  method: string,
  ctx: RequestContext,
  id: string | undefined,
  req: Request,
  url: URL,
) {
  if (method === "GET") {
    if (id) {
      const { data, error } = await admin.from("prime_contract_pay_apps").select(PAY_APP_SELECT)
        .eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError(404, "pay_app_not_found");
      await requirePrimeContract(ctx.tenantId, data.prime_contract_id);
      return json({ data });
    }
    const projectId = url.searchParams.get("project_id");
    let primeContractId = optionalUuid(url.searchParams.get("prime_contract_id"), "prime_contract_id");
    if (projectId) {
      primeContractId = (await resolvePrimeContractForProject(
        ctx.tenantId,
        requiredUuid(projectId, "project_id"),
      )).id;
    }
    if (!primeContractId) throw new ApiError(400, "project_id_or_prime_contract_id_required");
    await requirePrimeContract(ctx.tenantId, primeContractId);
    let q = admin.from("prime_contract_pay_apps").select(PAY_APP_SELECT)
      .eq("tenant_id", ctx.tenantId).eq("prime_contract_id", primeContractId)
      .order("pay_app_no", { ascending: false });
    const status = cleanOptionalText(url.searchParams.get("status"), 40);
    if (status) q = q.eq("status", status);
    const { data, error } = await q.limit(boundedLimit(url, 100));
    if (error) throw error;
    return json({ data: data ?? [] });
  }

  requireActor(ctx);
  if (method === "POST") {
    const body = asObject(await req.json());
    const projectId = optionalUuid(body.project_id, "project_id");
    let primeContractId = optionalUuid(body.prime_contract_id, "prime_contract_id");
    if (!primeContractId) {
      if (!projectId) throw new ApiError(400, "project_id_or_prime_contract_id_required");
      primeContractId = (await resolvePrimeContractForProject(ctx.tenantId, projectId)).id;
    }
    const contract = await requirePrimeContract(ctx.tenantId, primeContractId, projectId);
    const periodEnd = requiredText(body.period_end, "period_end", 40);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) throw new ApiError(400, "invalid_period_end");
    const insertId = await idempotentUuid(req, ctx.apiClient.id, "pay-apps");
    const payAppNo = Number.isFinite(Number(body.pay_app_no))
      ? Number(body.pay_app_no)
      : await nextPayAppNo(primeContractId);
    const insert = {
      id: insertId,
      tenant_id: ctx.tenantId,
      prime_contract_id: primeContractId,
      pay_app_no: payAppNo,
      period_end: periodEnd,
      submitted_amount: Number.isFinite(Number(body.submitted_amount)) ? Number(body.submitted_amount) : 0,
      status: "draft",
      created_by: ctx.actorUserId,
    };
    const { data, error } = await admin.from("prime_contract_pay_apps").insert(insert)
      .select(PAY_APP_SELECT).single();
    if (error?.code === "23505") {
      const { data: existing } = await admin.from("prime_contract_pay_apps").select(PAY_APP_SELECT)
        .eq("id", insertId).eq("tenant_id", ctx.tenantId).maybeSingle();
      if (!existing) throw error;
      await auditWrite(ctx, "prime_contract_pay_app", existing.id, "create", contract.project_id);
      return json({ data: existing, idempotent_replay: true });
    }
    if (error) throw error;
    await auditWrite(ctx, "prime_contract_pay_app", data.id, "create", contract.project_id);
    return json({ data }, 201);
  }

  if (method === "PATCH" && id) {
    const { data: existing, error: findError } = await admin.from("prime_contract_pay_apps")
      .select("id, prime_contract_id, status").eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new ApiError(404, "pay_app_not_found");
    const contract = await requirePrimeContract(ctx.tenantId, existing.prime_contract_id);
    if (!["draft"].includes(String(existing.status))) throw new ApiError(409, "pay_app_not_editable");
    const patch = pick(asObject(await req.json()), PAY_APP_WRITE_FIELDS);
    if (patch.period_end && !/^\d{4}-\d{2}-\d{2}$/.test(String(patch.period_end))) {
      throw new ApiError(400, "invalid_period_end");
    }
    if (Object.keys(patch).length === 0) throw new ApiError(400, "empty_patch");
    const { data, error } = await admin.from("prime_contract_pay_apps").update(patch)
      .eq("id", id).eq("tenant_id", ctx.tenantId).select(PAY_APP_SELECT).single();
    if (error) throw error;
    await auditWrite(ctx, "prime_contract_pay_app", id, "update", contract.project_id);
    return json({ data });
  }

  throw new ApiError(405, "method_not_allowed");
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

async function requirePrimeContract(tenantId: string, contractId: string, expectedProjectId?: string | null) {
  const { data, error } = await admin.from("prime_contracts")
    .select("id, project_id, tenant_id")
    .eq("id", contractId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "prime_contract_not_found");
  if (expectedProjectId && data.project_id !== expectedProjectId) {
    throw new ApiError(400, "prime_contract_project_mismatch");
  }
  await requireProject(tenantId, data.project_id);
  return data as { id: string; project_id: string; tenant_id: string };
}

async function resolvePrimeContractForProject(tenantId: string, projectId: string) {
  await requireProject(tenantId, projectId);
  const { data, error } = await admin.from("prime_contracts")
    .select("id, project_id, tenant_id")
    .eq("project_id", projectId)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(400, "prime_contract_required");
  return data as { id: string; project_id: string; tenant_id: string };
}

async function requireCommitment(tenantId: string, commitmentId: string, expectedProjectId: string) {
  const { data, error } = await admin.from("commitments")
    .select("id, project_id, tenant_id")
    .eq("id", commitmentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "commitment_not_found");
  if (data.project_id !== expectedProjectId) throw new ApiError(400, "commitment_project_mismatch");
  await requireProject(tenantId, data.project_id);
  return data;
}

async function nextProposalNo(tenantId: string, projectId: string) {
  const { data, error } = await admin.from("proposals").select("proposal_no")
    .eq("tenant_id", tenantId).eq("project_id", projectId);
  if (error) throw error;
  let max = 0;
  for (const row of data ?? []) {
    const match = String((row as any).proposal_no || "").match(/(\d+)(?!.*\d)/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `P-${String(max + 1).padStart(3, "0")}`;
}

async function nextPayAppNo(primeContractId: string) {
  const { data, error } = await admin.from("prime_contract_pay_apps").select("pay_app_no")
    .eq("prime_contract_id", primeContractId)
    .order("pay_app_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (Number((data?.[0] as any)?.pay_app_no) || 0) + 1;
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
const CHANGE_ORDER_SELECT = "id, project_id, prime_contract_id, commitment_id, co_type, co_no, title, description, amount, days_impact, status, created_at, updated_at";
const CHANGE_ORDER_WRITE_FIELDS = ["title", "description", "amount", "days_impact", "status"] as const;
const PROPOSAL_SELECT = "id, project_id, proposal_no, title, client_name, client_email, valid_until, status, notes, terms, scope_bullets, deliverables, markup_pct, overhead_pct, profit_pct, revision_no, locked, created_at, updated_at";
const PROPOSAL_WRITE_FIELDS = ["title", "client_name", "client_email", "valid_until", "notes", "terms", "scope_bullets", "deliverables", "markup_pct", "overhead_pct", "profit_pct"] as const;
const PAY_APP_SELECT = "id, prime_contract_id, pay_app_no, period_end, status, submitted_amount, created_at, updated_at";
const PAY_APP_WRITE_FIELDS = ["period_end", "submitted_amount"] as const;
