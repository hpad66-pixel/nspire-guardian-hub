/**
 * G4 · useWebhooks tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "tenant-1"),
}));

import { useWebhooks } from "../useWebhooks";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useWebhooks", () => {
  beforeEach(() => __mock.reset());

  it("list returns webhook_subscriptions rows", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "wh1", url: "https://x.test", events: ["rfi.created"] }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useWebhooks());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].url).toBe("https://x.test");
  });

  it("create rejects when url is empty (validation path)", async () => {
    const { result } = renderHookWithClient(() => useWebhooks());
    // The list query auto-runs on mount; clear the spy so we observe
    // only what the mutation does.
    __mock.from.mockClear();
    await expect(
      result.current.create.mutateAsync({ url: "", events: ["rfi.created"] })
    ).rejects.toThrow(/url is required/);
    expect(__mock.from).not.toHaveBeenCalled();
  });

  it("create rejects when events array is empty", async () => {
    const { result } = renderHookWithClient(() => useWebhooks());
    __mock.from.mockClear();
    await expect(
      result.current.create.mutateAsync({ url: "https://x.test", events: [] })
    ).rejects.toThrow(/event_type/);
    expect(__mock.from).not.toHaveBeenCalled();
  });

  it("create writes a whsec_-prefixed secret", async () => {
    const builder = makeBuilder({
      data: { id: "wh1", url: "https://x.test", events: ["rfi.created"] },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useWebhooks());
    await result.current.create.mutateAsync({
      url: "https://x.test", events: ["rfi.created"],
    });
    const insertArg = builder.insert.mock.calls[0]?.[0] as any;
    expect(insertArg.secret).toMatch(/^whsec_/);
    expect(insertArg.secret.length).toBeGreaterThan(40);
  });

  it("rotate calls webhook-secret-rotate edge function and returns plaintext once", async () => {
    __mock.invoke.mockResolvedValue({
      data: { webhook_id: "wh1", signing_secret: "whsec_NEWSECRET" },
      error: null,
    });
    const { result } = renderHookWithClient(() => useWebhooks());
    const out = await result.current.rotate.mutateAsync("wh1");
    expect(__mock.invoke).toHaveBeenCalledWith(
      "webhook-secret-rotate",
      { body: { webhook_id: "wh1" } },
    );
    expect(out.signing_secret).toBe("whsec_NEWSECRET");
  });

  it("rotate throws if edge function did not return a plaintext", async () => {
    __mock.invoke.mockResolvedValue({ data: { webhook_id: "wh1" }, error: null });
    const { result } = renderHookWithClient(() => useWebhooks());
    await expect(result.current.rotate.mutateAsync("wh1")).rejects.toThrow(
      /did not return a plaintext/,
    );
  });

  it("remove flips is_active to false", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useWebhooks());
    await result.current.remove.mutateAsync("wh1");
    const updateArg = builder.update.mock.calls[0]?.[0] as any;
    expect(updateArg.is_active).toBe(false);
  });
});
