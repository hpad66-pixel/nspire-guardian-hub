import { describe, it, expect } from "vitest";
import {
  allocatedTotal, unallocated, hasValidTarget, validateAllocations, type AllocationDraft,
} from "../paymentAllocation";

const base = (amount: number): AllocationDraft => ({ kind: "base", amount });
const co = (id: string, amount: number): AllocationDraft => ({ kind: "change_order", change_order_id: id, amount });
const line = (id: string, amount: number): AllocationDraft => ({ kind: "line_item", sov_line_item_id: id, amount });

describe("paymentAllocation", () => {
  it("totals and remainder", () => {
    const allocs = [base(1000), co("c1", 500)];
    expect(allocatedTotal(allocs)).toBe(1500);
    expect(unallocated(2000, allocs)).toBe(500);
    expect(unallocated(1500, allocs)).toBe(0);
  });

  it("validates targets per kind", () => {
    expect(hasValidTarget(base(10))).toBe(true);
    expect(hasValidTarget({ kind: "change_order", amount: 10 })).toBe(false);
    expect(hasValidTarget(co("c1", 10))).toBe(true);
    expect(hasValidTarget(line("l1", 10))).toBe(true);
    expect(hasValidTarget({ kind: "line_item", change_order_id: "x", amount: 10 } as AllocationDraft)).toBe(false);
  });

  it("flags over-allocation, bad amounts, and missing targets", () => {
    expect(validateAllocations(1000, [base(600), co("c1", 600)])).toEqual([
      expect.stringMatching(/exceed the payment amount/),
    ]);
    expect(validateAllocations(1000, [base(0)])).toContainEqual(expect.stringMatching(/greater than 0/));
    expect(validateAllocations(1000, [{ kind: "change_order", amount: 100 }])).toContainEqual(
      expect.stringMatching(/choose what to apply/),
    );
    expect(validateAllocations(1000, [base(400), co("c1", 600)])).toEqual([]); // exactly full = ok
  });
});
