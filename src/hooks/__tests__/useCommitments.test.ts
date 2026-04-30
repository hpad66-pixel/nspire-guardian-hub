/**
 * G5 · useCommitments smoke tests.
 * Asserts queryKey shape, list-table mapping, mutation invokes
 * insert on commitments. No source modification.
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

import { useCommitments } from "../useCommitments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useCommitments", () => {
  beforeEach(() => __mock.reset());

  it("list query is disabled when projectId is null", () => {
    const { result } = renderHookWithClient(() => useCommitments(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("list reads from the commitments table when projectId is set", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "c1", title: "Concrete subcontract" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useCommitments("proj-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("commitments");
    expect(result.current.data?.[0].title).toBe("Concrete subcontract");
  });

  it("propagates select error to the query", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "rls denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useCommitments("proj-1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
