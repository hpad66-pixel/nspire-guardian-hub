import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { getTenantContext, requireTenantId } from "@/lib/tenant";

/** Build a fake JWT with the given claims (no signature — server verifies). */
function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(claims));
  return `${header}.${body}.fake-signature`;
}

describe("tenant helpers (A1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty context when no session", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    const ctx = await getTenantContext();
    expect(ctx.tenant_id).toBeNull();
    expect(ctx.workspace_ids).toEqual([]);
    expect(ctx.is_super_admin).toBe(false);
  });

  it("extracts tenant_id and workspace_ids from JWT", async () => {
    const token = makeJwt({
      tenant_id: "11111111-1111-1111-1111-111111111111",
      workspace_ids: ["aaa", "bbb"],
      role: "member",
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: token } },
    });
    const ctx = await getTenantContext();
    expect(ctx.tenant_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(ctx.workspace_ids).toEqual(["aaa", "bbb"]);
    expect(ctx.is_super_admin).toBe(false);
  });

  it("flags super_admin role", async () => {
    const token = makeJwt({ tenant_id: "t", role: "super_admin" });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: token } },
    });
    const ctx = await getTenantContext();
    expect(ctx.is_super_admin).toBe(true);
  });

  it("requireTenantId throws when not signed in", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    await expect(requireTenantId()).rejects.toThrow(/tenant_id/);
  });

  it("requireTenantId returns id when present", async () => {
    const token = makeJwt({ tenant_id: "abc" });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: token } },
    });
    await expect(requireTenantId()).resolves.toBe("abc");
  });
});
