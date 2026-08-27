import type { FinancialProposalLine } from "@/hooks/useFinancialProposals";

export interface ProposalPricingRates {
  overhead_pct?: number | null;
  profit_pct?: number | null;
}

export interface ProposalPricingTotals {
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
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
  lines: Pick<FinancialProposalLine, "quantity" | "unit_cost">[],
  rates: ProposalPricingRates,
): ProposalPricingTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + finiteNonNegative(line.quantity) * finiteNonNegative(line.unit_cost),
    0,
  );
  const overhead = subtotal * (finiteNonNegative(rates.overhead_pct) / 100);
  const profit = subtotal * (finiteNonNegative(rates.profit_pct) / 100);
  return { subtotal, overhead, profit, total: subtotal + overhead + profit };
}
