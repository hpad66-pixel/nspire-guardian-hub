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

  test("MCP publishes the initial CRM and project tools", async () => {
    const response = await onRequest({ request: mcpRequest("tools/list"), env });
    const body = await response.json() as { result: { tools: Array<{ name: string }> } };
    const names = body.result.tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining([
      "proj_os_search_projects",
      "proj_os_search_contacts",
      "proj_os_create_contact",
      "proj_os_link_contact_to_project",
      "proj_os_create_project_task",
      "proj_os_get_project_summary",
    ]));
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
    expect(ui).toContain('"read:contacts", "write:contacts"');
    expect(ui).toContain('"read:action-items", "write:action-items"');
    expect(spec).toContain("title: Proj OS Public API");
    expect(spec).toContain("/api-v1/project-directory:");
    expect(spec).toContain("/api-v1/project-status:");
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
