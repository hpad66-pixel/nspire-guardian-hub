import { describe, it, expect } from 'vitest';
import { summarizeScopes, type ProjectScope } from '../useProjectScopes';

const scope = (fee: number, pct: number, billed = 0): ProjectScope => ({
  id: 'x', tenant_id: 't', project_id: 'p', scope_no: 1, title: 's', description: null,
  owner_id: null, status: 'in_progress', start_date: null, due_date: null,
  fee_amount: fee, pct_complete: pct, pct_billed: billed, sort_order: 0,
  created_by: null, created_at: '', updated_at: '',
});

describe('summarizeScopes', () => {
  it('returns zeros for empty input', () => {
    expect(summarizeScopes([])).toEqual({ count: 0, totalFee: 0, earned: 0, billed: 0, unbilled: 0, pctComplete: 0 });
    expect(summarizeScopes(undefined).count).toBe(0);
  });

  it('computes fee-weighted completion and billing rollup', () => {
    const s = summarizeScopes([scope(100_000, 50, 25), scope(100_000, 0, 0)]);
    expect(s.count).toBe(2);
    expect(s.totalFee).toBe(200_000);
    expect(s.earned).toBe(50_000);        // 100k*50% + 100k*0%
    expect(s.billed).toBe(25_000);        // 100k*25%
    expect(s.unbilled).toBe(25_000);      // earned - billed
    expect(s.pctComplete).toBe(25);       // 50k / 200k
  });

  it('avoids divide-by-zero when total fee is 0', () => {
    expect(summarizeScopes([scope(0, 80)]).pctComplete).toBe(0);
  });
});
