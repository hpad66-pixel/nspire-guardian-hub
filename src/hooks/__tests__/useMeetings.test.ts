/**
 * G5 · useMeetings smoke tests.
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

import { useMeetings } from "../useMeetings";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useMeetings", () => {
  beforeEach(() => __mock.reset());

  it("idle when projectId is null", () => {
    const { result } = renderHookWithClient(() => useMeetings(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads project_meetings for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "m1", title: "Weekly OAC" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useMeetings("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("project_meetings");
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useMeetings("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
