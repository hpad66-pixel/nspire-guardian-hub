import type { FinancialProposalLine } from "@/hooks/useFinancialProposals";

export interface ProposalPricingRates {
  overhead_pct?: number | null;
  profit_pct?: number | null;
}

export interface ProposalPricingTotals {
  sourceSubtotal: number;
  lineMarkup: number;
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
  apasProfit: number;
}

const finiteNonNegative = (value: number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

/**
 * Proposal pricing mirrors the change-order engine: both overhead and profit
 * are independent percentages of the cost-of-work subtotal. They are derived
 * amounts and are never represented as proposal line items.
 */
export function proposalTotals(
  lines: Array<Pick<FinancialProposalLine, "quantity" | "unit_cost"> & { markup_pct?: number | null }>,
  rates: ProposalPricingRates,
): ProposalPricingTotals {
  const sourceSubtotal = lines.reduce(
    (sum, line) => sum + finiteNonNegative(line.quantity) * finiteNonNegative(line.unit_cost),
    0,
  );
  const lineMarkup = lines.reduce((sum, line) => {
    const base = finiteNonNegative(line.quantity) * finiteNonNegative(line.unit_cost);
    return sum + base * (finiteNonNegative(line.markup_pct) / 100);
  }, 0);
  const subtotal = sourceSubtotal + lineMarkup;
  const overhead = sourceSubtotal * (finiteNonNegative(rates.overhead_pct) / 100);
  const profit = sourceSubtotal * (finiteNonNegative(rates.profit_pct) / 100);
  return {
    sourceSubtotal,
    lineMarkup,
    subtotal,
    overhead,
    profit,
    total: subtotal + overhead + profit,
    apasProfit: lineMarkup + overhead + profit,
  };
}
