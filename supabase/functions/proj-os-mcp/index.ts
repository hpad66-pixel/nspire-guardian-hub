/**
 * Proj OS MCP Gateway
 *
 * Remote MCP endpoint for Claude, Codex, and other MCP hosts.
 * Transport: Streamable HTTP compatible JSON-RPC over POST.
 * Auth: existing Proj OS OAuth-style Bearer token from api_tokens.
 *
 * This intentionally exposes curated tools only. It is not a raw SQL or
 * PostgREST pass-through.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2026-07-28";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type AuthContext = {
  tenantId: string;
  apiClientId: string;
  createdBy: string | null;
  scopes: string[];
  clientName: string | null;
  clientVersion: string | null;
};

const TOOL_DEFINITIONS = [
  {
    name: "proj_os.search_projects",
    description:
      "Search Proj OS projects visible to this API token's tenant. Returns high-level project cards only.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional search text for project name, description, client, or property." },
        status: { type: "string", description: "Optional exact project status filter." },
        project_type: { type: "string", description: "Optional exact project type filter, such as consulting or property." },
        limit: { type: "number", description: "Maximum records to return. Default 20, maximum 50." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "proj_os.get_project_context",
    description:
      "Get a concise project context packet with recent client updates, action items, and consulting meetings.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Proj OS project UUID." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "proj_os.list_action_items",
    description: "List project action items for a project, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Proj OS project UUID." },
        status: { type: "string", description: "Optional status, such as todo, in_progress, in_review, done, or cancelled." },
        limit: { type: "number", description: "Maximum records to return. Default 50, maximum 100." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "proj_os.create_action_item",
    description:
      "Create a project action item. Use only when the user clearly asks to record or assign work.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Proj OS project UUID." },
        title: { type: "string", description: "Short action title." },
        description: { type: "string", description: "Detailed instructions, context, or acceptance criteria." },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        due_date: { type: "string", description: "Optional due date in YYYY-MM-DD format." },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["project_id", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "proj_os.create_client_update_draft",
    description:
      "Create a draft client update for review. This does not publish or email the client.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Proj OS project UUID." },
        title: { type: "string", description: "Draft update title." },
        period_label: { type: "string", description: "Optional reporting period, such as Week of Sep 7, 2026." },
        health: { type: "string", enum: ["on_track", "at_risk", "delayed"] },
        summary: { type: "string", description: "Plain-English client update narrative." },
        accomplishments: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "object" } },
        decisions: { type: "array", items: { type: "object" } },
        action_items: { type: "array", items: { type: "object" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
      required: ["project_id", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "proj_os.record_project_note",
    description: "Record a project communication note in Proj OS for auditability.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Proj OS project UUID." },
        subject: { type: "string", description: "Note subject." },
        content: { type: "string", description: "Note body." },
        participants: { type: "array", items: { type: "string" } },
      },
      required: ["project_id", "subject"],
      additionalProperties: false,
    },
  },
];

serve(async (req) => {
  const originCheck = validateOrigin(req);
  const cors = corsHeaders(req);
  if (!originCheck.ok) return jsonRpcHttp(null, { error: errorObject(-32003, "origin_not_allowed") }, 403, cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonRpcHttp(null, { error: errorObject(-32600, "method_not_allowed") }, 405, cors);

  let rpc: JsonRpcRequest;
  try {
    rpc = await req.json();
  } catch {
    return jsonRpcHttp(null, { error: errorObject(-32700, "parse_error") }, 400, cors);
  }

  const auth = await authenticate(req);
  if (!auth.ok) {
    return jsonRpcHttp(rpc.id, { error: errorObject(-32001, auth.error) }, 401, cors);
  }

  const ctx = {
    ...auth.ctx,
    clientName: readClientName(rpc),
    clientVersion: readClientVersion(rpc),
  };

  if (!rpc.id && rpc.method?.startsWith("notifications/")) {
    await logAccess(ctx, rpc.method, null, "ok", null, req, rpc.id);
    return new Response(null, { status: 202, headers: cors });
  }

  try {
    const result = await dispatch(rpc, ctx);
    await logAccess(ctx, rpc.method ?? "unknown", toolName(rpc), "ok", null, req, rpc.id);
    return jsonRpcHttp(rpc.id, { result }, 200, cors);
  } catch (err) {
    const code = err instanceof McpError ? err.code : -32603;
    const message = err instanceof Error ? err.message : "internal_error";
    await logAccess(ctx, rpc.method ?? "unknown", toolName(rpc), "error", message, req, rpc.id);
    return jsonRpcHttp(rpc.id, { error: errorObject(code, message) }, statusFor(code), cors);
  }
});

async function dispatch(rpc: JsonRpcRequest, ctx: AuthContext): Promise<unknown> {
  switch (rpc.method) {
    case "initialize":
      requireScope(ctx, "read:mcp");
      return {
        protocolVersion: negotiatedProtocolVersion(rpc),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "proj-os", title: "Proj OS", version: SERVER_VERSION },
        instructions:
          "Use Proj OS tools for project controls, client updates, action items, and project notes. Do not publish or email unless a specific tool says it will do so.",
      };
    case "tools/list":
      requireScope(ctx, "read:mcp");
      return { tools: toolsForScopes(ctx.scopes) };
    case "tools/call":
      return callTool(rpc, ctx);
    case "ping":
      requireScope(ctx, "read:mcp");
      return {};
    default:
      throw new McpError(-32601, "method_not_found");
  }
}

async function callTool(rpc: JsonRpcRequest, ctx: AuthContext): Promise<unknown> {
  const params = rpc.params ?? {};
  const name = String(params.name ?? "");
  const args = (params.arguments ?? {}) as Record<string, unknown>;

  switch (name) {
    case "proj_os.search_projects":
      requireScope(ctx, "read:projects");
      return toolResult(await searchProjects(ctx, args));
    case "proj_os.get_project_context":
      requireScope(ctx, "read:projects");
      return toolResult(await getProjectContext(ctx, args));
    case "proj_os.list_action_items":
      requireScope(ctx, "read:projects");
      return toolResult(await listActionItems(ctx, args));
    case "proj_os.create_action_item":
      requireScope(ctx, "write:projects");
      return toolResult(await createActionItem(ctx, args));
    case "proj_os.create_client_update_draft":
      requireScope(ctx, "write:client-updates");
      return toolResult(await createClientUpdateDraft(ctx, args));
    case "proj_os.record_project_note":
      requireScope(ctx, "write:projects");
      return toolResult(await recordProjectNote(ctx, args));
    default:
      throw new McpError(-32602, "unknown_tool");
  }
}

async function authenticate(req: Request): Promise<{ ok: true; ctx: AuthContext } | { ok: false; error: string }> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, error: "missing_token" };

  const tokenHash = await sha256Hex(token);
  const { data: tokenRow, error } = await admin
    .from("api_tokens")
    .select("*, api_clients(id, name, is_active, created_by, rate_limit)")
    .eq("access_token_hash", tokenHash)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !tokenRow) return { ok: false, error: "invalid_token" };
  const client = (tokenRow as any).api_clients;
  if (!client?.is_active) return { ok: false, error: "client_revoked" };

  return {
    ok: true,
    ctx: {
      tenantId: (tokenRow as any).tenant_id,
      apiClientId: (tokenRow as any).api_client_id,
      createdBy: client.created_by ?? null,
      scopes: (tokenRow as any).scopes ?? [],
      clientName: null,
      clientVersion: null,
    },
  };
}

async function searchProjects(ctx: AuthContext, args: Record<string, unknown>) {
  const limit = boundedLimit(args.limit, 20, 50);
  let q = admin
    .from("projects")
    .select("id,name,description,scope,status,project_type,budget,spent,start_date,target_end_date,actual_end_date,client_id,property_id,clients(name,workspace_id),properties(name,workspace_id,address,city,state)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (typeof args.status === "string" && args.status.trim()) q = q.eq("status", args.status.trim());
  if (typeof args.project_type === "string" && args.project_type.trim()) q = q.eq("project_type", args.project_type.trim());

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const text = String(args.query ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as any[])
    .filter((project) => projectBelongsToTenant(project, ctx.tenantId))
    .filter((project) => {
      if (!text) return true;
      const haystack = [
        project.name,
        project.description,
        project.scope,
        project.clients?.name,
        project.properties?.name,
        project.properties?.address,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(text);
    })
    .slice(0, limit)
    .map(projectCard);

  return { count: rows.length, projects: rows };
}

async function getProjectContext(ctx: AuthContext, args: Record<string, unknown>) {
  const projectId = requiredString(args.project_id, "project_id");
  const project = await loadAuthorizedProject(ctx, projectId);

  const [updates, actionItems, meetings] = await Promise.all([
    admin.from("client_updates")
      .select("id,title,period_label,health,summary,status,published_at,updated_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(10),
    admin.from("project_action_items")
      .select("id,title,description,status,priority,due_date,completed_at,tags,created_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(50),
    admin.from("consulting_meetings")
      .select("id,title,meeting_date,attendees,minutes,created_at,updated_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("project_id", projectId)
      .order("meeting_date", { ascending: false })
      .limit(10),
  ]);

  if (updates.error) throw new Error(updates.error.message);
  if (actionItems.error) throw new Error(actionItems.error.message);
  if (meetings.error) throw new Error(meetings.error.message);

  return {
    project: projectCard(project),
    recent_client_updates: updates.data ?? [],
    action_items: actionItems.data ?? [],
    recent_meetings: meetings.data ?? [],
  };
}

async function listActionItems(ctx: AuthContext, args: Record<string, unknown>) {
  const projectId = requiredString(args.project_id, "project_id");
  await loadAuthorizedProject(ctx, projectId);
  const limit = boundedLimit(args.limit, 50, 100);

  let q = admin.from("project_action_items")
    .select("id,title,description,status,priority,due_date,completed_at,tags,created_at,updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (typeof args.status === "string" && args.status.trim()) q = q.eq("status", args.status.trim());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, action_items: data ?? [] };
}

async function createActionItem(ctx: AuthContext, args: Record<string, unknown>) {
  const projectId = requiredString(args.project_id, "project_id");
  const title = requiredString(args.title, "title");
  await loadAuthorizedProject(ctx, projectId);
  requireActor(ctx);

  const { data, error } = await admin.from("project_action_items").insert({
    project_id: projectId,
    title,
    description: typeof args.description === "string" ? args.description : null,
    priority: validChoice(args.priority, ["urgent", "high", "medium", "low"], "medium"),
    due_date: typeof args.due_date === "string" ? args.due_date : null,
    tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
    created_by: ctx.createdBy,
  }).select("id,title,status,priority,due_date,created_at").single();

  if (error) throw new Error(error.message);
  return { created: true, action_item: data };
}

async function createClientUpdateDraft(ctx: AuthContext, args: Record<string, unknown>) {
  const projectId = requiredString(args.project_id, "project_id");
  const title = requiredString(args.title, "title");
  await loadAuthorizedProject(ctx, projectId);

  const { data, error } = await admin.from("client_updates").insert({
    tenant_id: ctx.tenantId,
    project_id: projectId,
    title,
    period_label: typeof args.period_label === "string" ? args.period_label : null,
    health: validChoice(args.health, ["on_track", "at_risk", "delayed"], "on_track"),
    summary: typeof args.summary === "string" ? args.summary : null,
    accomplishments: Array.isArray(args.accomplishments) ? args.accomplishments : [],
    risks: Array.isArray(args.risks) ? args.risks : [],
    decisions: Array.isArray(args.decisions) ? args.decisions : [],
    action_items: Array.isArray(args.action_items) ? args.action_items : [],
    next_steps: Array.isArray(args.next_steps) ? args.next_steps : [],
    status: "draft",
    created_by: ctx.createdBy,
  }).select("id,title,status,health,updated_at").single();

  if (error) throw new Error(error.message);
  return { created: true, client_update: data, note: "Draft only. Review and publish from Proj OS." };
}

async function recordProjectNote(ctx: AuthContext, args: Record<string, unknown>) {
  const projectId = requiredString(args.project_id, "project_id");
  const subject = requiredString(args.subject, "subject");
  await loadAuthorizedProject(ctx, projectId);

  const { data, error } = await admin.from("project_communications").insert({
    project_id: projectId,
    type: "note",
    subject,
    content: typeof args.content === "string" ? args.content : null,
    participants: Array.isArray(args.participants) ? args.participants.map(String) : [],
    created_by: ctx.createdBy,
  }).select("id,subject,type,created_at").single();

  if (error) throw new Error(error.message);
  return { created: true, note: data };
}

async function loadAuthorizedProject(ctx: AuthContext, projectId: string) {
  const { data, error } = await admin
    .from("projects")
    .select("id,name,description,scope,status,project_type,budget,spent,start_date,target_end_date,actual_end_date,client_id,property_id,clients(name,workspace_id),properties(name,workspace_id,address,city,state)")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !projectBelongsToTenant(data, ctx.tenantId)) throw new McpError(-32004, "project_not_found");
  return data as any;
}

function projectBelongsToTenant(project: any, tenantId: string): boolean {
  return project?.properties?.workspace_id === tenantId || project?.clients?.workspace_id === tenantId;
}

function projectCard(project: any) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    project_type: project.project_type,
    description: project.description,
    scope: project.scope,
    budget: project.budget,
    spent: project.spent,
    start_date: project.start_date,
    target_end_date: project.target_end_date,
    actual_end_date: project.actual_end_date,
    client: project.clients?.name ?? null,
    property: project.properties?.name ?? null,
    property_address: project.properties?.address ?? null,
  };
}

function toolsForScopes(scopes: string[]) {
  return TOOL_DEFINITIONS.filter((tool) => {
    if (tool.name.includes("search") || tool.name.includes("get_") || tool.name.includes("list_")) {
      return scopes.includes("read:mcp") && scopes.includes("read:projects");
    }
    if (tool.name === "proj_os.create_client_update_draft") {
      return scopes.includes("write:client-updates");
    }
    return scopes.includes("write:projects");
  });
}

function requireScope(ctx: AuthContext, scope: string) {
  if (!ctx.scopes.includes(scope)) throw new McpError(-32002, `insufficient_scope:${scope}`);
}

function requireActor(ctx: AuthContext) {
  if (!ctx.createdBy) throw new McpError(-32002, "api_client_missing_created_by");
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new McpError(-32602, `${field}_required`);
  return value.trim();
}

function boundedLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function validChoice(value: unknown, choices: string[], fallback: string): string {
  return typeof value === "string" && choices.includes(value) ? value : fallback;
}

function toolResult(value: unknown) {
  const text = JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent: value,
  };
}

function negotiatedProtocolVersion(rpc: JsonRpcRequest): string {
  const requested = String(rpc.params?.protocolVersion ?? "");
  return requested.startsWith("2024-") || requested.startsWith("2025-") || requested.startsWith("2026-")
    ? requested
    : PROTOCOL_VERSION;
}

function readClientName(rpc: JsonRpcRequest): string | null {
  return typeof rpc.params?.clientInfo === "object" && rpc.params.clientInfo
    ? String((rpc.params.clientInfo as any).name ?? "") || null
    : null;
}

function readClientVersion(rpc: JsonRpcRequest): string | null {
  return typeof rpc.params?.clientInfo === "object" && rpc.params.clientInfo
    ? String((rpc.params.clientInfo as any).version ?? "") || null
    : null;
}

function toolName(rpc: JsonRpcRequest): string | null {
  return rpc.method === "tools/call" && rpc.params ? String(rpc.params.name ?? "") || null : null;
}

async function logAccess(
  ctx: AuthContext,
  method: string,
  tool: string | null,
  status: "ok" | "error",
  errorCode: string | null,
  req: Request,
  requestId: unknown,
) {
  try {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
    await admin.from("mcp_access_logs").insert({
      tenant_id: ctx.tenantId,
      api_client_id: ctx.apiClientId,
      method,
      tool_name: tool,
      status,
      error_code: errorCode,
      request_id: requestId === undefined || requestId === null ? null : String(requestId),
      client_name: ctx.clientName,
      client_version: ctx.clientVersion,
      ip_hash: ip ? await sha256Hex(ip) : null,
    });
    await admin.rpc("bump_api_usage", {
      p_tenant_id: ctx.tenantId,
      p_client_id: ctx.apiClientId,
      p_is_error: status === "error",
    } as any);
  } catch (err) {
    console.error("[proj-os-mcp] audit_log_failed", err instanceof Error ? err.message : err);
  }
}

function validateOrigin(req: Request): { ok: boolean } {
  const origin = req.headers.get("Origin");
  if (!origin) return { ok: true };
  const allowed = (Deno.env.get("PROJOS_MCP_ALLOWED_ORIGINS") ??
    "https://projos.ai,https://www.projos.ai,https://claude.ai,https://app.claude.ai,http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { ok: allowed.includes(origin) };
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  const allowedOrigin = origin && validateOrigin(req).ok ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-method, mcp-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function jsonRpcHttp(id: unknown, payload: Record<string, unknown>, status = 200, headers: Record<string, string>) {
  const body = "result" in payload
    ? { jsonrpc: "2.0", id: id ?? null, result: payload.result }
    : { jsonrpc: "2.0", id: id ?? null, error: payload.error };
  return new Response(JSON.stringify(body), { status, headers });
}

function errorObject(code: number, message: string) {
  return { code, message };
}

function statusFor(code: number): number {
  if (code === -32001) return 401;
  if (code === -32002 || code === -32003) return 403;
  if (code === -32004) return 404;
  if (code === -32602) return 400;
  return 200;
}

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

class McpError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}
