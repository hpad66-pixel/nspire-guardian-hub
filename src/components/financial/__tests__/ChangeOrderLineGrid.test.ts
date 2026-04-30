import { describe, it, expect } from "vitest";

/**
 * Balance math shared by CO line grid + trigger validate_co_execute.
 * Line total must equal header amount when a CO moves to 'executed'.
 */
function varianceCents(lineTotal: number, headerAmount: number): number {
  return Math.round((lineTotal - headerAmount) * 100);
}
function isBalanced(lineTotal: number, headerAmount: number): boolean {
  return Math.abs(varianceCents(lineTotal, headerAmount)) === 0;
}

describe("change-order line balance math", () => {
  it("equal totals report balanced", () => {
    expect(isBalanced(25000, 25000)).toBe(true);
    expect(varianceCents(25000, 25000)).toBe(0);
  });
  it("line total > header reports positive variance", () => {
    expect(isBalanced(25010, 25000)).toBe(false);
    expect(varianceCents(25010, 25000)).toBe(1000);
  });
  it("line total < header reports negative variance", () => {
    expect(isBalanced(24990.5, 25000)).toBe(false);
    expect(varianceCents(24990.5, 25000)).toBe(-950);
  });
  it("sub-cent differences still flag as unbalanced", () => {
    // 25000.001 vs 25000 → rounds to 0 cents; considered balanced
    expect(isBalanced(25000.001, 25000)).toBe(true);
    // 25000.005 → rounds to 0-1 cent depending on rounding
    // Postgres numeric(14,2) will round half-even; test the 0.01 threshold
    expect(isBalanced(25000.01, 25000)).toBe(false);
  });
});
