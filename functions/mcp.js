/**
 * Stateless Streamable HTTP MCP endpoint for Proj OS.
 *
 * Runtime secrets (Cloudflare Pages environment):
 *   PROJ_OS_MCP_SHARED_SECRET
 *   PROJ_OS_CLIENT_ID
 *   PROJ_OS_CLIENT_SECRET
 *   PROJ_OS_SUPABASE_FUNCTIONS_URL (optional when VITE_SUPABASE_URL is set)
 *   PROJ_OS_MCP_ALLOWED_ORIGINS (optional comma-separated browser origins)
 */

const SUPPORTED_PROTOCOLS = new Set(["2025-11-25", "2025-06-18", "2025-03-26"]);
let tokenCache = null;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight(request);
  // Hermes probes GET/HEAD and rejects non-JSON/SSE content types (skip_preflight
  // is the workaround). Answer with MCP JSON so Telegram/HTTP clients handshake.
  if (request.method === "GET" || request.method === "HEAD") {
    const response = rpcHttpError(null, -32000, "Use POST for MCP JSON-RPC", 405, request);
    if (request.method === "HEAD") return new Response(null, { status: 405, headers: response.headers });
    return response;
  }
  if (request.method !== "POST") return rpcHttpError(null, -32600, "Method not allowed", 405, request);

  const originError = validateOrigin(request, env);
  if (originError) return rpcHttpError(null, -32001, originError, 403, request);
  if (!env.PROJ_OS_MCP_SHARED_SECRET) return rpcHttpError(null, -32000, "MCP is not configured", 503, request);
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || !(await secureEqual(bearer, env.PROJ_OS_MCP_SHARED_SECRET))) {
    return rpcHttpError(null, -32001, "Unauthorized", 401, request);
  }

  let message;
  try { message = await request.json(); }
  catch { return rpcHttpError(null, -32700, "Parse error", 400, request); }

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcHttpError(message?.id ?? null, -32600, "Invalid Request", 400, request);
  }
  if (message.id === undefined || message.id === null) return new Response(null, { status: 202 });

  try {
    const result = await dispatch(message, request, env);
    return rpcResponse(message.id, result, undefined, request);
  } catch (error) {
    const code = Number.isInteger(error?.rpcCode) ? error.rpcCode : -32603;
    return rpcResponse(message.id, undefined, { code, message: error?.message || "Internal error" }, request);
  }
}

async function dispatch(message, request, env) {
  if (message.method === "initialize") {
    const requested = message.params?.protocolVersion;
    return {
      protocolVersion: SUPPORTED_PROTOCOLS.has(requested) ? requested : "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "proj-os", title: "Proj OS", version: "1.2.0" },
      instructions: "Use read tools freely. Before creating or updating contacts, tasks, projects, proposals, change orders, client invoices (pay apps), owner payment receipts, or client portal updates, show a concise preview and obtain explicit user confirmation. Resolve ambiguous projects before writing. Draft financial records only unless the user explicitly asks to advance status. Published client_updates appear on the owner/client portal; drafts stay internal. For pay-app reconciliation, list payments and compare Line 7 cash to prior certificates.",
    };
  }
  if (message.method === "ping") return {};
  if (message.method === "tools/list") return { tools: TOOLS };
  if (message.method === "resources/list") return { resources: [] };
  if (message.method === "resources/templates/list") return { resourceTemplates: [] };
  if (message.method === "prompts/list") return { prompts: [] };
  if (message.method === "logging/setLevel") return {};
  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    const tool = TOOL_HANDLERS[name];
    if (!tool) throw rpcError(-32602, `Unknown tool: ${String(name)}`);
    const requester = cleanHeader(request.headers.get("x-proj-requester-id")) || "hermes";
    const correlationId = crypto.randomUUID();
    const argumentHash = await sha256Hex(JSON.stringify(args));
    try {
      const data = await tool(args, {
        correlationId,
        env,
        idempotencyKey: `${requester}:${String(message.id)}:${name}:${argumentHash}`,
        requester,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
        structuredContent: data,
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: error?.message || "Proj OS request failed" }],
        structuredContent: { error: error?.code || "proj_os_request_failed", correlation_id: correlationId },
        isError: true,
      };
    }
  }
  throw rpcError(-32601, `Method not found: ${message.method}`);
}

const TOOL_HANDLERS = {
  proj_os_health: async (_a, c) => {
    const payload = await api(c, "GET", "/api-v1/projects", { limit: 1 });
    return { ok: true, server: "proj-os", api: "reachable", sample_projects: Array.isArray(payload?.data) ? payload.data.length : 0 };
  },
  proj_os_search_projects: (a, c) => api(c, "GET", "/api-v1/projects", { q: requireText(a.q, "q"), limit: a.limit }),
  proj_os_get_project_summary: (a, c) => api(c, "GET", "/api-v1/project-status", { project_id: requireUuid(a.project_id, "project_id") }),
  proj_os_update_project: (a, c) => {
    const projectId = requireUuid(a.project_id, "project_id");
    const body = pick(a, PROJECT_PATCH_FIELDS);
    return api(c, "PATCH", `/api-v1/projects/${projectId}`, null, body);
  },
  proj_os_search_contacts: (a, c) => api(c, "GET", "/api-v1/contacts", { q: requireText(a.q, "q"), limit: a.limit }),
  proj_os_get_contact: (a, c) => api(c, "GET", `/api-v1/contacts/${requireUuid(a.contact_id, "contact_id")}`),
  proj_os_create_contact: (a, c) => api(c, "POST", "/api-v1/contacts", null, pick(a, CONTACT_FIELDS)),
  proj_os_update_contact: (a, c) => {
    const contactId = requireUuid(a.contact_id, "contact_id");
    const body = pick(a, CONTACT_FIELDS);
    delete body.contact_id;
    return api(c, "PATCH", `/api-v1/contacts/${contactId}`, null, body);
  },
  proj_os_link_contact_to_project: (a, c) => api(c, "POST", "/api-v1/project-directory", null, {
    project_id: requireUuid(a.project_id, "project_id"),
    contact_id: requireUuid(a.contact_id, "contact_id"),
    organization_id: a.organization_id || undefined,
    role_label: a.role_label || undefined,
    is_key_contact: a.is_key_contact === true,
  }),
  proj_os_list_project_tasks: (a, c) => api(c, "GET", "/api-v1/action-items", {
    project_id: requireUuid(a.project_id, "project_id"), status: a.status, limit: a.limit,
  }),
  proj_os_create_project_task: (a, c) => api(c, "POST", "/api-v1/action-items", null, pick(a, TASK_FIELDS)),
  proj_os_update_project_task: (a, c) => {
    const taskId = requireUuid(a.task_id, "task_id");
    const body = pick(a, TASK_FIELDS);
    delete body.task_id;
    delete body.project_id;
    return api(c, "PATCH", `/api-v1/action-items/${taskId}`, null, body);
  },
  proj_os_list_change_orders: (a, c) => api(c, "GET", "/api-v1/change-orders", {
    project_id: requireUuid(a.project_id, "project_id"), status: a.status, co_type: a.co_type, limit: a.limit,
  }),
  proj_os_get_change_order: (a, c) => api(c, "GET", `/api-v1/change-orders/${requireUuid(a.change_order_id, "change_order_id")}`),
  proj_os_create_change_order: (a, c) => api(c, "POST", "/api-v1/change-orders", null, pick(a, CHANGE_ORDER_FIELDS)),
  proj_os_update_change_order: (a, c) => {
    const changeOrderId = requireUuid(a.change_order_id, "change_order_id");
    const body = pick(a, CHANGE_ORDER_PATCH_FIELDS);
    return api(c, "PATCH", `/api-v1/change-orders/${changeOrderId}`, null, body);
  },
  proj_os_list_proposals: (a, c) => api(c, "GET", "/api-v1/proposals", {
    project_id: requireUuid(a.project_id, "project_id"), status: a.status, limit: a.limit,
  }),
  proj_os_get_proposal: (a, c) => api(c, "GET", `/api-v1/proposals/${requireUuid(a.proposal_id, "proposal_id")}`),
  proj_os_create_proposal: (a, c) => api(c, "POST", "/api-v1/proposals", null, pick(a, PROPOSAL_FIELDS)),
  proj_os_update_proposal: (a, c) => {
    const proposalId = requireUuid(a.proposal_id, "proposal_id");
    const body = pick(a, PROPOSAL_PATCH_FIELDS);
    return api(c, "PATCH", `/api-v1/proposals/${proposalId}`, null, body);
  },
  proj_os_list_invoices: (a, c) => api(c, "GET", "/api-v1/pay-apps", {
    project_id: a.project_id, prime_contract_id: a.prime_contract_id, status: a.status, limit: a.limit,
  }),
  proj_os_get_invoice: (a, c) => api(c, "GET", `/api-v1/pay-apps/${requireUuid(a.invoice_id, "invoice_id")}`),
  proj_os_create_invoice: (a, c) => api(c, "POST", "/api-v1/pay-apps", null, pick(a, INVOICE_FIELDS)),
  proj_os_update_invoice: (a, c) => {
    const invoiceId = requireUuid(a.invoice_id, "invoice_id");
    const body = pick(a, INVOICE_PATCH_FIELDS);
    return api(c, "PATCH", `/api-v1/pay-apps/${invoiceId}`, null, body);
  },
  proj_os_list_payments: (a, c) => api(c, "GET", "/api-v1/payments", {
    project_id: a.project_id, prime_contract_id: a.prime_contract_id, pay_app_id: a.pay_app_id, limit: a.limit,
  }),
  proj_os_record_payment: (a, c) => api(c, "POST", "/api-v1/payments", null, pick(a, PAYMENT_FIELDS)),
  proj_os_list_client_updates: (a, c) => api(c, "GET", "/api-v1/client-updates", {
    project_id: requireUuid(a.project_id, "project_id"), status: a.status, limit: a.limit,
  }),
  proj_os_create_client_update: (a, c) => api(c, "POST", "/api-v1/client-updates", null, pick(a, CLIENT_UPDATE_FIELDS)),
  proj_os_update_client_update: (a, c) => {
    const updateId = requireUuid(a.update_id, "update_id");
    const body = pick(a, CLIENT_UPDATE_PATCH_FIELDS);
    return api(c, "PATCH", `/api-v1/client-updates/${updateId}`, null, body);
  },
  proj_os_publish_client_update: (a, c) => api(c, "PATCH", `/api-v1/client-updates/${requireUuid(a.update_id, "update_id")}`, null, { status: "published" }),
};

async function api(ctx, method, path, query = null, body = undefined) {
  const base = functionsBase(ctx.env);
  const url = new URL(base + path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  let token = await accessToken(ctx.env);
  let response = await fetchApi(url, method, body, token, ctx);
  if (response.status === 401) {
    tokenCache = null;
    token = await accessToken(ctx.env);
    response = await fetchApi(url, method, body, token, ctx);
  }
  let payload;
  try { payload = await response.json(); }
  catch { payload = { error: "invalid_api_response" }; }
  if (!response.ok) {
    const error = new Error(`Proj OS API: ${payload?.error || response.statusText}`);
    error.code = payload?.error;
    throw error;
  }
  return payload;
}

function fetchApi(url, method, body, token, ctx) {
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-correlation-id": ctx.correlationId,
    "x-proj-requester-id": ctx.requester,
  };
  if (method !== "GET") headers["idempotency-key"] = ctx.idempotencyKey;
  return fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function accessToken(env) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (!env.PROJ_OS_CLIENT_ID || !env.PROJ_OS_CLIENT_SECRET) throw new Error("Proj OS OAuth client is not configured");
  const response = await fetch(functionsBase(env) + "/oauth-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.PROJ_OS_CLIENT_ID,
      client_secret: env.PROJ_OS_CLIENT_SECRET,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`OAuth token exchange failed: ${payload.error || response.status}`);
  tokenCache = { value: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

function functionsBase(env) {
  const explicit = String(env.PROJ_OS_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const supabase = String(env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  if (!supabase) throw new Error("Proj OS API base URL is not configured");
  return `${supabase}/functions/v1`;
}

const CURSOR_ORIGINS = new Set([
  "https://cursor.com",
  "https://www.cursor.com",
  "https://cloud.cursor.com",
]);

function validateOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  // Cursor Slack/cloud agents send Origin: https://cursor.com. The shared
  // bearer secret is the actual credential; browsers cannot attach it without
  // possessing the secret, so an authenticated request is allowed through.
  if (/^Bearer\s+\S+/i.test(request.headers.get("authorization") || "")) return null;
  const allowed = String(env.PROJ_OS_MCP_ALLOWED_ORIGINS || "https://projos.ai")
    .split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(origin) || CURSOR_ORIGINS.has(origin) ? null : "Origin not allowed";
}

function corsHeaders(request) {
  const origin = request?.headers?.get("origin");
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type, accept, mcp-session-id, mcp-protocol-version",
    vary: "Origin",
  };
}

function corsPreflight(request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
      "access-control-max-age": "86400",
    },
  });
}

async function secureEqual(a, b) {
  const enc = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(left); const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rpcResponse(id, result, error, request) {
  return new Response(JSON.stringify(error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(request) },
  });
}
function rpcHttpError(id, code, message, status, request) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(request) },
  });
}
function rpcError(rpcCode, message) { const error = new Error(message); error.rpcCode = rpcCode; return error; }
function cleanHeader(value) { return String(value || "").replace(/[\r\n]/g, "").slice(0, 200); }
function requireText(value, field) { const text = String(value || "").trim(); if (!text) throw new Error(`${field} is required`); return text; }
function requireUuid(value, field) { const text = String(value || ""); if (!UUID_RE.test(text)) throw new Error(`${field} must be a UUID`); return text; }
function pick(source, fields) { return Object.fromEntries(fields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])); }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_FIELDS = ["first_name", "last_name", "company_name", "job_title", "contact_type", "email", "phone", "mobile", "address_line1", "address_line2", "city", "state", "zip_code", "country", "website", "tags", "notes", "is_favorite", "is_active"];
const TASK_FIELDS = ["task_id", "project_id", "title", "description", "status", "priority", "assigned_to", "due_date", "completed_at", "tags", "sort_order"];
const CHANGE_ORDER_FIELDS = ["project_id", "prime_contract_id", "commitment_id", "co_type", "title", "description", "amount", "days_impact"];
const CHANGE_ORDER_PATCH_FIELDS = ["title", "description", "amount", "days_impact", "status"];
const PROPOSAL_FIELDS = ["project_id", "proposal_no", "title", "client_name", "client_email", "valid_until", "notes", "terms", "scope_bullets", "deliverables", "markup_pct", "overhead_pct", "profit_pct", "lines"];
const PROPOSAL_PATCH_FIELDS = ["title", "client_name", "client_email", "valid_until", "notes", "terms", "scope_bullets", "deliverables", "markup_pct", "overhead_pct", "profit_pct"];
const INVOICE_FIELDS = ["project_id", "prime_contract_id", "pay_app_no", "period_end", "submitted_amount"];
const INVOICE_PATCH_FIELDS = ["period_end", "submitted_amount", "retainage_held", "invoice_no", "pay_app_data"];
const PAYMENT_FIELDS = ["project_id", "prime_contract_id", "pay_app_id", "amount", "received_date", "method", "reference", "notes"];
const CLIENT_UPDATE_FIELDS = ["project_id", "title", "update_type", "period_label", "health", "summary", "accomplishments", "risks", "decisions", "action_items", "next_steps", "status"];
const CLIENT_UPDATE_PATCH_FIELDS = ["title", "update_type", "period_label", "health", "summary", "accomplishments", "risks", "decisions", "action_items", "next_steps", "status"];
const PROJECT_PATCH_FIELDS = ["name", "description", "scope", "status"];

const string = (description) => ({ type: "string", description });
const uuid = (description) => ({ type: "string", format: "uuid", description });
const object = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const TOOLS = [
  { name: "proj_os_health", title: "Check Proj OS connectivity", description: "Verify the MCP-to-API path is live and the agent OAuth client can read projects.", inputSchema: object({}), annotations: readAnnotations },
  { name: "proj_os_search_projects", title: "Search Proj OS projects", description: "Find authorized Proj OS projects by name, description, scope, program key, or project key.", inputSchema: object({ q: string("Search text"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["q"]), annotations: readAnnotations },
  { name: "proj_os_get_project_summary", title: "Get Proj OS project summary", description: "Return project details plus task and milestone status counts.", inputSchema: object({ project_id: uuid("Proj OS project ID") }, ["project_id"]), annotations: readAnnotations },
  { name: "proj_os_update_project", title: "Update Proj OS project", description: "Update name, description, scope, or status on an authorized project after confirmation. Does not publish to the client portal; use proj_os_create_client_update for portal briefings.", inputSchema: object({ project_id: uuid("Project ID"), name: string("Project name"), description: string("Project description"), scope: string("Project scope"), status: { type: "string", enum: ["planning", "active", "on_hold", "completed", "closed"] } }, ["project_id"]), annotations: writeAnnotations },
  { name: "proj_os_search_contacts", title: "Search Proj OS CRM", description: "Search the shared CRM by name, company, email, or phone before creating a contact.", inputSchema: object({ q: string("Contact search text"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["q"]), annotations: readAnnotations },
  { name: "proj_os_get_contact", title: "Get Proj OS contact", description: "Get one authorized shared CRM contact.", inputSchema: object({ contact_id: uuid("CRM contact ID") }, ["contact_id"]), annotations: readAnnotations },
  { name: "proj_os_create_contact", title: "Create Proj OS contact", description: "Create one contact in the shared CRM. Search for duplicates and obtain user confirmation first.", inputSchema: object({ first_name: string("First name"), last_name: string("Last name"), company_name: string("Company"), job_title: string("Job title"), email: string("Email"), phone: string("Phone"), mobile: string("Mobile"), notes: string("CRM notes"), tags: { type: "array", items: { type: "string" } }, contact_type: string("Contact type") }, ["first_name"]), annotations: writeAnnotations },
  { name: "proj_os_update_contact", title: "Update Proj OS contact", description: "Update approved fields on one shared CRM contact after showing a preview and obtaining confirmation.", inputSchema: object({ contact_id: uuid("CRM contact ID"), first_name: string("First name"), last_name: string("Last name"), company_name: string("Company"), job_title: string("Job title"), email: string("Email"), phone: string("Phone"), mobile: string("Mobile"), notes: string("CRM notes"), tags: { type: "array", items: { type: "string" } }, is_active: { type: "boolean" } }, ["contact_id"]), annotations: writeAnnotations },
  { name: "proj_os_link_contact_to_project", title: "Link contact to project", description: "Link an existing shared CRM contact to an authorized project with a role.", inputSchema: object({ project_id: uuid("Project ID"), contact_id: uuid("CRM contact ID"), organization_id: uuid("Optional organization ID"), role_label: string("Project role"), is_key_contact: { type: "boolean" } }, ["project_id", "contact_id"]), annotations: writeAnnotations },
  { name: "proj_os_list_project_tasks", title: "List project tasks", description: "List action items for an authorized Proj OS project.", inputSchema: object({ project_id: uuid("Project ID"), status: string("Optional status filter"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["project_id"]), annotations: readAnnotations },
  { name: "proj_os_create_project_task", title: "Create project task", description: "Create one project action item after showing a preview and obtaining confirmation.", inputSchema: object({ project_id: uuid("Project ID"), title: string("Task title"), description: string("Task details"), status: { type: "string", enum: ["todo", "in_progress", "in_review", "done", "cancelled"] }, priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }, assigned_to: uuid("Assignee user ID"), due_date: { type: "string", format: "date" }, tags: { type: "array", items: { type: "string" } } }, ["project_id", "title"]), annotations: writeAnnotations },
  { name: "proj_os_update_project_task", title: "Update project task", description: "Update approved fields on one project action item after confirmation.", inputSchema: object({ task_id: uuid("Action-item ID"), title: string("Task title"), description: string("Task details"), status: { type: "string", enum: ["todo", "in_progress", "in_review", "done", "cancelled"] }, priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }, assigned_to: uuid("Assignee user ID"), due_date: { type: "string", format: "date" }, tags: { type: "array", items: { type: "string" } } }, ["task_id"]), annotations: writeAnnotations },
  { name: "proj_os_list_change_orders", title: "List change orders", description: "List change orders for an authorized project.", inputSchema: object({ project_id: uuid("Project ID"), status: string("Optional status filter"), co_type: { type: "string", enum: ["PCO", "OCO", "CCO"] }, limit: { type: "integer", minimum: 1, maximum: 200 } }, ["project_id"]), annotations: readAnnotations },
  { name: "proj_os_get_change_order", title: "Get change order", description: "Get one change order by ID.", inputSchema: object({ change_order_id: uuid("Change order ID") }, ["change_order_id"]), annotations: readAnnotations },
  { name: "proj_os_create_change_order", title: "Create change order", description: "Create a draft prime (PCO) or commitment (CCO) change order. Confirm with the user first. Defaults to PCO and auto-resolves the prime contract when omitted.", inputSchema: object({ project_id: uuid("Project ID"), title: string("Change order title"), description: string("Scope / justification"), amount: { type: "number" }, days_impact: { type: "integer" }, co_type: { type: "string", enum: ["PCO", "CCO"] }, prime_contract_id: uuid("Prime contract ID for PCO"), commitment_id: uuid("Commitment ID for CCO") }, ["project_id", "title"]), annotations: writeAnnotations },
  { name: "proj_os_update_change_order", title: "Update change order", description: "Update a draft/pending change order after confirmation.", inputSchema: object({ change_order_id: uuid("Change order ID"), title: string("Title"), description: string("Description"), amount: { type: "number" }, days_impact: { type: "integer" }, status: { type: "string", enum: ["draft", "pending"] } }, ["change_order_id"]), annotations: writeAnnotations },
  { name: "proj_os_list_proposals", title: "List proposals", description: "List financial proposals for an authorized project.", inputSchema: object({ project_id: uuid("Project ID"), status: string("Optional status filter"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["project_id"]), annotations: readAnnotations },
  { name: "proj_os_get_proposal", title: "Get proposal", description: "Get one financial proposal by ID.", inputSchema: object({ proposal_id: uuid("Proposal ID") }, ["proposal_id"]), annotations: readAnnotations },
  { name: "proj_os_create_proposal", title: "Create proposal", description: "Create a draft financial proposal, optionally with line items. Confirm totals with the user first. proposal_no auto-generates when omitted.", inputSchema: object({
    project_id: uuid("Project ID"),
    title: string("Proposal title"),
    proposal_no: string("Optional proposal number"),
    client_name: string("Client display name"),
    client_email: string("Client email"),
    valid_until: { type: "string", format: "date" },
    notes: string("Proposal notes"),
    terms: string("Commercial terms"),
    scope_bullets: { type: "array", items: { type: "string" } },
    deliverables: { type: "array", items: { type: "string" } },
    markup_pct: { type: "number" },
    overhead_pct: { type: "number" },
    profit_pct: { type: "number" },
    lines: { type: "array", items: object({ description: string("Line description"), category: { type: "string", enum: ["labor", "material", "equipment", "subcontract", "other"] }, quantity: { type: "number" }, unit: string("Unit"), unit_cost: { type: "number" }, markup_pct: { type: "number" } }, ["description"]) },
  }, ["project_id", "title"]), annotations: writeAnnotations },
  { name: "proj_os_update_proposal", title: "Update proposal", description: "Update a draft financial proposal after confirmation.", inputSchema: object({ proposal_id: uuid("Proposal ID"), title: string("Title"), client_name: string("Client name"), client_email: string("Client email"), valid_until: { type: "string", format: "date" }, notes: string("Notes"), terms: string("Terms"), markup_pct: { type: "number" }, overhead_pct: { type: "number" }, profit_pct: { type: "number" } }, ["proposal_id"]), annotations: writeAnnotations },
  { name: "proj_os_list_invoices", title: "List client invoices / pay apps", description: "List GC-to-owner pay applications (client invoices) for a project or prime contract.", inputSchema: object({ project_id: uuid("Project ID"), prime_contract_id: uuid("Prime contract ID"), status: string("Optional status filter"), limit: { type: "integer", minimum: 1, maximum: 200 } }), annotations: readAnnotations },
  { name: "proj_os_get_invoice", title: "Get client invoice / pay app", description: "Get one prime-contract pay application by ID.", inputSchema: object({ invoice_id: uuid("Pay application ID") }, ["invoice_id"]), annotations: readAnnotations },
  { name: "proj_os_create_invoice", title: "Create client invoice / pay app", description: "Create a draft GC-to-owner pay application (client invoice). Confirm period and amount first. pay_app_no auto-generates when omitted.", inputSchema: object({ project_id: uuid("Project ID"), prime_contract_id: uuid("Prime contract ID"), period_end: { type: "string", format: "date", description: "Billing period end date YYYY-MM-DD" }, pay_app_no: { type: "integer" }, submitted_amount: { type: "number" } }, ["period_end"]), annotations: writeAnnotations },
  { name: "proj_os_update_invoice", title: "Update client invoice / pay app", description: "Update a draft pay application after confirmation. May include G702 pay_app_data snapshot.", inputSchema: object({
    invoice_id: uuid("Pay application ID"),
    period_end: { type: "string", format: "date" },
    submitted_amount: { type: "number" },
    retainage_held: { type: "number" },
    invoice_no: string("Invoice number"),
    pay_app_data: { type: "object", description: "G702 summary snapshot (original_contract_sum, current_payment_due, etc.)" },
  }, ["invoice_id"]), annotations: writeAnnotations },
  { name: "proj_os_list_payments", title: "List owner payments received", description: "List R4/owner cash receipts (prime_contract_payments) for a project or prime contract, with total_received.", inputSchema: object({ project_id: uuid("Project ID"), prime_contract_id: uuid("Prime contract ID"), pay_app_id: uuid("Optional pay app filter"), limit: { type: "integer", minimum: 1, maximum: 200 } }), annotations: readAnnotations },
  { name: "proj_os_record_payment", title: "Record owner payment received", description: "Record one owner→GC cash receipt against a pay application. Confirm amount and date first.", inputSchema: object({
    project_id: uuid("Project ID"),
    prime_contract_id: uuid("Prime contract ID"),
    pay_app_id: uuid("Pay application ID"),
    amount: { type: "number" },
    received_date: { type: "string", format: "date", description: "YYYY-MM-DD" },
    method: { type: "string", enum: ["check", "ach", "wire", "card", "other"] },
    reference: string("Check/ACH/wire reference"),
    notes: string("Payment notes"),
  }, ["pay_app_id", "amount", "received_date"]), annotations: writeAnnotations },
  { name: "proj_os_list_client_updates", title: "List client portal updates", description: "List GC briefings for an authorized project. Published rows appear on the owner/client portal.", inputSchema: object({ project_id: uuid("Project ID"), status: { type: "string", enum: ["draft", "published"] }, limit: { type: "integer", minimum: 1, maximum: 200 } }, ["project_id"]), annotations: readAnnotations },
  { name: "proj_os_create_client_update", title: "Create client portal update", description: "Create a client briefing. Confirm the preview with the user first. Set status=published to push it to the owner portal immediately; otherwise it stays a draft.", inputSchema: object({
    project_id: uuid("Project ID"),
    title: string("Update title"),
    update_type: { type: "string", enum: ["general", "progress", "milestone", "decision", "risk"] },
    period_label: string("Period label, e.g. Week of Sep 1–7, 2026"),
    health: { type: "string", enum: ["on_track", "at_risk", "delayed"] },
    summary: string("Client-facing narrative"),
    accomplishments: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
    status: { type: "string", enum: ["draft", "published"] },
  }, ["project_id", "title"]), annotations: writeAnnotations },
  { name: "proj_os_update_client_update", title: "Update client portal update", description: "Edit a draft or published client briefing after confirmation.", inputSchema: object({
    update_id: uuid("Client update ID"),
    title: string("Update title"),
    update_type: { type: "string", enum: ["general", "progress", "milestone", "decision", "risk"] },
    period_label: string("Period label"),
    health: { type: "string", enum: ["on_track", "at_risk", "delayed"] },
    summary: string("Client-facing narrative"),
    accomplishments: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
    status: { type: "string", enum: ["draft", "published"] },
  }, ["update_id"]), annotations: writeAnnotations },
  { name: "proj_os_publish_client_update", title: "Publish client portal update", description: "Publish one client briefing so it appears on the owner/client portal. Confirm with the user first.", inputSchema: object({ update_id: uuid("Client update ID") }, ["update_id"]), annotations: writeAnnotations },
];
