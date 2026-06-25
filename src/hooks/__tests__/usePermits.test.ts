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

import {
  usePermits,
  usePermit,
  usePermitStats,
  useExpiringPermits,
  useCreatePermit,
  useUpdatePermit,
  useDeletePermit,
} from "../usePermits";
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

describe("usePermit (single)", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("is disabled until an id is provided", () => {
    const { result } = renderHookWithClient(() => usePermit(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns the permit for an admin (allowlist bypassed)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: { id: "pm1", property_id: "prop1", status: "active" }, error: null }),
    );
    const { result } = renderHookWithClient(() => usePermit("pm1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("pm1");
  });

  it("surfaces a fetch error as a query error", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => usePermit("pm1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("usePermitStats", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("aggregates permit + requirement counts (two-table flow)", async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const permitsBuilder = makeBuilder({
      data: [
        { id: "pm1", status: "active", expiry_date: soon, property_id: "prop1" },
        { id: "pm2", status: "expired", expiry_date: null, property_id: "prop1" },
      ],
      error: null,
    });
    const reqsBuilder = makeBuilder({
      data: [
        { id: "r1", status: "non_compliant", next_due_date: now.toISOString(), permit_id: "pm1" },
      ],
      error: null,
    });
    __mock.from.mockImplementation(((table: string) =>
      table === "permit_requirements" ? reqsBuilder : permitsBuilder) as any);

    const { result } = renderHookWithClient(() => usePermitStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      active: 1,
      expiringSoon: 1,
      nonCompliant: 1,
      total: 2,
    });
  });

  it("propagates a permits-query error", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => usePermitStats());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useExpiringPermits", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("lists active permits within the window (admin path)", async () => {
    const builder = makeBuilder({
      data: [{ id: "pm1", status: "active", property_id: "prop1" }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useExpiringPermits(15));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("pm1");
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["status", "active"]]),
    );
  });

  it("surfaces errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useExpiringPermits());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdatePermit / useDeletePermit", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("update applies the supplied fields and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pm1", status: "expired" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUpdatePermit());

    const row = await result.current.mutateAsync({ id: "pm1", status: "expired" } as any);
    expect((row as any).id).toBe("pm1");
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ status: "expired" });
    // id is stripped from the update payload (used only in the .eq filter)
    expect(updated).not.toHaveProperty("id");
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["id", "pm1"]]),
    );
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useUpdatePermit());
    await expect(
      result.current.mutateAsync({ id: "pm1", status: "x" } as any),
    ).rejects.toBeTruthy();
  });

  it("delete filters by id and resolves on success", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useDeletePermit());

    await result.current.mutateAsync("pm1");
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["id", "pm1"]]),
    );
  });

  it("delete surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useDeletePermit());
    await expect(result.current.mutateAsync("pm1")).rejects.toBeTruthy();
  });
});
