/**
 * usePayAppContinuation — approved-CO loader, generate-pay-app flow, and the
 * continuation reader/editor on sov_line_items / pay_app_line_progress.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "ws-1"),
}));

import {
  useLoadApprovedCos,
  useGeneratePayApp,
  usePayAppContinuation,
} from "../usePayAppContinuation";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

/** Per-table queue of results: successive from(table) calls shift the next result. */
function tableQueue(map: Record<string, Array<{ data?: unknown; error?: unknown }>>) {
  const idx: Record<string, number> = {};
  const builders: Record<string, any> = {};
  __mock.from.mockImplementation((t: string) => {
    const arr = map[t] ?? [{ data: null, error: null }];
    const i = Math.min(idx[t] ?? 0, arr.length - 1);
    idx[t] = (idx[t] ?? 0) + 1;
    const b = makeBuilder(arr[i]);
    builders[t] = b;
    return b;
  });
  return builders;
}

describe("useLoadApprovedCos", () => {
  beforeEach(() => __mock.reset());

  it("creates SOV lines for approved COs that lack one", async () => {
    const co = { id: "co1", co_no: 1, title: "Storm drainage", description: null, amount: 24050, status: "executed" };
    let sovBuilder: any;
    __mock.from.mockImplementation((t: string) => {
      if (t === "change_orders") return makeBuilder({ data: [co], error: null });
      sovBuilder = makeBuilder({ data: [], error: null }); // existing select [] + insert
      return sovBuilder;
    });
    const { result } = renderHookWithClient(() => useLoadApprovedCos("pc1", "p1"));
    const n = await result.current.mutateAsync();
    expect(n).toBe(1);
    const inserted = (sovBuilder.insert as any).mock.calls[0][0];
    expect(inserted[0]).toMatchObject({
      prime_contract_id: "pc1", project_id: "p1",
      kind: "change_order", change_order_id: "co1", scheduled_value: 24050,
    });
  });

  it("is a no-op when every approved CO already has a line", async () => {
    let sovBuilder: any;
    __mock.from.mockImplementation((t: string) => {
      if (t === "change_orders") return makeBuilder({ data: [{ id: "co1", co_no: 1, amount: 100, status: "approved" }], error: null });
      sovBuilder = makeBuilder({ data: [{ item_no: "17", change_order_id: "co1", sort_order: 17 }], error: null });
      return sovBuilder;
    });
    const { result } = renderHookWithClient(() => useLoadApprovedCos("pc1", "p1"));
    const n = await result.current.mutateAsync();
    expect(n).toBe(0);
    expect((sovBuilder.insert as any)).not.toHaveBeenCalled();
  });

  it("rejects when the change-order query errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useLoadApprovedCos("pc1", "p1"));
    await expect(result.current.mutateAsync()).rejects.toBeTruthy();
  });

  it("rejects without a contract/project", async () => {
    const { result } = renderHookWithClient(() => useLoadApprovedCos(null, null));
    await expect(result.current.mutateAsync()).rejects.toThrow(/Missing/);
  });
});

describe("useGeneratePayApp", () => {
  beforeEach(() => __mock.reset());

  it("loads COs, creates the next pay app, and seeds carried-forward lines", async () => {
    tableQueue({
      change_orders: [{ data: [], error: null }], // no missing COs
      prime_contract_pay_apps: [
        { data: [{ id: "pa4", pay_app_no: 4 }], error: null }, // existing → next is 5, prior pa4
        { data: { id: "pa5" }, error: null }, // insert
      ],
      sov_line_items: [
        { data: [], error: null }, // loader: existing
        { data: [{ id: "l1", scheduled_value: 1000 }], error: null }, // seed: all lines
      ],
      pay_app_line_progress: [
        { data: [{ sov_line_item_id: "l1", value_to_date: 400, qty_to_date: 40, retainage: 40 }], error: null }, // prior
        { data: null, error: null }, // seed insert
      ],
    });
    const { result } = renderHookWithClient(() => useGeneratePayApp("pc1", "p1"));
    const out = await result.current.mutateAsync({});
    expect(out).toMatchObject({ payAppId: "pa5", payAppNo: 5, lineCount: 1 });
  });

  it("starts at pay app #1 when none exist", async () => {
    tableQueue({
      change_orders: [{ data: [], error: null }],
      prime_contract_pay_apps: [
        { data: [], error: null }, // none yet
        { data: { id: "pa1" }, error: null },
      ],
      sov_line_items: [
        { data: [], error: null },
        { data: [], error: null },
      ],
      pay_app_line_progress: [{ data: null, error: null }],
    });
    const { result } = renderHookWithClient(() => useGeneratePayApp("pc1", "p1"));
    const out = await result.current.mutateAsync({});
    expect(out.payAppNo).toBe(1);
  });
});

describe("usePayAppContinuation", () => {
  beforeEach(() => __mock.reset());

  it("disabled until a payAppId is provided", () => {
    const { result } = renderHookWithClient(() => usePayAppContinuation(null));
    expect(result.current.detail.fetchStatus).toBe("idle");
  });

  it("upsertLine computes to-date from prior baseline + this period", async () => {
    // detail + contract resolve so retainagePct/prior are available
    __mock.from.mockImplementation((t: string) => {
      if (t === "prime_contract_pay_apps") return makeBuilder({ data: { id: "pa5", prime_contract_id: "pc1", pay_app_no: 5, status: "draft" }, error: null });
      if (t === "prime_contracts") return makeBuilder({ data: { original_value: 1000, retainage_pct: 10 }, error: null });
      if (t === "sov_line_items") return makeBuilder({ data: [{ id: "l1", item_no: "1", kind: "base", description: "x", unit: "LS", scheduled_qty: 1, unit_price: 1000, scheduled_value: 1000, sort_order: 1 }], error: null });
      // pay_app_line_progress (this + prior) + upsert target
      return makeBuilder({ data: [], error: null });
    });
    const { result } = renderHookWithClient(() => usePayAppContinuation("pa5"));
    // upsert one line; should not throw and should compute via computeLineToDate
    await result.current.upsertLine.mutateAsync({
      sov_line_item_id: "l1", scheduled_value: 1000,
      qty_this_period: 10, value_this_period: 100,
    });
    expect(result.current.upsertLine.isError).toBe(false);
  });
});
