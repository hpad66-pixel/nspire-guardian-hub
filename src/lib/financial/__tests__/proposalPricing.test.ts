import { describe, expect, it } from "vitest";
import { proposalTotals } from "../proposalPricing";

describe("proposalTotals", () => {
  it("calculates overhead and profit independently from the work subtotal", () => {
    const totals = proposalTotals(
      [
        { quantity: 10, unit_cost: 150 },
        { quantity: 2, unit_cost: 500 },
      ],
      { overhead_pct: 10, profit_pct: 5 },
    );

    expect(totals).toEqual({
      sourceSubtotal: 2500,
      lineMarkup: 0,
      subtotal: 2500,
      overhead: 250,
      profit: 125,
      total: 2875,
      apasProfit: 375,
    });
  });

  it("supports an explicitly waived percentage without adding a line item", () => {
    expect(proposalTotals([{ quantity: 1, unit_cost: 1000 }], { overhead_pct: 12, profit_pct: 0 }))
      .toEqual({ sourceSubtotal: 1000, lineMarkup: 0, subtotal: 1000, overhead: 120, profit: 0, total: 1120, apasProfit: 120 });
  });

  it("tracks line-level APAS markup for approved value rows", () => {
    expect(proposalTotals([{ quantity: 1, unit_cost: 22000, markup_pct: 10 }], { overhead_pct: 0, profit_pct: 0 }))
      .toEqual({ sourceSubtotal: 22000, lineMarkup: 2200, subtotal: 24200, overhead: 0, profit: 0, total: 24200, apasProfit: 2200 });
  });

  it("does not allow invalid input to corrupt the financial total", () => {
    expect(proposalTotals([{ quantity: -1, unit_cost: Number.NaN }], { overhead_pct: -5, profit_pct: Number.NaN }))
      .toEqual({ sourceSubtotal: 0, lineMarkup: 0, subtotal: 0, overhead: 0, profit: 0, total: 0, apasProfit: 0 });
  });
});
