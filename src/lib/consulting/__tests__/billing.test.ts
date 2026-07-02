import { describe, it, expect } from 'vitest';
import { lineAmount, buildBillableLines } from '../billing';

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
});
