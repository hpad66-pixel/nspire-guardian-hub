/**
 * G5 · useDrawings smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useDrawings } from "../useDrawings";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useDrawings", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => useDrawings(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads drawings for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "d1", number: "A-101" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useDrawings("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("drawings");
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useDrawings("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
