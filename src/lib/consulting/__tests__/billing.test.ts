import { describe, it, expect } from 'vitest';
import {
  lineAmount,
  buildBillableLines,
  buildProposalBillingRows,
  buildInvoiceLinesFromProposals,
  allocatePaymentsByProposal,
  buildConsultingLedger,
  buildProposalAccountSummaries,
  defaultInvoiceSubject,
  defaultPaymentTerms,
} from '../billing';

describe('consulting billing', () => {
  it('bills the delta between prev and this %', () => {
    expect(lineAmount(100_000, 0, 50)).toBe(50_000);
    expect(lineAmount(100_000, 50, 75)).toBe(25_000);
    expect(lineAmount(100_000, 50, 50)).toBe(0);
  });

  it('never bills negative (this % below prev clamps to prev)', () => {
    expect(lineAmount(100_000, 60, 40)).toBe(0);
  });

  it('clamps this % to 100', () => {
    expect(lineAmount(100_000, 90, 150)).toBe(10_000);
  });

  it('seeds lines from scopes, defaulting this % to current completion', () => {
    const lines = buildBillableLines([
      { id: 'a', title: 'Discovery', fee_amount: 40_000, pct_complete: 100, pct_billed: 50 },
      { id: 'b', title: 'Design', fee_amount: 60_000, pct_complete: 20, pct_billed: 20 },
    ]);
    expect(lines[0]).toMatchObject({ scope_id: 'a', pct_prev: 50, pct_this: 100, amount: 20_000 });
    expect(lines[1]).toMatchObject({ scope_id: 'b', pct_prev: 20, pct_this: 20, amount: 0 });
  });

  it('builds invoice rows from every approved proposal (not just one)', () => {
    const rows = buildProposalBillingRows([
      {
        id: 'p1',
        proposal_no: 'PROP-001',
        title: 'Geotech permeability',
        status: 'approved',
        overhead_pct: 7.8,
        profit_pct: 0,
        // 3125 * 1.078 = 3368.75
        proposal_lines: [{ quantity: 1, unit_cost: 3125 }],
      },
      {
        id: 'p2',
        proposal_no: 'PROP-002',
        title: 'Contamination & Class VI',
        status: 'approved',
        overhead_pct: 0,
        profit_pct: 0,
        proposal_lines: [{ quantity: 1, unit_cost: 14_500 }],
      },
      {
        id: 'p3',
        proposal_no: 'PROP-003',
        title: 'Draft only',
        status: 'draft',
        proposal_lines: [{ quantity: 1, unit_cost: 99_000 }],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.proposal_no)).toEqual(['PROP-001', 'PROP-002']);
    expect(rows[0].fee_amount).toBe(3368.75);
    expect(rows[1].fee_amount).toBe(14_500);
    expect(rows.reduce((s, r) => s + r.remaining, 0)).toBe(17868.75);
    expect(rows.every((r) => r.included && r.this_amount === r.remaining)).toBe(true);
  });

  it('subtracts previously billed + carries prior paid for continuity', () => {
    const rows = buildProposalBillingRows(
      [
        {
          id: 'p1',
          proposal_no: 'PROP-001',
          title: 'Geotech',
          status: 'approved',
          overhead_pct: 0,
          profit_pct: 0,
          proposal_lines: [{ quantity: 1, unit_cost: 3369 }],
        },
        {
          id: 'p2',
          proposal_no: 'PROP-002',
          title: 'Class VI',
          status: 'approved',
          overhead_pct: 0,
          profit_pct: 0,
          proposal_lines: [{ quantity: 1, unit_cost: 14_500 }],
        },
      ],
      { p1: 3369 },
      { p1: 2000 },
    );

    expect(rows[0]).toMatchObject({
      remaining: 0,
      included: false,
      previously_paid: 2000,
      this_amount: 0,
    });
    expect(rows[1]).toMatchObject({ remaining: 14_500, included: true, previously_paid: 0 });

    const lines = buildInvoiceLinesFromProposals(rows);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      proposal_id: 'p2',
      description: 'PROP-002 · Class VI',
      amount: 14_500,
      pct_this: 100,
    });
  });

  it('honors editable this_amount under remaining for partial invoices', () => {
    const rows = buildProposalBillingRows(
      [
        {
          id: 'p1',
          proposal_no: 'PROP-001',
          title: 'Phase work',
          status: 'approved',
          overhead_pct: 0,
          profit_pct: 0,
          proposal_lines: [{ quantity: 1, unit_cost: 10_000 }],
        },
      ],
      {},
      {},
    );
    rows[0].this_amount = 4000;
    const lines = buildInvoiceLinesFromProposals(rows);
    expect(lines[0].amount).toBe(4000);
    expect(lines[0].pct_prev).toBe(0);
    expect(lines[0].pct_this).toBe(40);

    const summaries = buildProposalAccountSummaries(rows);
    expect(summaries[0]).toMatchObject({
      this_invoice: 4000,
      remaining_after: 6000,
      previously_billed: 0,
    });
  });

  it('allocates invoice payments across proposal lines by share', () => {
    const paid = allocatePaymentsByProposal(
      [
        { invoice_id: 'i1', proposal_id: 'p1', amount: 3000 },
        { invoice_id: 'i1', proposal_id: 'p2', amount: 1000 },
      ],
      [{ invoice_id: 'i1', amount: 2000 }],
    );
    expect(paid.p1).toBe(1500);
    expect(paid.p2).toBe(500);
  });

  it('builds a chronological running ledger with balances', () => {
    const entries = buildConsultingLedger(
      [
        { id: 'a', invoice_no: 2, issue_date: '2026-08-01', status: 'sent', subject: 'Phase 2', total: 5000 },
        { id: 'b', invoice_no: 1, issue_date: '2026-07-01', status: 'paid', subject: 'Phase 1', total: 3000 },
        { id: 'c', invoice_no: 3, issue_date: '2026-08-15', status: 'void', total: 999 },
      ],
      [
        { invoice_id: 'b', amount: 3000 },
        { invoice_id: 'a', amount: 1000 },
      ],
      [
        { invoice_id: 'a', proposal_id: 'p1', description: 'PROP-001 · Work' },
        { invoice_id: 'b', proposal_id: 'p1', description: 'PROP-001 · Work' },
      ],
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ invoice_no: 1, paid: 3000, balance: 0 });
    expect(entries[1]).toMatchObject({ invoice_no: 2, paid: 1000, balance: 4000 });
    expect(entries[1].proposal_nos).toContain('PROP-001');
  });

  it('defaults subject and payment terms', () => {
    expect(defaultInvoiceSubject('Larkin MRI', ['PROP-001', 'PROP-002'])).toContain('PROP-001');
    expect(defaultPaymentTerms(null)).toMatch(/Net 30/);
    expect(defaultPaymentTerms('Due on receipt')).toBe('Due on receipt');
  });
});
