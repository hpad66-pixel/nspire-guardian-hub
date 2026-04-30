import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { can, permissionLevel, requireCan, ForbiddenError } from "@/lib/rbac";

describe("rbac (A2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("can() returns true when RPC returns true", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
    const ok = await can({ userId: "u", module: "rfis", action: "view" });
    expect(ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "can",
      expect.objectContaining({ p_module: "rfis", p_action: "view", p_min_level: "read" }),
    );
  });

  it("can() returns false when RPC errors", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("boom") });
    const ok = await can({ userId: "u", module: "budget", action: "edit" });
    expect(ok).toBe(false);
  });

  it("permissionLevel() returns 'none' on error", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("x") });
    const lvl = await permissionLevel("u", "budget", "edit");
    expect(lvl).toBe("none");
  });

  it("requireCan throws ForbiddenError when denied", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: false, error: null });
    await expect(
      requireCan({ userId: "u", module: "budget", action: "delete" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requireCan resolves when allowed", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
    await expect(
      requireCan({ userId: "u", module: "rfis", action: "view" }),
    ).resolves.toBeUndefined();
  });
});
