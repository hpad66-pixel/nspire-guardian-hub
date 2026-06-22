/**
 * useRenumberChangeOrder — admin CO renumber: validation, uniqueness guard,
 * and the co_no_history audit append.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useRenumberChangeOrder } from "../useProcoreChangeOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

/** Successive change_orders from() calls return the next queued result. */
function queue(results: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  const builders: any[] = [];
  __mock.from.mockImplementation(() => {
    const b = makeBuilder(results[Math.min(i, results.length - 1)]);
    builders[i] = b; i += 1;
    return b;
  });
  return builders;
}

const current = { co_no: 8, co_type: "PCO", project_id: "p1", co_no_history: [] };

describe("useRenumberChangeOrder", () => {
  beforeEach(() => __mock.reset());

  it("renumbers to a free number and appends an audit entry", async () => {
    const builders = queue([
      { data: current, error: null },   // load current
      { data: null, error: null },      // clash check → none
      { data: null, error: null },      // update
    ]);
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    const out = await result.current.mutateAsync({ coId: "co1", newCoNo: 9, reason: "Client log" });
    expect(out).toMatchObject({ coId: "co1", newCoNo: 9 });

    const patch = (builders[2].update as any).mock.calls[0][0];
    expect(patch.co_no).toBe(9);
    expect(patch.co_no_history).toHaveLength(1);
    expect(patch.co_no_history[0]).toMatchObject({ from: 8, to: 9, reason: "Client log" });
    expect(patch.co_no_history[0].at).toBeTruthy();
  });

  it("refuses a number already used on the project", async () => {
    queue([
      { data: current, error: null },
      { data: { id: "other" }, error: null }, // clash
    ]);
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", newCoNo: 3, reason: "x" }))
      .rejects.toThrow(/already exists/);
  });

  it("rejects a non-positive number before touching the DB", async () => {
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", newCoNo: 0, reason: "x" }))
      .rejects.toThrow(/positive whole number/);
  });

  it("requires a reason", async () => {
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", newCoNo: 9, reason: "   " }))
      .rejects.toThrow(/reason/i);
  });

  it("rejects renumbering to the same number", async () => {
    queue([{ data: current, error: null }]);
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", newCoNo: 8, reason: "x" }))
      .rejects.toThrow(/already the current/);
  });
});
