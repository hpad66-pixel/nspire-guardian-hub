/**
 * G5 · useIncidents smoke tests.
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

import { useIncidents } from "../useIncidents";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useIncidents", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => useIncidents(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads incidents for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "i1", title: "Slip & fall in NW corridor" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useIncidents("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("incidents");
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useIncidents("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
