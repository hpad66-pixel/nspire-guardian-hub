import { describe, expect, it } from "vitest";
import { onRequest } from "../../../../functions/mcp.js";

function request() {
  return new Request("https://projos.ai/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer test-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
}

describe("legacy shared-secret MCP containment", () => {
  it("is unavailable by default", async () => {
    const response = await onRequest({
      request: request(),
      env: { PROJ_OS_MCP_SHARED_SECRET: "test-secret" },
    });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Proj OS Agent Gateway");
  });

  it("requires an explicit temporary migration flag", async () => {
    const response = await onRequest({
      request: request(),
      env: {
        PROJ_OS_LEGACY_MCP_ENABLED: "true",
        PROJ_OS_MCP_SHARED_SECRET: "test-secret",
      },
    });
    expect(response.status).toBe(200);
  });
});
