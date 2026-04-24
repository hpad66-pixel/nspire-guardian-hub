/**
 * F3 · Public API — openapi.yaml is served from /public.
 */
import { test, expect } from "@playwright/test";

test.describe("F3 Public API docs", () => {
  test("openapi.yaml is reachable", async ({ request }) => {
    const res = await request.get("/openapi.yaml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("openapi: 3.1.0");
    expect(body).toContain("Procore Lite Public API");
  });
});
