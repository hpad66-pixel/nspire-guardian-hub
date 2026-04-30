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

  it("getInstanceForRecord → null when no row", async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });
    const out = await getInstanceForRecord("rfi", "rfi-1");
    expect(out).toBeNull();
  });
});
