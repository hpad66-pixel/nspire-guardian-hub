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
  useProposalsByProject,
  useCreateProposal,
  useUpdateProposal,
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
});
