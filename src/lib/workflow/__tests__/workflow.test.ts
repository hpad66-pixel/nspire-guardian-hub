import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { createWorkflowInstance, advanceWorkflow, getInstanceForRecord } from "@/lib/workflow";

describe("workflow engine (A4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createWorkflowInstance → RPC returns instance id", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: "inst-1", error: null });
    const id = await createWorkflowInstance({
      recordId: "rfi-1", recordType: "rfi", module: "rfi", projectId: "p1",
    });
    expect(id).toBe("inst-1");
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_workflow_instance",
      expect.objectContaining({ p_record_id: "rfi-1", p_module: "rfi" }),
    );
  });

  it("createWorkflowInstance throws on RPC error", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("no def") });
    await expect(
      createWorkflowInstance({ recordId: "x", recordType: "rfi", module: "rfi" }),
    ).rejects.toThrow(/no def/);
  });

  it("advanceWorkflow → returns updated instance", async () => {
    const fakeInst = { id: "inst-1", state: "open", current_step: 2 };
    (supabase.rpc as any).mockResolvedValue({ data: fakeInst, error: null });
    const out = await advanceWorkflow({ instanceId: "inst-1", action: "submit" });
    expect(out).toMatchObject({ id: "inst-1", state: "open", current_step: 2 });
  });

  it("advanceWorkflow throws on RPC error", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("bad transition") });
    await expect(
      advanceWorkflow({ instanceId: "inst-1", action: "approve" }),
    ).rejects.toThrow(/bad transition/);
  });

  const chainTo = (result: any) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  it("getInstanceForRecord → null when no row", async () => {
    (supabase.from as any).mockReturnValue(chainTo({ data: null, error: null }));
    const out = await getInstanceForRecord("rfi", "rfi-1");
    expect(out).toBeNull();
  });

  it("getInstanceForRecord → returns the instance when present", async () => {
    (supabase.from as any).mockReturnValue(chainTo({ data: { id: "inst-9", state: "open" }, error: null }));
    const out = await getInstanceForRecord("change_order", "co-9");
    expect(out).toMatchObject({ id: "inst-9", state: "open" });
  });

  it("getInstanceForRecord throws on query error", async () => {
    (supabase.from as any).mockReturnValue(chainTo({ data: null, error: new Error("rls") }));
    await expect(getInstanceForRecord("rfi", "rfi-1")).rejects.toThrow(/rls/);
  });
});
