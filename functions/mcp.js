/**
 * Stateless Streamable HTTP MCP endpoint for Proge OS.
 *
 * Runtime secrets (Cloudflare Pages environment):
 *   PROGE_OS_MCP_SHARED_SECRET
 *   PROGE_OS_CLIENT_ID
 *   PROGE_OS_CLIENT_SECRET
 *   PROGE_OS_SUPABASE_FUNCTIONS_URL (optional when VITE_SUPABASE_URL is set)
 *   PROGE_OS_MCP_ALLOWED_ORIGINS (optional comma-separated browser origins)
 */

const SUPPORTED_PROTOCOLS = new Set(["2025-11-25", "2025-06-18", "2025-03-26"]);
let tokenCache = null;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "GET") return new Response("SSE not supported", { status: 405 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const originError = validateOrigin(request, env);
  if (originError) return rpcHttpError(null, -32001, originError, 403);
  if (!env.PROGE_OS_MCP_SHARED_SECRET) return rpcHttpError(null, -32000, "MCP is not configured", 503);
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || !(await secureEqual(bearer, env.PROGE_OS_MCP_SHARED_SECRET))) {
    return rpcHttpError(null, -32001, "Unauthorized", 401);
  }

  let message;
  try { message = await request.json(); }
  catch { return rpcHttpError(null, -32700, "Parse error", 400); }

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcHttpError(message?.id ?? null, -32600, "Invalid Request", 400);
  }
  if (message.id === undefined || message.id === null) return new Response(null, { status: 202 });

  try {
    const result = await dispatch(message, request, env);
    return rpcResponse(message.id, result);
  } catch (error) {
    const code = Number.isInteger(error?.rpcCode) ? error.rpcCode : -32603;
    return rpcResponse(message.id, undefined, { code, message: error?.message || "Internal error" });
  }
}

async function dispatch(message, request, env) {
  if (message.method === "initialize") {
    const requested = message.params?.protocolVersion;
    return {
      protocolVersion: SUPPORTED_PROTOCOLS.has(requested) ? requested : "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "proge-os", title: "Proge OS", version: "1.0.0" },
      instructions: "Use read tools freely. Before a write, show a concise preview and obtain explicit user confirmation. Resolve ambiguous projects before writing.",
    };
  }
  if (message.method === "ping") return {};
  if (message.method === "tools/list") return { tools: TOOLS };
  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    const tool = TOOL_HANDLERS[name];
    if (!tool) throw rpcError(-32602, `Unknown tool: ${String(name)}`);
    const requester = cleanHeader(request.headers.get("x-proge-requester-id")) || "hermes";
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
        content: [{ type: "text", text: error?.message || "Proge OS request failed" }],
        structuredContent: { error: error?.code || "proge_os_request_failed", correlation_id: correlationId },
        isError: true,
      };
    }
  }
  throw rpcError(-32601, `Method not found: ${message.method}`);
}

const TOOL_HANDLERS = {
  proge_os_search_projects: (a, c) => api(c, "GET", "/api-v1/projects", { q: requireText(a.q, "q"), limit: a.limit }),
  proge_os_get_project_summary: (a, c) => api(c, "GET", "/api-v1/project-status", { project_id: requireUuid(a.project_id, "project_id") }),
  proge_os_search_contacts: (a, c) => api(c, "GET", "/api-v1/contacts", { q: requireText(a.q, "q"), limit: a.limit }),
  proge_os_get_contact: (a, c) => api(c, "GET", `/api-v1/contacts/${requireUuid(a.contact_id, "contact_id")}`),
  proge_os_create_contact: (a, c) => api(c, "POST", "/api-v1/contacts", null, pick(a, CONTACT_FIELDS)),
  proge_os_update_contact: (a, c) => {
    const contactId = requireUuid(a.contact_id, "contact_id");
    const body = pick(a, CONTACT_FIELDS);
    delete body.contact_id;
    return api(c, "PATCH", `/api-v1/contacts/${contactId}`, null, body);
  },
  proge_os_link_contact_to_project: (a, c) => api(c, "POST", "/api-v1/project-directory", null, {
    project_id: requireUuid(a.project_id, "project_id"),
    contact_id: requireUuid(a.contact_id, "contact_id"),
    organization_id: a.organization_id || undefined,
    role_label: a.role_label || undefined,
    is_key_contact: a.is_key_contact === true,
  }),
  proge_os_list_project_tasks: (a, c) => api(c, "GET", "/api-v1/action-items", {
    project_id: requireUuid(a.project_id, "project_id"), status: a.status, limit: a.limit,
  }),
  proge_os_create_project_task: (a, c) => api(c, "POST", "/api-v1/action-items", null, pick(a, TASK_FIELDS)),
  proge_os_update_project_task: (a, c) => {
    const taskId = requireUuid(a.task_id, "task_id");
    const body = pick(a, TASK_FIELDS);
    delete body.task_id;
    delete body.project_id;
    return api(c, "PATCH", `/api-v1/action-items/${taskId}`, null, body);
  },
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
    const error = new Error(`Proge OS API: ${payload?.error || response.statusText}`);
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
    "x-proge-requester-id": ctx.requester,
  };
  if (method !== "GET") headers["idempotency-key"] = ctx.idempotencyKey;
  return fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function accessToken(env) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (!env.PROGE_OS_CLIENT_ID || !env.PROGE_OS_CLIENT_SECRET) throw new Error("Proge OS OAuth client is not configured");
  const response = await fetch(functionsBase(env) + "/oauth-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.PROGE_OS_CLIENT_ID,
      client_secret: env.PROGE_OS_CLIENT_SECRET,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`OAuth token exchange failed: ${payload.error || response.status}`);
  tokenCache = { value: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

function functionsBase(env) {
  const explicit = String(env.PROGE_OS_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const supabase = String(env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  if (!supabase) throw new Error("Proge OS API base URL is not configured");
  return `${supabase}/functions/v1`;
}

function validateOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = String(env.PROGE_OS_MCP_ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? null : "Origin not allowed";
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

function rpcResponse(id, result, error) {
  return new Response(JSON.stringify(error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
function rpcHttpError(id, code, message, status) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
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

const string = (description) => ({ type: "string", description });
const uuid = (description) => ({ type: "string", format: "uuid", description });
const object = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const TOOLS = [
  { name: "proge_os_search_projects", title: "Search Proge OS projects", description: "Find authorized Proge OS projects by name, description, scope, or project key.", inputSchema: object({ q: string("Search text"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["q"]), annotations: readAnnotations },
  { name: "proge_os_get_project_summary", title: "Get Proge OS project summary", description: "Return project details plus task and milestone status counts.", inputSchema: object({ project_id: uuid("Proge OS project ID") }, ["project_id"]), annotations: readAnnotations },
  { name: "proge_os_search_contacts", title: "Search Proge OS CRM", description: "Search the shared CRM by name, company, email, or phone before creating a contact.", inputSchema: object({ q: string("Contact search text"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["q"]), annotations: readAnnotations },
  { name: "proge_os_get_contact", title: "Get Proge OS contact", description: "Get one authorized shared CRM contact.", inputSchema: object({ contact_id: uuid("CRM contact ID") }, ["contact_id"]), annotations: readAnnotations },
  { name: "proge_os_create_contact", title: "Create Proge OS contact", description: "Create one contact in the shared CRM. Search for duplicates and obtain user confirmation first.", inputSchema: object({ first_name: string("First name"), last_name: string("Last name"), company_name: string("Company"), job_title: string("Job title"), email: string("Email"), phone: string("Phone"), mobile: string("Mobile"), notes: string("CRM notes"), tags: { type: "array", items: { type: "string" } }, contact_type: string("Contact type") }, ["first_name"]), annotations: writeAnnotations },
  { name: "proge_os_update_contact", title: "Update Proge OS contact", description: "Update approved fields on one shared CRM contact after showing a preview and obtaining confirmation.", inputSchema: object({ contact_id: uuid("CRM contact ID"), first_name: string("First name"), last_name: string("Last name"), company_name: string("Company"), job_title: string("Job title"), email: string("Email"), phone: string("Phone"), mobile: string("Mobile"), notes: string("CRM notes"), tags: { type: "array", items: { type: "string" } }, is_active: { type: "boolean" } }, ["contact_id"]), annotations: writeAnnotations },
  { name: "proge_os_link_contact_to_project", title: "Link contact to project", description: "Link an existing shared CRM contact to an authorized project with a role.", inputSchema: object({ project_id: uuid("Project ID"), contact_id: uuid("CRM contact ID"), organization_id: uuid("Optional organization ID"), role_label: string("Project role"), is_key_contact: { type: "boolean" } }, ["project_id", "contact_id"]), annotations: writeAnnotations },
  { name: "proge_os_list_project_tasks", title: "List project tasks", description: "List action items for an authorized Proge OS project.", inputSchema: object({ project_id: uuid("Project ID"), status: string("Optional status filter"), limit: { type: "integer", minimum: 1, maximum: 200 } }, ["project_id"]), annotations: readAnnotations },
  { name: "proge_os_create_project_task", title: "Create project task", description: "Create one project action item after showing a preview and obtaining confirmation.", inputSchema: object({ project_id: uuid("Project ID"), title: string("Task title"), description: string("Task details"), status: { type: "string", enum: ["todo", "in_progress", "in_review", "done", "cancelled"] }, priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }, assigned_to: uuid("Assignee user ID"), due_date: { type: "string", format: "date" }, tags: { type: "array", items: { type: "string" } } }, ["project_id", "title"]), annotations: writeAnnotations },
  { name: "proge_os_update_project_task", title: "Update project task", description: "Update approved fields on one project action item after confirmation.", inputSchema: object({ task_id: uuid("Action-item ID"), title: string("Task title"), description: string("Task details"), status: { type: "string", enum: ["todo", "in_progress", "in_review", "done", "cancelled"] }, priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }, assigned_to: uuid("Assignee user ID"), due_date: { type: "string", format: "date" }, tags: { type: "array", items: { type: "string" } } }, ["task_id"]), annotations: writeAnnotations },
];
