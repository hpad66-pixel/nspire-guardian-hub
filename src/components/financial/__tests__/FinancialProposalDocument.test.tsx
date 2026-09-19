import { describe, expect, it } from "vitest";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import type { FinancialProposalLine } from "@/hooks/useFinancialProposals";

const line = (quantity: number, unitCost: number, markup: number): FinancialProposalLine => ({
  id: crypto.randomUUID(), tenant_id: "tenant", proposal_id: "proposal", line_no: 1,
  category: "labor", description: "Consulting services", quantity, unit: "hr",
  unit_cost: unitCost, markup_pct: markup, created_at: new Date().toISOString(),
});

describe("proposalTotals", () => {
  it("recomputes source cost, line markup, overhead, profit, and proposal total", () => {
    expect(proposalTotals([line(10, 150, 10), line(2, 500, 5)], { overhead_pct: 10, profit_pct: 5 })).toEqual({
      sourceSubtotal: 2500,
      lineMarkup: 200,
      subtotal: 2700,
      overhead: 250,
      profit: 125,
      total: 3075,
      apasProfit: 575,
    });
  });

  it("returns zeroes for an empty proposal", () => {
    expect(proposalTotals([], { overhead_pct: 10, profit_pct: 5 })).toEqual({ sourceSubtotal: 0, lineMarkup: 0, subtotal: 0, overhead: 0, profit: 0, total: 0, apasProfit: 0 });
  });
});
