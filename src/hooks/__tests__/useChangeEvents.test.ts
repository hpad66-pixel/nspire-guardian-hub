/**
 * G5 · useChangeEvents smoke tests.
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

import { useChangeEvents } from "../useChangeEvents";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useChangeEvents", () => {
  beforeEach(() => __mock.reset());

  it("disabled until projectId is provided", () => {
    const { result } = renderHookWithClient(() => useChangeEvents(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads the change_events table for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "ce1", title: "Owner-directed scope change" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useChangeEvents("proj-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("change_events");
  });

  it("propagates errors to the query state", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "boom" } as any,
    }));
    const { result } = renderHookWithClient(() => useChangeEvents("proj-1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
