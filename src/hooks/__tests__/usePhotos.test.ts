/**
 * WS-6 · usePhotos — Daily Log photos: upload / attach / detach.
 *
 * Asserts that:
 *   - upload() stamps tenant_id (resolved via the WS-5 workspace resolver)
 *     onto the photos row and uploads under the tenant/project folder of the
 *     project-photos bucket.
 *   - attach() writes a photo_links row keyed by linked_record_type "daily".
 *   - detach() removes the photo_links row for the same daily report.
 *
 * (Supersedes the G5 smoke tests; keeps the idle/read coverage.)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const state = {
    listData: [] as any[],
    photoInsert: null as any,
    uploadPath: null as string | null,
    linkInsert: null as any,
    deleteFilters: {} as Record<string, any>,
  };

  const fromMock = vi.fn((table: string) => {
    const b: any = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.order = vi.fn(() => b);
    // default awaitable terminal (list query)
    b.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: state.listData, error: null }).then(resolve, reject);

    if (table === "photos") {
      b.insert = vi.fn((row: any) => {
        state.photoInsert = row;
        return b;
      });
      b.single = vi.fn(async () => ({
        data: { id: "photo-1", ...state.photoInsert },
        error: null,
      }));
    } else if (table === "photo_links") {
      b.insert = vi.fn((row: any) => {
        state.linkInsert = row;
        return Promise.resolve({ error: null });
      });
      b.delete = vi.fn(() => {
        const d: any = {};
        d.eq = vi.fn((col: string, val: any) => {
          state.deleteFilters[col] = val;
          return d;
        });
        d.then = (resolve: any, reject: any) =>
          Promise.resolve({ error: null }).then(resolve, reject);
        return d;
      });
    }
    return b;
  });

  const uploadMock = vi.fn(async (path: string) => {
    state.uploadPath = path;
    return { error: null };
  });

  return { state, fromMock, uploadMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: h.fromMock,
    storage: { from: vi.fn(() => ({ upload: h.uploadMock })) },
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveCurrentWorkspaceId: vi.fn(async () => "tenant-1"),
}));

import { usePhotos } from "../usePhotos";
import { renderHookWithClient } from "@/test/utils";

describe("usePhotos (daily log)", () => {
  beforeEach(() => {
    h.state.listData = [];
    h.state.photoInsert = null;
    h.state.uploadPath = null;
    h.state.linkInsert = null;
    h.state.deleteFilters = {};
    h.fromMock.mockClear();
    h.uploadMock.mockClear();
  });

  it("is idle until projectId is set", () => {
    const { result } = renderHookWithClient(() => usePhotos(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads photos for the project", async () => {
    h.state.listData = [{ id: "ph1", project_id: "p1" }];
    const { result } = renderHookWithClient(() => usePhotos("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(h.fromMock).toHaveBeenCalledWith("photos");
    expect(result.current.data).toHaveLength(1);
  });

  it("upload() stamps tenant_id and uploads into the tenant/project folder", async () => {
    const { result } = renderHookWithClient(() => usePhotos("p1"));

    const file = new File(["x"], "site.jpg", { type: "image/jpeg" });
    await act(async () => {
      await result.current.upload.mutateAsync({ file, caption: "Footing" });
    });

    expect(h.state.photoInsert).toMatchObject({
      tenant_id: "tenant-1",
      project_id: "p1",
      caption: "Footing",
    });
    expect(h.state.photoInsert.storage_path).toBeTruthy();
    expect(h.state.uploadPath).toMatch(/^tenant-1\/p1\//);
  });

  it("attach() writes a photo_links row with linked_record_type 'daily'", async () => {
    const { result } = renderHookWithClient(() => usePhotos("p1"));

    await act(async () => {
      await result.current.attach.mutateAsync({
        photoId: "photo-1",
        recordId: "daily-1",
        recordType: "daily",
      });
    });

    expect(h.state.linkInsert).toMatchObject({
      photo_id: "photo-1",
      linked_record_id: "daily-1",
      linked_record_type: "daily",
    });
  });

  it("detach() removes the photo_links row for the daily report", async () => {
    const { result } = renderHookWithClient(() => usePhotos("p1"));

    await act(async () => {
      await result.current.detach.mutateAsync({
        photoId: "photo-1",
        recordId: "daily-1",
        recordType: "daily",
      });
    });

    expect(h.state.deleteFilters).toMatchObject({
      photo_id: "photo-1",
      linked_record_id: "daily-1",
      linked_record_type: "daily",
    });
  });
});
