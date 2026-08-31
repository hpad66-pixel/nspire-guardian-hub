import { describe, it, expect } from 'vitest';
import {
  lineAmount,
  buildBillableLines,
  buildProposalBillingRows,
  buildInvoiceLinesFromProposals,
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
    expect(rows.every((r) => r.included)).toBe(true);
  });

  it('subtracts previously billed amounts per proposal and skips fully billed', () => {
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
    );

    expect(rows[0]).toMatchObject({ remaining: 0, included: false });
    expect(rows[1]).toMatchObject({ remaining: 14_500, included: true });

    const lines = buildInvoiceLinesFromProposals(rows);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      proposal_id: 'p2',
      description: 'PROP-002 · Class VI',
      amount: 14_500,
      pct_this: 100,
    });
  });
});
