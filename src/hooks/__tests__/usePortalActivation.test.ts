import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useSetPortalLive } from "../usePortal";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useSetPortalLive", () => {
  beforeEach(() => __mock.reset());

  it("activates a portal for the owner", async () => {
    const builder = makeBuilder({
      data: { id: "portal-1", is_active: true, status: "active" },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useSetPortalLive());
    result.current.mutate({ id: "portal-1", live: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(builder.update).toHaveBeenCalledWith({ is_active: true, status: "active" });
  });

  it("pauses a live portal", async () => {
    const builder = makeBuilder({
      data: { id: "portal-1", is_active: false, status: "draft" },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useSetPortalLive());
    result.current.mutate({ id: "portal-1", live: false });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(builder.update).toHaveBeenCalledWith({ is_active: false, status: "draft" });
  });

  it("surfaces update errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null,
      error: { message: "not allowed" } as any,
    }));
    const { result } = renderHookWithClient(() => useSetPortalLive());
    result.current.mutate({ id: "portal-1", live: true });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
