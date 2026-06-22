/**
 * useProcoreRfis — C1 Procore-Lite RFI enhancements.
 * Covers: query gating, list happy path, the RFI create flow (which calls the
 * `next_rfi_number` RPC, inserts, then spins up an A4 workflow instance), the
 * response add path, and the close flow advancing the workflow.
 *
 * Note: useCreateProcoreRfi makes an RPC call then an insert; useCloseProcoreRfi
 * issues an update then (optionally) advances the workflow.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/workflow", () => ({
  createWorkflowInstance: vi.fn(async () => "inst-1"),
  advanceWorkflow: vi.fn(async () => ({ id: "inst-1", state: "closed" })),
}));

import {
  useProcoreRfis,
  useRfiResponses,
  useCreateProcoreRfi,
  useCloseProcoreRfi,
} from "../useProcoreRfis";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";
import { createWorkflowInstance, advanceWorkflow } from "@/lib/workflow";

describe("useProcoreRfis", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProcoreRfis(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists project_rfis for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "rfi1", project_id: "p1", stage: "open" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProcoreRfis("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].stage).toBe("open");
  });

  it("create pulls next number, inserts the RFI, and spins up a workflow", async () => {
    __mock.rpc.mockResolvedValue({ data: "RFI-005", error: null } as any);
    const builder = makeBuilder({ data: { id: "rfi-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateProcoreRfi());

    const row = await result.current.mutateAsync({
      projectId: "p1",
      question: "What gauge?",
      rfiManagerId: "mgr-1",
    });
    expect((row as any).id).toBe("rfi-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      rfi_number: "RFI-005",
      question: "What gauge?",
      rfi_manager_id: "mgr-1",
      stage: "open",
    });
    expect(createWorkflowInstance).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "rfi-new", recordType: "rfi", projectId: "p1" }),
    );
  });

  it("response add inserts a row scoped to the RFI", async () => {
    const builder = makeBuilder({ data: { id: "resp-1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useRfiResponses("rfi1"));

    await result.current.add.mutateAsync({ body: "See attached", isOfficial: true });
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ rfi_id: "rfi1", body: "See attached", is_official: true });
  });

  it("close updates stage and advances the workflow when an instance is given", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useCloseProcoreRfi());

    await result.current.mutateAsync({ rfiId: "rfi1", instanceId: "inst-1" });
    expect(advanceWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "inst-1", action: "close" }),
    );
  });
});
