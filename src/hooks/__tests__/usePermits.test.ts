/**
 * usePermits — property-scoped permits with a property allowlist gate.
 * Covers: list happy path (admin short-circuit), property-scoped filter,
 * create (stamps created_by from useAuth), and the error path.
 *
 * Note: usePermits depends on useUserPermissions + useProperties, NOT a simple
 * (projectId) param. Mocking isAdmin=true short-circuits the allowlist branch so
 * the queryFn falls through to the supabase mock. The list query is enabled once
 * permissions resolve, so it's not gated on an id — there is no "idle" case here.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/usePermissions", () => ({
  useUserPermissions: () => ({ isAdmin: true, isLoading: false }),
}));
vi.mock("@/hooks/useProperties", () => ({
  useProperties: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import { usePermits, useCreatePermit } from "../usePermits";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("usePermits", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("lists permits for an admin (allowlist short-circuited)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [{ id: "pm1", property_id: "prop1", status: "active" }],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => usePermits());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].status).toBe("active");
  });

  it("scopes the query by property_id when one is provided", async () => {
    const builder = makeBuilder({ data: [], error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePermits("prop-9"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["property_id", "prop-9"]]),
    );
  });

  it("create stamps created_by on the inserted permit", async () => {
    const builder = makeBuilder({ data: { id: "pm-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreatePermit());

    const row = await result.current.mutateAsync({
      property_id: "prop1",
      permit_type: "occupancy",
      status: "active",
    } as any);
    expect((row as any).id).toBe("pm-new");
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ property_id: "prop1", created_by: "u1" });
  });

  it("surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => usePermits());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
