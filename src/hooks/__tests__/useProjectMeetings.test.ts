/**
 * useProjectMeetings — project meeting minutes (draft → reviewed → finalized).
 * Covers: list happy path, create (stamps created_by from useAuth and inserts
 * a single-element array payload), finalize (stamps finalized_by/_at), and the
 * error path surfacing insert failures.
 *
 * Note: this hook depends on useAuth for the current user id, and its query is
 * gated on `enabled: !!projectId` but exposes `meetings`/`isLoading` rather than
 * the raw query object, so there's no `fetchStatus` to assert "idle" on.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import { useProjectMeetings } from "../useProjectMeetings";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectMeetings", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("lists meetings for the given project (attendees default to [])", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [{ id: "m1", project_id: "p1", title: "Kickoff", attendees: null }],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProjectMeetings("p1"));
    await waitFor(() => expect(result.current.meetings.length).toBe(1));
    expect(result.current.meetings[0].title).toBe("Kickoff");
    expect(result.current.meetings[0].attendees).toEqual([]);
  });

  it("create stamps created_by and inserts the row as an array payload", async () => {
    const builder = makeBuilder({ data: { id: "m-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useProjectMeetings("p1"));

    const row = await result.current.createMeeting.mutateAsync({
      project_id: "p1",
      meeting_date: "2026-06-21",
      meeting_type: "owner",
      title: "OAC #4",
      attendees: [{ name: "Jane" }],
      status: "draft",
    } as any);
    expect((row as any).id).toBe("m-new");

    const insertedArg = (builder.insert as any).mock.calls[0][0];
    expect(Array.isArray(insertedArg)).toBe(true);
    expect(insertedArg[0]).toMatchObject({
      project_id: "p1",
      title: "OAC #4",
      created_by: "u1",
    });
  });

  it("finalize stamps status=finalized + finalized_by", async () => {
    const builder = makeBuilder({ data: { id: "m1", status: "finalized" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useProjectMeetings("p1"));

    await result.current.finalizeMeeting.mutateAsync("m1");
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ status: "finalized", finalized_by: "u1" });
    expect(updated.finalized_at).toBeTruthy();
  });

  it("create surfaces insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useProjectMeetings("p1"));
    await expect(
      result.current.createMeeting.mutateAsync({
        project_id: "p1",
        meeting_date: "2026-06-21",
        meeting_type: "owner",
        title: "x",
        attendees: [],
        status: "draft",
      } as any),
    ).rejects.toBeTruthy();
  });
});
