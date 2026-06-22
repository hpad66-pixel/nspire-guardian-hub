/**
 * useRenumberChangeOrder — admin CO renumber: validation, uniqueness guard,
 * and the co_no_history audit append.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/changeOrder/coPdf", () => ({ buildCoPdfBlob: vi.fn(async () => new Blob(["pdf"])) }));
vi.mock("@/lib/changeOrder/storage", () => ({ uploadCoArtifact: vi.fn(async () => "https://new/pdf.pdf") }));

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

  it("updates the spec number + regenerates the PDF, then restores the lock", async () => {
    const withSpec = {
      co_no: 8, co_type: "PCO", project_id: "p1", co_no_history: [], locked: true,
      spec: { doc: { co_number: "8", co_label: "PCO-0008", title: "Demo" }, parties: {} },
    };
    const builders = queue([
      { data: withSpec, error: null }, // load
      { data: null, error: null },     // clash → none
      { data: null, error: null },     // update1 (unlock + change)
      { data: null, error: null },     // update2 (re-lock)
    ]);
    const { result } = renderHookWithClient(() => useRenumberChangeOrder());
    const out = await result.current.mutateAsync({ coId: "co1", newCoNo: 9, reason: "Client log" });
    expect(out).toMatchObject({ newCoNo: 9, regeneratedPdf: true, specUpdated: true });

    const patch1 = (builders[2].update as any).mock.calls[0][0];
    expect(patch1.co_no).toBe(9);
    expect(patch1.locked).toBe(false);                 // flipped off to bypass the lock guard
    expect(patch1.spec.doc.co_number).toBe("9");
    expect(patch1.spec.doc.co_label).toBe("PCO-0009"); // embedded label the email reads
    expect(patch1.pdf_path).toBe("https://new/pdf.pdf"); // regenerated attachment

    expect((builders[3].update as any).mock.calls[0][0]).toEqual({ locked: true }); // restored
  });
});
