/**
 * G5 · usePunchItemsByProject smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { usePunchItemsByProject } from "../usePunchItems";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("usePunchItemsByProject", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => usePunchItemsByProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches punch_items for the given project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "p1", title: "Touch-up paint at unit 203" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => usePunchItemsByProject("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toMatch(/touch-up/i);
  });

  it("surfaces select errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => usePunchItemsByProject("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
