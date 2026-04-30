/**
 * G5 · usePhotos smoke tests.
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

import { usePhotos } from "../usePhotos";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("usePhotos", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => usePhotos(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads photos for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "ph1", project_id: "p1" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => usePhotos("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("photos");
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => usePhotos("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
