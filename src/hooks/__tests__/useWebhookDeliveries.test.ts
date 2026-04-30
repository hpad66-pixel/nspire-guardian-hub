/**
 * G4 · useWebhookDeliveries tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useWebhookDeliveries } from "../useWebhookDeliveries";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useWebhookDeliveries", () => {
  beforeEach(() => __mock.reset());

  it("list query is disabled when webhookId is null", () => {
    const { result } = renderHookWithClient(() => useWebhookDeliveries(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("list returns deliveries when webhookId is set", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "d1", event_type: "rfi.created", response_status: 200 }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useWebhookDeliveries("wh1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].event_type).toBe("rfi.created");
  });

  it("redeliver calls webhook-redeliver edge function with delivery_id", async () => {
    __mock.invoke.mockResolvedValue({
      data: { new_delivery_id: "d2" }, error: null,
    });
    const { result } = renderHookWithClient(() => useWebhookDeliveries("wh1"));
    const out = await result.current.redeliver.mutateAsync("d1");
    expect(__mock.invoke).toHaveBeenCalledWith(
      "webhook-redeliver",
      { body: { delivery_id: "d1" } },
    );
    expect(out.new_delivery_id).toBe("d2");
  });

  it("redeliver propagates edge function errors", async () => {
    __mock.invoke.mockResolvedValue({
      data: null, error: { message: "boom" } as any,
    });
    const { result } = renderHookWithClient(() => useWebhookDeliveries("wh1"));
    await expect(result.current.redeliver.mutateAsync("d1")).rejects.toBeTruthy();
  });
});
