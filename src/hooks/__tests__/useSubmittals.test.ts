/**
 * G5 · useSubmittalsByProject smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useSubmittalsByProject } from "../useSubmittals";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useSubmittalsByProject", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => useSubmittalsByProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns submittals for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "s1", title: "Spec section 03 30 00" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useSubmittalsByProject("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useSubmittalsByProject("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
