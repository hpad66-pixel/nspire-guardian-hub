/**
 * useLienReleases — inbound/outbound releases that gate AP payment.
 * Covers: query gating, create tenant-stamping, and the A4 workflow
 * integration on submit/approve/reject (Ball-in-Court engine, not a
 * per-module state machine).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  resolveCurrentWorkspaceId: vi.fn(async () => "ws-1"),
}));
vi.mock("@/lib/workflow", () => ({
  createWorkflowInstance: vi.fn(async () => "inst-1"),
  advanceWorkflow: vi.fn(async () => ({ id: "inst-1", state: "approved" })),
}));

import { useLienReleases } from "../useLienReleases";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";
import { createWorkflowInstance, advanceWorkflow } from "@/lib/workflow";

describe("useLienReleases", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useLienReleases(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("create stamps tenant + project and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "lr-1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useLienReleases("p1"));

    const row = await result.current.create.mutateAsync({
      direction: "inbound", release_type: "conditional_progress",
    } as any);
    expect(row.id).toBe("lr-1");
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ project_id: "p1", tenant_id: "ws-1" });
  });

  it("submitForApproval creates a workflow instance via the A4 engine", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useLienReleases("p1"));

    await result.current.submitForApproval.mutateAsync({ id: "lr1", project_id: "p1" } as any);
    expect(createWorkflowInstance).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "lr1", recordType: "lien_release" }),
    );
  });

  it("approve advances the workflow when an instance is attached", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useLienReleases("p1"));

    await result.current.approve.mutateAsync({
      id: "lr1", project_id: "p1", workflow_instance_id: "inst-1",
    } as any);
    expect(advanceWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "inst-1", action: "approve" }),
    );
  });

  it("reject advances the workflow with the reject action", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useLienReleases("p1"));

    await result.current.reject.mutateAsync({
      id: "lr1", project_id: "p1", workflow_instance_id: "inst-1",
    } as any);
    expect(advanceWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "inst-1", action: "reject" }),
    );
  });
});
