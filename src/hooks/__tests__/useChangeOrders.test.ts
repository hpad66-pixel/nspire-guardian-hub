/**
 * G5 · useChangeOrders smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
// useChangeOrders depends on these two helpers, not useAuth directly.
// Mocking isAdmin=true short-circuits the project-allowlist branch so
// the queryFn falls through to the supabase mock.
vi.mock("@/hooks/usePermissions", () => ({
  useUserPermissions: () => ({ isAdmin: true }),
}));
vi.mock("@/hooks/propertyAccess", () => ({
  getAssignedProjectIds: vi.fn(async () => []),
}));

import { useChangeOrdersByProject } from "../useChangeOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useChangeOrdersByProject", () => {
  beforeEach(() => __mock.reset());

  it("disabled until projectId is provided", () => {
    const { result } = renderHookWithClient(() => useChangeOrdersByProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches change_orders for the given project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "co1", project_id: "p1", co_no: "OCO-001" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() =>
      useChangeOrdersByProject("p1"),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].co_no).toBe("OCO-001");
  });

  it("surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() =>
      useChangeOrdersByProject("p1"),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
