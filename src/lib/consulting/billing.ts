// Pure consulting-invoice billing math — no supabase import, so it's directly
// unit-testable. Bill the delta between previously-billed % and this invoice's %.

import { proposalTotals } from "@/lib/financial/proposalPricing";

export interface BillableScope {
  id: string;
  title: string;
  fee_amount: number;
  pct_complete: number;
  pct_billed: number;
}

export interface BillableLine {
  scope_id: string | null;
  proposal_id?: string | null;
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

/** Approved financial proposal shape needed to seed an invoice. */
export interface ApprovedProposalForBilling {
  id: string;
  proposal_no: string;
  title: string;
  status: string;
  overhead_pct?: number | null;
  profit_pct?: number | null;
  proposal_lines?: Array<{ quantity: number; unit_cost: number }> | null;
}

export interface ProposalBillingRow {
  proposal_id: string;
  proposal_no: string;
  title: string;
  fee_amount: number;
  previously_billed: number;
  remaining: number;
  included: boolean;
}

/** Amount to bill for a scope when moving from `prev`% to `thisPct`%. */
export function lineAmount(fee: number, prev: number, thisPct: number): number {
  const clamped = Math.max(prev, Math.min(100, thisPct));
  return Math.round(((Number(fee) || 0) * (clamped - prev)) / 100 * 100) / 100;
}

/** Seed invoice lines from scopes: default "this %" = current completion. */
export function buildBillableLines(scopeRows: BillableScope[]): BillableLine[] {
  return scopeRows.map((s) => {
    const pctPrev = Number(s.pct_billed) || 0;
    const pctThis = Math.max(pctPrev, Number(s.pct_complete) || 0);
    return {
      scope_id: s.id,
      proposal_id: null,
      description: s.title,
      fee_amount: Number(s.fee_amount) || 0,
      pct_prev: pctPrev,
      pct_this: pctThis,
      amount: lineAmount(Number(s.fee_amount) || 0, pctPrev, pctThis),
    };
  });
}

const money2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Build one billable row per approved financial proposal, subtracting any
 * amount already invoiced against that proposal_id (non-void invoices).
 * Rows with $0 remaining stay listed but are unchecked.
 */
export function buildProposalBillingRows(
  proposals: ApprovedProposalForBilling[],
  billedByProposalId: Record<string, number> = {},
): ProposalBillingRow[] {
  return proposals
    .filter((p) => p.status === "approved")
    .map((p) => {
      const fee = money2(proposalTotals(p.proposal_lines ?? [], p).total);
      const previously = money2(billedByProposalId[p.id] ?? 0);
      const remaining = money2(Math.max(0, fee - previously));
      return {
        proposal_id: p.id,
        proposal_no: p.proposal_no,
        title: p.title,
        fee_amount: fee,
        previously_billed: previously,
        remaining,
        included: remaining > 0,
      };
    })
    .sort((a, b) => a.proposal_no.localeCompare(b.proposal_no));
}

/** Convert selected proposal billing rows into consulting invoice lines. */
export function buildInvoiceLinesFromProposals(
  rows: Array<Pick<ProposalBillingRow, "proposal_id" | "proposal_no" | "title" | "remaining" | "included">>,
): BillableLine[] {
  return rows
    .filter((r) => r.included && r.remaining > 0)
    .map((r) => ({
      scope_id: null,
      proposal_id: r.proposal_id,
      description: `${r.proposal_no} · ${r.title}`,
      fee_amount: r.remaining,
      pct_prev: 0,
      pct_this: 100,
      amount: r.remaining,
    }));
}
