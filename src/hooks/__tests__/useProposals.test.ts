/**
 * useProposals — project_proposals list/detail + create/update/delete.
 * Covers: by-project query gating, the list happy path, the create insert
 * payload (stamps created_by from the auth session), and error surfacing on
 * update.
 *
 * Note: useCreateProposal authenticates via supabase.auth.getSession() and
 * throws "Not authenticated" on a null session, so the create test arms a
 * present session before asserting the insert payload.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useProposals,
  useProposalsByProject,
  useProposal,
  useProposalTemplates,
  useProposalStats,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
} from "../useProposals";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder, supabase } from "@/test/fixtures/supabase";

describe("useProposals", () => {
  beforeEach(() => __mock.reset());

  it("by-project list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProposalsByProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists proposals for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "pr1", project_id: "p1", title: "Sitework" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProposalsByProject("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe("Sitework");
  });

  it("create stamps created_by from the auth session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    const builder = makeBuilder({ data: { id: "pr-new", project_id: "p1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateProposal());

    const row = await result.current.mutateAsync({
      project_id: "p1",
      proposal_type: "project_proposal",
      title: "Foundation proposal",
    } as any);
    expect(row.id).toBe("pr-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      title: "Foundation proposal",
      created_by: "u1",
    });
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useUpdateProposal());
    await expect(
      result.current.mutateAsync({ id: "pr1", status: "approved" } as any),
    ).rejects.toBeTruthy();
  });

  it("lists all proposals for the admin dashboard", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "pr1", title: "Sitework" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProposals());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("pr1");
  });

  it("all-proposals query surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useProposals());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("single proposal query is disabled until an id is provided", () => {
    const { result } = renderHookWithClient(() => useProposal(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches a single proposal by id", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: { id: "pr1", title: "Foundation" }, error: null }),
    );
    const { result } = renderHookWithClient(() => useProposal("pr1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Foundation");
  });

  it("lists proposal templates", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [{ id: "t1", name: "Standard CO", proposal_type: "change_order_request" }],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProposalTemplates());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Standard CO");
  });

  it("stats query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProposalStats(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("stats tallies proposals by status", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { status: "draft" },
          { status: "review" },
          { status: "approved" },
          { status: "sent" },
          { status: "draft" },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProposalStats("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      total: 5,
      draft: 2,
      review: 1,
      approved: 1,
      sent: 1,
    });
  });

  it("create throws when there is no auth session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    const { result } = renderHookWithClient(() => useCreateProposal());
    await expect(
      result.current.mutateAsync({
        project_id: "p1",
        proposal_type: "project_proposal",
        title: "x",
      } as any),
    ).rejects.toThrow("Not authenticated");
  });

  it("update applies the supplied changes without the id", async () => {
    const builder = makeBuilder({ data: { id: "pr1", project_id: "p1", status: "approved" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUpdateProposal());

    await result.current.mutateAsync({ id: "pr1", status: "approved", title: "Revised" } as any);
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ status: "approved", title: "Revised" });
    expect(updated.id).toBeUndefined();
  });

  it("delete removes the proposal and returns the id + projectId", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useDeleteProposal());

    const res = await result.current.mutateAsync({ id: "pr1", projectId: "p1" });
    expect(res).toEqual({ id: "pr1", projectId: "p1" });
    expect((builder.delete as any)).toHaveBeenCalled();
    expect((builder.eq as any).mock.calls[0]).toEqual(["id", "pr1"]);
  });

  it("delete surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useDeleteProposal());
    await expect(
      result.current.mutateAsync({ id: "pr1", projectId: "p1" }),
    ).rejects.toBeTruthy();
  });
});
