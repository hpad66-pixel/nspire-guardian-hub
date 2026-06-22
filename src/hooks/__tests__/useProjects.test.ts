/**
 * useProjects — projects list/detail (RBAC-scoped) + create/update/delete.
 * Covers: detail-query gating, the admin list happy path, the create insert
 * payload (stamps created_by from the auth user), the update path, and error
 * surfacing on delete.
 *
 * Note: the list/detail queries branch on useUserPermissions().isAdmin and
 * useAuth().user. We mock isAdmin=true so the queryFn takes the admin path
 * (plain select+order, no .or()/.in() the shared builder doesn't model) and
 * mock a present user so the queries are enabled. The mutations don't touch
 * permissions.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
const mockPermissions = vi.fn(() => ({ isAdmin: true, isLoading: false }));
vi.mock("../usePermissions", () => ({
  useUserPermissions: () => mockPermissions(),
}));
vi.mock("../useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("../propertyAccess", () => ({
  getAssignedPropertyIds: vi.fn(async () => []),
  getDirectProjectIds: vi.fn(async () => []),
}));

import {
  useProject,
  useProjects,
  useActiveProjects,
  useProjectsByProperty,
  useProjectStats,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "../useProjects";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";
import { getAssignedPropertyIds, getDirectProjectIds } from "../propertyAccess";

describe("useProjects", () => {
  beforeEach(() => {
    __mock.reset();
    mockPermissions.mockReturnValue({ isAdmin: true, isLoading: false });
  });

  it("detail query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists projects (admin path)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "proj1", name: "HQ Build", status: "active" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProjects());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("HQ Build");
  });

  it("lists projects on the non-admin path (.or()/.in() filter)", async () => {
    // Take the RBAC-scoped branch: buildNonAdminFilter resolves assigned
    // property + direct project ids and applies .or() (which the fixture now
    // supports). The query still resolves through the shared builder.
    mockPermissions.mockReturnValue({ isAdmin: false, isLoading: false });
    (getAssignedPropertyIds as any).mockResolvedValueOnce(["prop1", "prop2"]);
    (getDirectProjectIds as any).mockResolvedValueOnce(["projA"]);
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "proj1", name: "Scoped Build", status: "active" }], error: null }),
    );

    const { result } = renderHookWithClient(() => useProjects());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Scoped Build");
  });

  it("create stamps created_by from the auth user", async () => {
    const builder = makeBuilder({ data: { id: "proj-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateProject());

    await result.current.mutateAsync({ name: "New Tower", status: "planning" } as any);
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ name: "New Tower", created_by: "u1" });
  });

  it("update applies the supplied fields", async () => {
    const builder = makeBuilder({ data: { id: "proj1", status: "completed" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUpdateProject());

    await result.current.mutateAsync({ id: "proj1", status: "completed" } as any);
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ status: "completed" });
  });

  it("delete surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useDeleteProject());
    await expect(result.current.mutateAsync("proj1")).rejects.toBeTruthy();
  });

  it("create surfaces an insert error as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useCreateProject());
    await expect(
      result.current.mutateAsync({ name: "X", status: "planning" } as any),
    ).rejects.toBeTruthy();
  });
});

describe("useActiveProjects", () => {
  beforeEach(() => {
    __mock.reset();
    mockPermissions.mockReturnValue({ isAdmin: true, isLoading: false });
  });

  it("filters to planning/active statuses (admin path)", async () => {
    const builder = makeBuilder({
      data: [{ id: "proj1", name: "Active Build", status: "active" }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useActiveProjects());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Active Build");
    expect((builder.in as any).mock.calls).toEqual(
      expect.arrayContaining([["status", ["planning", "active"]]]),
    );
  });

  it("surfaces errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useActiveProjects());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProjectsByProperty", () => {
  beforeEach(() => {
    __mock.reset();
    mockPermissions.mockReturnValue({ isAdmin: true, isLoading: false });
  });

  it("is disabled until a propertyId is provided", () => {
    const { result } = renderHookWithClient(() => useProjectsByProperty(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists projects for a property (admin path)", async () => {
    const builder = makeBuilder({
      data: [{ id: "proj1", name: "Prop Build", property_id: "prop1" }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useProjectsByProperty("prop1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Prop Build");
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["property_id", "prop1"]]),
    );
  });

  it("returns empty for a non-admin without access to the property", async () => {
    mockPermissions.mockReturnValue({ isAdmin: false, isLoading: false });
    (getAssignedPropertyIds as any).mockResolvedValueOnce(["other-prop"]);
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => useProjectsByProperty("prop1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useProjectStats", () => {
  beforeEach(() => {
    __mock.reset();
    mockPermissions.mockReturnValue({ isAdmin: true, isLoading: false });
  });

  it("aggregates status counts + budget totals", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { status: "active", budget: 100, spent: 40, property_id: null },
          { status: "planning", budget: 50, spent: 0, property_id: null },
          { status: "completed", budget: 200, spent: 200, property_id: null },
          { status: "on_hold", budget: 10, spent: 1, property_id: null },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProjectStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      active: 1,
      planning: 1,
      onHold: 1,
      completed: 1,
      totalBudget: 360,
      totalSpent: 241,
      total: 4,
    });
  });

  it("takes the non-admin no-match branch when the user has no access", async () => {
    mockPermissions.mockReturnValue({ isAdmin: false, isLoading: false });
    (getAssignedPropertyIds as any).mockResolvedValueOnce([]);
    (getDirectProjectIds as any).mockResolvedValueOnce([]);
    // buildNonAdminFilter still pushes 'property_id.is.null', so a query runs;
    // return an empty set and assert the aggregation degrades gracefully.
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => useProjectStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(0);
  });

  it("surfaces errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useProjectStats());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
