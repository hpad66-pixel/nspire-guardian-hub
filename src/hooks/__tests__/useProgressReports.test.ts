/**
 * useProgressReports — project_progress_reports list + save (insert/update)
 * + delete. Covers: query gating, list happy path, the save-insert payload
 * (stamps generated_by from the auth session), the save-update branch (when an
 * id is supplied), and the not-authenticated rejection path.
 *
 * Note: useSaveProgressReport reads `supabase.auth.getSession()` for the user
 * id, so tests arm a session before exercising the save mutation. The streaming
 * useGenerateProgressReport hook (fetch/SSE based) is intentionally not covered
 * by these supabase-builder unit tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useProgressReports,
  useSaveProgressReport,
  useDeleteProgressReport,
} from "../useProgressReports";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder, supabase } from "@/test/fixtures/supabase";

const armSession = () =>
  (supabase.auth.getSession as any).mockResolvedValue({
    data: { session: { access_token: "tok", user: { id: "u1" } } },
    error: null,
  });

describe("useProgressReports", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProgressReports(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists reports for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "rep1", project_id: "p1", title: "Week 1" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProgressReports("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe("Week 1");
  });

  it("save (insert) stamps generated_by from the session user", async () => {
    armSession();
    const builder = makeBuilder({ data: { id: "rep-new", project_id: "p1", status: "draft" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useSaveProgressReport());

    await result.current.mutateAsync({
      project_id: "p1",
      report_type: "weekly",
      report_period_start: "2026-06-01",
      report_period_end: "2026-06-07",
      title: "Week 1",
      content_html: "<p>x</p>",
      status: "draft",
    });
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      report_type: "weekly",
      title: "Week 1",
      generated_by: "u1",
    });
  });

  it("save (update) takes the update branch when an id is supplied", async () => {
    armSession();
    const builder = makeBuilder({ data: { id: "rep1", project_id: "p1", status: "finalized" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useSaveProgressReport());

    await result.current.mutateAsync({
      id: "rep1",
      project_id: "p1",
      report_type: "weekly",
      report_period_start: "2026-06-01",
      report_period_end: "2026-06-07",
      title: "Week 1 (final)",
      content_html: "<p>y</p>",
      status: "finalized",
    });
    expect((builder.insert as any).mock.calls).toHaveLength(0);
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ title: "Week 1 (final)", status: "finalized" });
  });

  it("save rejects when there is no active session", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useSaveProgressReport());
    await expect(
      result.current.mutateAsync({
        project_id: "p1",
        report_type: "weekly",
        report_period_start: "2026-06-01",
        report_period_end: "2026-06-07",
        title: "x",
        content_html: "<p>x</p>",
        status: "draft",
      }),
    ).rejects.toBeTruthy();
  });

  it("delete surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useDeleteProgressReport());
    await expect(
      result.current.mutateAsync({ id: "rep1", projectId: "p1" }),
    ).rejects.toBeTruthy();
  });
});
