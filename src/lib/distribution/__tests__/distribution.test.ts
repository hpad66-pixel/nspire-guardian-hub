import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { resolveDistribution } from "@/lib/distribution";

describe("distribution.resolveDistribution (A3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deduplicates recipients by email", async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        { user_id: "u1", contact_id: null, email: "a@x.com", role_label: null },
        { user_id: null, contact_id: "c1", email: "b@x.com", role_label: null },
      ],
      error: null,
    });
    const rs = await resolveDistribution({
      listIds: ["list-1"],
      userIds: ["u1"],
      extraEmails: ["a@x.com"],
    });
    expect(rs).toHaveLength(2);
    expect(rs.map((r) => r.email).sort()).toEqual(["a@x.com", "b@x.com"]);
  });

  it("throws when RPC errors", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("x") });
    await expect(resolveDistribution({})).rejects.toThrow(/x/);
  });
});
