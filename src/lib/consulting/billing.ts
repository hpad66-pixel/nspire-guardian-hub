// Pure consulting-invoice billing math — no supabase import, so it's directly
// unit-testable. Bill the delta between previously-billed % and this invoice's %.
// Proposal mode tracks prior billed + prior paid so successive invoices keep a
// continuous running tab for the same engagement.

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
  client_name?: string | null;
  client_email?: string | null;
  terms?: string | null;
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
  previously_paid: number;
  remaining: number;
  /** Editable amount for *this* invoice (defaults to remaining). */
  this_amount: number;
  included: boolean;
  terms?: string | null;
  client_name?: string | null;
  client_email?: string | null;
}

/** One row in the project / proposal running A/R ledger. */
export interface ConsultingLedgerEntry {
  invoice_id: string;
  invoice_no: number;
  issue_date: string;
  status: string;
  subject: string | null;
  total: number;
  paid: number;
  balance: number;
  proposal_nos: string[];
}

export interface ProposalAccountSummary {
  proposal_id: string;
  proposal_no: string;
  title: string;
  approved_fee: number;
  previously_billed: number;
  previously_paid: number;
  this_invoice: number;
  /** Remaining on the proposal after this invoice (before cash on this draft). */
  remaining_after: number;
  /** Open A/R on prior invoices for this proposal (billed − paid). */
  prior_open_ar: number;
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
 * Allocate invoice-level payments across proposal lines by each line's share
 * of the invoice total. Lines without proposal_id are ignored for the map.
 */
export function allocatePaymentsByProposal(
  invoiceLines: Array<{ invoice_id: string; proposal_id?: string | null; amount: number }>,
  invoicePayments: Array<{ invoice_id: string; amount: number }>,
): Record<string, number> {
  const paidByInvoice: Record<string, number> = {};
  for (const p of invoicePayments) {
    paidByInvoice[p.invoice_id] = money2((paidByInvoice[p.invoice_id] ?? 0) + (Number(p.amount) || 0));
  }

  const linesByInvoice = new Map<string, Array<{ proposal_id: string; amount: number }>>();
  for (const l of invoiceLines) {
    if (!l.proposal_id) continue;
    const list = linesByInvoice.get(l.invoice_id) ?? [];
    list.push({ proposal_id: l.proposal_id, amount: Number(l.amount) || 0 });
    linesByInvoice.set(l.invoice_id, list);
  }

  const out: Record<string, number> = {};
  for (const [invoiceId, ls] of linesByInvoice) {
    const paid = paidByInvoice[invoiceId] ?? 0;
    if (paid <= 0) continue;
    const proposalTotal = ls.reduce((s, l) => s + l.amount, 0);
    if (proposalTotal <= 0) continue;
    for (const l of ls) {
      const share = paid * (l.amount / proposalTotal);
      out[l.proposal_id] = money2((out[l.proposal_id] ?? 0) + share);
    }
  }
  return out;
}

/**
 * Build one billable row per approved financial proposal, subtracting any
 * amount already invoiced against that proposal_id (non-void invoices) and
 * carrying prior payments so the next invoice keeps a continuous tab.
 */
export function buildProposalBillingRows(
  proposals: ApprovedProposalForBilling[],
  billedByProposalId: Record<string, number> = {},
  paidByProposalId: Record<string, number> = {},
): ProposalBillingRow[] {
  return proposals
    .filter((p) => p.status === "approved")
    .map((p) => {
      const fee = money2(proposalTotals(p.proposal_lines ?? [], p).total);
      const previously = money2(billedByProposalId[p.id] ?? 0);
      const previouslyPaid = money2(paidByProposalId[p.id] ?? 0);
      const remaining = money2(Math.max(0, fee - previously));
      return {
        proposal_id: p.id,
        proposal_no: p.proposal_no,
        title: p.title,
        fee_amount: fee,
        previously_billed: previously,
        previously_paid: previouslyPaid,
        remaining,
        this_amount: remaining,
        included: remaining > 0,
        terms: p.terms ?? null,
        client_name: p.client_name ?? null,
        client_email: p.client_email ?? null,
      };
    })
    .sort((a, b) => a.proposal_no.localeCompare(b.proposal_no));
}

/** Convert selected proposal billing rows into consulting invoice lines. */
export function buildInvoiceLinesFromProposals(
  rows: Array<
    Pick<
      ProposalBillingRow,
      "proposal_id" | "proposal_no" | "title" | "remaining" | "this_amount" | "included" | "fee_amount" | "previously_billed"
    >
  >,
): BillableLine[] {
  return rows
    .filter((r) => r.included && money2(r.this_amount) > 0)
    .map((r) => {
      const amount = money2(Math.min(Math.max(0, Number(r.this_amount) || 0), r.remaining > 0 ? r.remaining : Number(r.this_amount) || 0));
      // When fee is known, express this invoice as a % of the approved fee so
      // PDF / continuity sheets show progress across successive invoices.
      const fee = money2(r.fee_amount);
      const prevPct = fee > 0 ? money2((r.previously_billed / fee) * 100) : 0;
      const thisPct = fee > 0 ? money2(((r.previously_billed + amount) / fee) * 100) : 100;
      return {
        scope_id: null,
        proposal_id: r.proposal_id,
        description: `${r.proposal_no} · ${r.title}`,
        fee_amount: fee || amount,
        pct_prev: Math.min(100, prevPct),
        pct_this: Math.min(100, thisPct || 100),
        amount,
      };
    });
}

/** Account summary for the PDF / detail view of one invoice. */
export function buildProposalAccountSummaries(
  rows: ProposalBillingRow[],
): ProposalAccountSummary[] {
  return rows
    .filter((r) => r.included && money2(r.this_amount) > 0)
    .map((r) => {
      const thisInvoice = money2(r.this_amount);
      return {
        proposal_id: r.proposal_id,
        proposal_no: r.proposal_no,
        title: r.title,
        approved_fee: r.fee_amount,
        previously_billed: r.previously_billed,
        previously_paid: r.previously_paid,
        this_invoice: thisInvoice,
        remaining_after: money2(Math.max(0, r.fee_amount - r.previously_billed - thisInvoice)),
        prior_open_ar: money2(Math.max(0, r.previously_billed - r.previously_paid)),
      };
    });
}

/** Roll invoices + payments into a chronological running ledger. */
export function buildConsultingLedger(
  invoices: Array<{
    id: string;
    invoice_no: number;
    issue_date: string;
    status: string;
    subject?: string | null;
    total: number;
  }>,
  payments: Array<{ invoice_id: string; amount: number }>,
  lines: Array<{ invoice_id: string; proposal_id?: string | null; description?: string }> = [],
): ConsultingLedgerEntry[] {
  const paidByInvoice: Record<string, number> = {};
  for (const p of payments) {
    paidByInvoice[p.invoice_id] = money2((paidByInvoice[p.invoice_id] ?? 0) + (Number(p.amount) || 0));
  }
  const proposalsByInvoice = new Map<string, Set<string>>();
  for (const l of lines) {
    if (!l.proposal_id && !l.description) continue;
    const set = proposalsByInvoice.get(l.invoice_id) ?? new Set();
    if (l.description?.includes("·")) {
      set.add(l.description.split("·")[0].trim());
    }
    proposalsByInvoice.set(l.invoice_id, set);
  }

  return invoices
    .filter((i) => i.status !== "void")
    .slice()
    .sort((a, b) => a.invoice_no - b.invoice_no)
    .map((inv) => {
      const paid = paidByInvoice[inv.id] ?? 0;
      const total = money2(inv.total);
      return {
        invoice_id: inv.id,
        invoice_no: inv.invoice_no,
        issue_date: inv.issue_date,
        status: inv.status,
        subject: inv.subject ?? null,
        total,
        paid,
        balance: money2(Math.max(0, total - paid)),
        proposal_nos: Array.from(proposalsByInvoice.get(inv.id) ?? []),
      };
    });
}

export function defaultPaymentTerms(fromProposal?: string | null): string {
  const t = (fromProposal || "").trim();
  if (t) return t;
  return "Net 30 — payment due within 30 days of invoice date.";
}

export function defaultInvoiceSubject(
  projectName: string,
  proposalNos: string[],
): string {
  if (proposalNos.length === 1) {
    return `Professional services — ${proposalNos[0]} — ${projectName}`;
  }
  if (proposalNos.length > 1) {
    return `Professional services — ${proposalNos.join(", ")} — ${projectName}`;
  }
  return `Professional services — ${projectName}`;
}
