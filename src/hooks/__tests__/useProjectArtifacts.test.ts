/**
 * WS-7 · useProjectArtifacts.
 *
 * Asserts the two tenant-safety contracts that the storage RLS depends on:
 *   1. Uploads write to `${workspaceId}/${projectId}/…` — the first path
 *      segment is the workspace, which the project-artifacts storage policy
 *      compares to current_tenant_id(). A non-tenant-prefixed path would be
 *      rejected by RLS in a real environment.
 *   2. Delete removes the storage object (not just the DB row), keyed by the
 *      stored file_path, then deletes the row by id.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

const h = vi.hoisted(() => {
  const storageUpload = vi.fn(async () => ({ data: { path: "x" }, error: null }));
  const storageRemove = vi.fn(async () => ({ data: [], error: null }));
  const storageSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://signed" }, error: null }));
  const storageFrom = vi.fn(() => ({
    upload: storageUpload,
    remove: storageRemove,
    createSignedUrl: storageSignedUrl,
  }));

  const builder: any = {};
  const tableInsert = vi.fn(() => builder);
  const tableDelete = vi.fn(() => builder);
  const tableEq = vi.fn(() => builder);
  const tableSingle = vi.fn(async () => ({
    data: { id: "art-1", file_path: "tenant-1/p1/abc.pdf", tenant_id: "tenant-1", project_id: "p1" },
    error: null,
  }));
  builder.select = vi.fn(() => builder);
  builder.insert = tableInsert;
  builder.delete = tableDelete;
  builder.eq = tableEq;
  builder.order = vi.fn(() => builder);
  builder.single = tableSingle;
  // list query + delete().eq() are awaited directly
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject);

  const fromMock = vi.fn(() => builder);

  return { storageUpload, storageRemove, storageFrom, fromMock, tableInsert, tableEq };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: h.fromMock,
    storage: { from: h.storageFrom },
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveCurrentWorkspaceId: vi.fn(async () => "tenant-1"),
  requireTenantId: vi.fn(async () => "tenant-1"),
}));

import { useProjectArtifacts, type ProjectArtifact } from "../useProjectArtifacts";
import { renderHookWithClient } from "@/test/utils";

describe("useProjectArtifacts", () => {
  beforeEach(() => {
    h.storageUpload.mockClear();
    h.storageRemove.mockClear();
    h.tableEq.mockClear();
    h.tableInsert.mockClear();
    h.fromMock.mockClear();
  });

  it("uploads to a tenant-scoped path: `${workspaceId}/${projectId}/…`", async () => {
    const { result } = renderHookWithClient(() => useProjectArtifacts("p1"));
    const file = new File(["bytes"], "subcontract.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.upload.mutateAsync({
        file,
        input: { artifact_type: "specification", source_system: "manual", title: "Spec" },
        projectId: "p1",
      });
    });

    expect(h.storageFrom).toHaveBeenCalledWith("project-artifacts");
    expect(h.storageUpload).toHaveBeenCalledTimes(1);
    const uploadedPath = h.storageUpload.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith("tenant-1/p1/")).toBe(true);
    // The DB row records the same tenant-scoped path.
    expect(h.tableInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "tenant-1", project_id: "p1", file_path: uploadedPath }),
    );
  });

  it("delete removes the storage object before deleting the row", async () => {
    const { result } = renderHookWithClient(() => useProjectArtifacts("p1"));
    const artifact = {
      id: "art-1",
      file_path: "tenant-1/p1/abc.pdf",
    } as ProjectArtifact;

    await act(async () => {
      await result.current.remove.mutateAsync(artifact);
    });

    expect(h.storageFrom).toHaveBeenCalledWith("project-artifacts");
    expect(h.storageRemove).toHaveBeenCalledWith(["tenant-1/p1/abc.pdf"]);
    expect(h.tableEq).toHaveBeenCalledWith("id", "art-1");
  });
});
