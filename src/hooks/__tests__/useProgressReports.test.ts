/**
 * useProgressReports — project_progress_reports list + save (insert/update)
 * + delete. Covers: query gating, list happy path, the save-insert payload
 * (stamps generated_by from the auth session), the save-update branch (when an
 * id is supplied), and the not-authenticated rejection path.
 *
 * Note: useSaveProgressReport reads `supabase.auth.getSession()` for the user
 * id, so tests arm a session before exercising the save mutation. The streaming
 * useGenerateProgressReport hook (fetch/SSE based) is covered via a faked
 * streaming Response (makeSseResponse) with global.fetch stubbed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import {
  useProgressReports,
  useSaveProgressReport,
  useDeleteProgressReport,
  useGenerateProgressReport,
} from "../useProgressReports";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder, makeSseResponse, supabase } from "@/test/fixtures/supabase";

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

  it("delete filters by id and resolves with the projectId on success", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useDeleteProgressReport());

    const out = await result.current.mutateAsync({ id: "rep1", projectId: "p1" });
    expect(out).toBe("p1");
    expect((builder.eq as any).mock.calls).toEqual(
      expect.arrayContaining([["id", "rep1"]]),
    );
  });

  it("save (insert) surfaces an insert error as a rejection", async () => {
    armSession();
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
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

  it("save (update) surfaces an update error as a rejection", async () => {
    armSession();
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useSaveProgressReport());
    await expect(
      result.current.mutateAsync({
        id: "rep1",
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
});

describe("useGenerateProgressReport (SSE streaming)", () => {
  const params = {
    projectId: "p1", reportType: "weekly",
    periodStart: "2026-06-01", periodEnd: "2026-06-07", userNotes: "",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: "tok", user: { id: "u1" } } },
      error: null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("streams delta content to onChunk and calls onDone, ending on [DONE]", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(makeSseResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"content":" World"}}]}\n',
      'data: [DONE]\n',
    ]))));
    const { result } = renderHookWithClient(() => useGenerateProgressReport());
    const chunks: string[] = [];
    const onDone = vi.fn();
    await act(async () => {
      await result.current.generate(params, (c: string) => chunks.push(c), onDone);
    });
    expect(chunks.join("")).toBe("Hello World");
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isGenerating).toBe(false);
  });

  it("rejects when there is no active session", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHookWithClient(() => useGenerateProgressReport());
    await act(async () => {
      await expect(
        result.current.generate(params, () => {}, () => {}),
      ).rejects.toThrow(/Not authenticated/);
    });
  });

  it("rejects with the server error message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(makeSseResponse([], { ok: false, status: 500, errorBody: { error: "boom" } })),
    ));
    const { result } = renderHookWithClient(() => useGenerateProgressReport());
    await act(async () => {
      await expect(result.current.generate(params, () => {}, () => {})).rejects.toThrow(/boom/);
    });
  });

  it("rejects when the response has no body", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(makeSseResponse([], { noBody: true }))));
    const { result } = renderHookWithClient(() => useGenerateProgressReport());
    await act(async () => {
      await expect(
        result.current.generate(params, () => {}, () => {}),
      ).rejects.toThrow(/No response body/);
    });
  });
});
