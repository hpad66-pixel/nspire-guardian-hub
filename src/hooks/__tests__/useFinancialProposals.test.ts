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

import {
  useFinancialProposals,
  useFinancialProposalLines,
} from "../useFinancialProposals";
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

  it("update patches by id and stamps updated_at", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useFinancialProposals("p1"));

    await result.current.update.mutateAsync({ id: "pr1", status: "sent" } as any);

    const patch = (builder.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({ status: "sent" });
    expect(typeof patch.updated_at).toBe("string");
    expect(patch.id).toBeUndefined(); // id destructured out of the patch
    expect((builder.eq as any).mock.calls).toContainEqual(["id","pr1"]);
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useFinancialProposals("p1"));
    await expect(
      result.current.update.mutateAsync({ id: "pr1", status: "approved" } as any),
    ).rejects.toBeTruthy();
  });
});

describe("useFinancialProposalLines", () => {
  beforeEach(() => __mock.reset());

  it("list is disabled until a proposalId is provided", () => {
    const { result } = renderHookWithClient(() => useFinancialProposalLines(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists proposal lines ordered by line_no ascending", async () => {
    const builder = makeBuilder({
      data: [{ id: "ln1", proposal_id: "pr1", line_no: 1, description: "Labor" }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].description).toBe("Labor");
    expect((builder.eq as any).mock.calls[0]).toEqual(["proposal_id", "pr1"]);
    expect((builder.order as any).mock.calls[0]).toEqual([
      "line_no",
      { ascending: true },
    ]);
  });

  it("create resolves the workspace then stamps tenant_id on the line", async () => {
    const workspaceBuilder = makeBuilder({ data: { id: "ws-1" }, error: null });
    const insertBuilder = makeBuilder({ data: { id: "ln-new" }, error: null });
    __mock.from.mockImplementation((table: string) =>
      table === "workspaces" ? workspaceBuilder : insertBuilder,
    );

    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));
    const row = await result.current.create.mutateAsync({
      proposal_id: "pr1",
      description: "Excavation",
      category: "labor",
      quantity: 10,
      unit_cost: 50,
    } as any);
    expect(row.id).toBe("ln-new");

    const inserted = (insertBuilder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      proposal_id: "pr1",
      description: "Excavation",
      category: "labor",
      quantity: 10,
      unit_cost: 50,
      tenant_id: "ws-1",
    });
  });

  it("create surfaces insert errors as a rejection", async () => {
    const workspaceBuilder = makeBuilder({ data: { id: "ws-1" }, error: null });
    const insertBuilder = makeBuilder({ data: null, error: { message: "denied" } as any });
    __mock.from.mockImplementation((table: string) =>
      table === "workspaces" ? workspaceBuilder : insertBuilder,
    );
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));
    await expect(
      result.current.create.mutateAsync({
        proposal_id: "pr1",
        description: "x",
      } as any),
    ).rejects.toBeTruthy();
  });

  it("update patches a line by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));

    await result.current.update.mutateAsync({ id: "ln1", quantity: 20 } as any);

    const patch = (builder.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({ quantity: 20 });
    expect(patch.id).toBeUndefined();
    expect((builder.eq as any).mock.calls).toContainEqual(["id","ln1"]);
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));
    await expect(
      result.current.update.mutateAsync({ id: "ln1", quantity: 5 } as any),
    ).rejects.toBeTruthy();
  });

  it("remove deletes a line by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));

    await result.current.remove.mutateAsync("ln1");
    expect((builder.delete as any)).toHaveBeenCalled();
    expect((builder.eq as any).mock.calls).toContainEqual(["id","ln1"]);
  });

  it("remove surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useFinancialProposalLines("pr1"));
    await expect(result.current.remove.mutateAsync("ln1")).rejects.toBeTruthy();
  });
});
