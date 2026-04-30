import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  canUseFeature,
  requireFeature,
  canAddSeat,
  PlanLimitError,
  startCheckout,
} from "@/lib/billing";

describe("billing (A6)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("canUseFeature returns true when RPC is true", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
    expect(await canUseFeature("sso")).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("can_use_feature", { p_feature: "sso" });
  });

  it("canUseFeature returns false when RPC errors", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("x") });
    expect(await canUseFeature("api")).toBe(false);
  });

  it("requireFeature throws PlanLimitError when denied", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: false, error: null });
    await expect(requireFeature("sso")).rejects.toBeInstanceOf(PlanLimitError);
  });

  it("canAddSeat returns boolean based on RPC", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
    expect(await canAddSeat(4)).toBe(true);
    (supabase.rpc as any).mockResolvedValue({ data: false, error: null });
    expect(await canAddSeat(5)).toBe(false);
  });

  it("startCheckout returns URL from edge function", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { url: "https://checkout.stripe.com/abc" },
      error: null,
    });
    expect(await startCheckout("pro")).toBe("https://checkout.stripe.com/abc");
  });

  it("startCheckout throws when no URL returned", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: {}, error: null });
    await expect(startCheckout("starter")).rejects.toThrow(/checkout URL/i);
  });
});
