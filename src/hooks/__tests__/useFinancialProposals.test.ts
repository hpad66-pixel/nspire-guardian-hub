/**
 * useFinancialProposals — project proposals list + create/update.
 * Covers: query gating, list happy path, create stamping tenant_id (resolved
 * via a workspaces lookup), and error surfacing on the create path.
 *
 * Note: this hook resolves the tenant inline by querying
 * `workspaces` (`.limit(1).single()`), so create issues TWO from() calls —
 * the workspace lookup first, then the proposals insert.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useFinancialProposals } from "../useFinancialProposals";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useFinancialProposals", () => {
  beforeEach(() => __mock.reset());

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useFinancialProposals(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists proposals for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "pr1", project_id: "p1", proposal_no: "PRO-001" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useFinancialProposals("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].proposal_no).toBe("PRO-001");
  });

  it("create resolves the workspace then stamps tenant_id on the row", async () => {
    const workspaceBuilder = makeBuilder({ data: { id: "ws-1" }, error: null });
    const insertBuilder = makeBuilder({ data: { id: "pr-new" }, error: null });
    // Table-aware so the mount list query (proposals) doesn't steal a sequenced
    // mock: workspaces → tenant lookup, proposals → list + insert.
    __mock.from.mockImplementation((table: string) =>
      table === "workspaces" ? workspaceBuilder : insertBuilder,
    );

    const { result } = renderHookWithClient(() => useFinancialProposals("p1"));
    const row = await result.current.create.mutateAsync({
      project_id: "p1",
      title: "Sitework proposal",
      proposal_no: "PRO-002",
    } as any);
    expect(row.id).toBe("pr-new");

    const inserted = (insertBuilder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      title: "Sitework proposal",
      proposal_no: "PRO-002",
      tenant_id: "ws-1",
    });
  });

  it("create surfaces insert errors as a rejection", async () => {
    const workspaceBuilder = makeBuilder({ data: { id: "ws-1" }, error: null });
    const insertBuilder = makeBuilder({ data: null, error: { message: "denied" } as any });
    __mock.from
      .mockReturnValueOnce(workspaceBuilder)
      .mockReturnValueOnce(insertBuilder);

    const { result } = renderHookWithClient(() => useFinancialProposals("p1"));
    await expect(
      result.current.create.mutateAsync({
        project_id: "p1",
        title: "x",
        proposal_no: "PRO-003",
      } as any),
    ).rejects.toBeTruthy();
  });
});
