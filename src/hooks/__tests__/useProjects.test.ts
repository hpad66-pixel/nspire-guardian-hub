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
vi.mock("../usePermissions", () => ({
  useUserPermissions: () => ({ isAdmin: true, isLoading: false }),
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
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "../useProjects";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjects", () => {
  beforeEach(() => __mock.reset());

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
});
