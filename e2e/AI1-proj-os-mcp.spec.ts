import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequest } from "../functions/mcp.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

function mcpRequest(method: string, params: unknown = {}) {
  return new Request("https://projos.ai/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer test-secret",
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

const env = { PROJ_OS_MCP_SHARED_SECRET: "test-secret" };

test.describe("AI1 Proj OS agent API and MCP", () => {
  test("MCP initializes as Proj OS", async () => {
    const response = await onRequest({
      request: mcpRequest("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } }),
      env,
    });
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(body.result.protocolVersion).toBe("2025-11-25");
    expect(body.result.serverInfo.name).toBe("proj-os");
  });

  test("MCP publishes CRM, project, and financial tools", async () => {
    const response = await onRequest({ request: mcpRequest("tools/list"), env });
    const body = await response.json() as { result: { tools: Array<{ name: string }> } };
    const names = body.result.tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining([
      "proj_os_search_projects",
      "proj_os_list_projects",
      "proj_os_search_contacts",
      "proj_os_create_contact",
      "proj_os_link_contact_to_project",
      "proj_os_create_project_task",
      "proj_os_get_project_summary",
      "proj_os_create_change_order",
      "proj_os_create_proposal",
      "proj_os_create_invoice",
      "proj_os_list_change_orders",
      "proj_os_list_proposals",
      "proj_os_list_invoices",
      "proj_os_health",
      "proj_os_update_project",
      "proj_os_list_client_updates",
      "proj_os_create_client_update",
      "proj_os_publish_client_update",
      "proj_os_list_project_updates",
      "proj_os_post_project_update",
    ]));
  });

  test("MCP posts one atomic project-and-portal update through the OAuth API", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/oauth-token")) {
        return new Response(JSON.stringify({ access_token: "oauth-test-token", expires_in: 3600 }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api-v1/project-updates")) {
        return new Response(JSON.stringify({ data: {
          project_id: "11111111-1111-4111-8111-111111111111",
          destination: "both",
          project_update_id: "22222222-2222-4222-8222-222222222222",
          client_update_id: "33333333-3333-4333-8333-333333333333",
        } }), { status: 201, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "unexpected_url" }), { status: 500 });
    }) as typeof fetch;

    try {
      const response = await onRequest({
        request: mcpRequest("tools/call", {
          name: "proj_os_post_project_update",
          arguments: {
            project_id: "11111111-1111-4111-8111-111111111111",
            destination: "both",
            title: "Pump station milestone",
            summary: "The verified inspection was completed.",
            portal_status: "published",
          },
        }),
        env: {
          ...env,
          PROJ_OS_CLIENT_ID: "client-id",
          PROJ_OS_CLIENT_SECRET: "client-secret",
          PROJ_OS_SUPABASE_FUNCTIONS_URL: "https://example.supabase.co/functions/v1",
        },
      });
      const body = await response.json() as any;
      expect(body.result.isError).toBe(false);
      expect(body.result.structuredContent.data.destination).toBe("both");
      expect(calls).toHaveLength(2);
      expect(calls[1].url).toContain("/api-v1/project-updates");
      expect(calls[1].init?.headers).toMatchObject({
        authorization: "Bearer oauth-test-token",
        "x-proj-requester-id": "hermes",
      });
      expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({
        destination: "both",
        portal_status: "published",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("MCP GET preflight returns JSON so Hermes does not reject the endpoint", async () => {
    const request = new Request("https://projos.ai/mcp", {
      method: "GET",
      headers: { accept: "application/json, text/event-stream" },
    });
    const response = await onRequest({ request, env });
    expect(response.status).toBe(405);
    expect(response.headers.get("content-type") || "").toContain("application/json");
  });

  test("MCP accepts Cursor Origin when the shared bearer is present", async () => {
    const request = mcpRequest("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "cursor", version: "1" } });
    request.headers.set("origin", "https://cursor.com");
    const response = await onRequest({ request, env });
    expect(response.status).toBe(200);
    const body = await response.json() as { result: { serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBe("proj-os");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://cursor.com");
  });

  test("MCP rejects Cursor Origin without a bearer as 401, not Origin 403", async () => {
    const request = mcpRequest("tools/list");
    request.headers.delete("authorization");
    request.headers.set("origin", "https://cursor.com");
    const response = await onRequest({ request, env });
    expect(response.status).toBe(401);
  });

  test("MCP rejects untrusted Origin without a bearer", async () => {
    const request = mcpRequest("tools/list");
    request.headers.delete("authorization");
    request.headers.set("origin", "https://evil.example");
    const response = await onRequest({ request, env });
    expect(response.status).toBe(403);
  });

  test("MCP answers CORS preflight", async () => {
    const request = new Request("https://projos.ai/mcp", {
      method: "OPTIONS",
      headers: { origin: "https://cursor.com", "access-control-request-method": "POST" },
    });
    const response = await onRequest({ request, env });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://cursor.com");
  });

  test("MCP rejects missing authentication", async () => {
    const request = mcpRequest("tools/list");
    request.headers.delete("authorization");
    const response = await onRequest({ request, env });
    expect(response.status).toBe(401);
  });

  test("public API enforces workspace project boundaries", () => {
    const source = read("supabase/functions/api-v1/index.ts");
    expect(source).toContain("listAuthorizedProjects(ctx.tenantId)");
    expect(source).toContain("requireProject(ctx.tenantId");
    expect(source).toContain('.eq("workspace_id", tenantId)');
    expect(source).not.toContain('admin.from("projects").select("*")');
  });

  test("write operations require idempotency and produce audit entries", () => {
    const source = read("supabase/functions/api-v1/index.ts");
    expect(source).toContain("idempotency_key_required");
    expect(source).toContain('admin.from("agent_api_audit_log").insert');
    expect(source).toContain("x-proj-requester-id");
    const migration = read("supabase/migrations/20260827220000_agent_api_audit_log.sql");
    expect(migration).toContain("tenant_id uuid NOT NULL REFERENCES public.workspaces(id)");
    expect(migration).toContain("agent_api_audit_tenant_select");
  });

  test("API client UI and OpenAPI advertise agent scopes", () => {
    const ui = read("src/components/settings/api/CreateApiClientDialog.tsx");
    const spec = read("public/openapi.yaml");
    const api = read("supabase/functions/api-v1/index.ts");
    expect(ui).toContain('"read:contacts", "write:contacts"');
    expect(ui).toContain('"read:action-items", "write:action-items"');
    expect(ui).toContain('"read:proposals", "write:proposals"');
    expect(ui).toContain('"read:pay-apps", "write:pay-apps"');
    expect(ui).toContain('"read:projects", "write:projects"');
    expect(ui).toContain('"read:client-updates", "write:client-updates"');
    expect(ui).toContain('"read:project-updates", "write:project-updates"');
    expect(spec).toContain("title: Proj OS Public API");
    expect(spec).toContain("/api-v1/project-directory:");
    expect(spec).toContain("/api-v1/project-status:");
    expect(spec).toContain("/api-v1/proposals:");
    expect(spec).toContain("/api-v1/pay-apps:");
    expect(spec).toContain("/api-v1/projects/{id}:");
    expect(spec).toContain("/api-v1/client-updates:");
    expect(spec).toContain("/api-v1/project-updates:");
    expect(api).toContain('case "proposals"');
    expect(api).toContain('case "pay-apps"');
    expect(api).toContain('case "client-updates"');
    expect(api).toContain('case "project-updates"');
    expect(api).toContain("routeChangeOrders");
    expect(api).toContain("projectSearchHaystack");
    expect(api).toContain("meta.program_key");
    const grant = read("supabase/migrations/20260902180000_grant_agent_client_updates_api_scope.sql");
    expect(grant).toContain("write:projects");
    expect(grant).toContain("read:client-updates");
    expect(grant).toContain("write:client-updates");
    const registry = read("supabase/migrations/20260903190000_hermes_project_registry.sql");
    expect(registry).toContain("ALTER COLUMN workspace_id SET NOT NULL");
    expect(registry).toContain("agent_post_project_update");
    expect(registry).toContain("write:project-updates");
    const hermes = read("hermes/config.yaml.example");
    expect(hermes).toContain("skip_preflight: true");
    expect(hermes).toContain('include: ["proj_os_*"]');
    const skill = read("hermes/skills/proj-os/SKILL.md");
    expect(skill).toContain("live, workspace-scoped project registry");
    expect(skill).toContain("destination=both");
  });

  test("API client mint accepts browser requests and verifies auth in-function", () => {
    const mint = read("supabase/functions/api-key-mint/index.ts");
    const config = read("supabase/config.toml");
    expect(mint).toContain("authorization, x-client-info, apikey, content-type");
    expect(mint).toContain("userClient.auth.getUser()");
    expect(mint).toContain('userClient.rpc("can" as any');
    expect(mint).not.toContain('admin.rpc("can" as any');
    expect(mint).toContain('userClient.rpc("can_use_feature" as any');
    expect(mint).not.toContain('admin.rpc("can_use_feature" as any');
    expect(config).toContain("[functions.api-key-mint]\nverify_jwt = false");
  });
});
