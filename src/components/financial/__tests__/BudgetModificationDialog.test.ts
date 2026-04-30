import { describe, it, expect } from "vitest";

interface Transfer {
  fromCostCodeId: string | null;
  toCostCodeId: string | null;
  amount: number;
}

/**
 * Validator embedded in BudgetModificationDialog.handleSave — every transfer
 * needs distinct from/to cost codes and amount > 0. Extracted here for a
 * pure-function test since the component wiring is not trivial to harness.
 */
function transfersValid(transfers: Transfer[]): boolean {
  if (transfers.length === 0) return false;
  return transfers.every((t) =>
    Boolean(t.fromCostCodeId) &&
    Boolean(t.toCostCodeId) &&
    t.fromCostCodeId !== t.toCostCodeId &&
    t.amount > 0,
  );
}

describe("BudgetModificationDialog transfer validation", () => {
  it("accepts a single valid transfer", () => {
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: "b", amount: 100 },
    ])).toBe(true);
  });

  it("rejects same-cost-code transfer", () => {
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: "a", amount: 100 },
    ])).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: "b", amount: 0 },
    ])).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: "b", amount: -50 },
    ])).toBe(false);
  });

  it("rejects missing cost code on either side", () => {
    expect(transfersValid([
      { fromCostCodeId: null, toCostCodeId: "b", amount: 100 },
    ])).toBe(false);
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: null, amount: 100 },
    ])).toBe(false);
  });

  it("rejects empty list", () => {
    expect(transfersValid([])).toBe(false);
  });

  it("all transfers must pass for the mod to be valid", () => {
    expect(transfersValid([
      { fromCostCodeId: "a", toCostCodeId: "b", amount: 100 },
      { fromCostCodeId: "c", toCostCodeId: "c", amount: 50 }, // invalid
    ])).toBe(false);
  });
});
