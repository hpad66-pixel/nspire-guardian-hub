import { describe, it, expect } from 'vitest';
import { resolveProjectTileAmounts } from '@/lib/projectTileAmounts';

describe('resolveProjectTileAmounts', () => {
  it('sums approved consulting proposals for Larkin-style MRI Building', () => {
    const amt = resolveProjectTileAmounts({
      project: { project_type: 'consulting', budget: 14500, spent: 0 },
      consulting: { approvedFee: 3368.75 + 14500, invoiced: 0 },
    });
    expect(amt.kind).toBe('consulting');
    expect(amt.budget).toBe(17868.75);
    expect(amt.source).toBe('approved_proposals');
    expect(amt.spent).toBe(0);
  });

  it('uses construction financial summary when present', () => {
    const amt = resolveProjectTileAmounts({
      project: { project_type: 'property', budget: 1, spent: 1 },
      construction: { revised_contract: 953350.35, billed_to_date: 887204.2 },
    });
    expect(amt.kind).toBe('construction');
    expect(amt.budget).toBe(953350.35);
    expect(amt.spent).toBe(887204.2);
    expect(amt.source).toBe('construction_financials');
  });

  it('falls back to projects.budget when consulting has no approved proposals yet', () => {
    const amt = resolveProjectTileAmounts({
      project: { project_type: 'consulting', budget: 5000, spent: 100 },
      consulting: { approvedFee: 0, invoiced: 0 },
    });
    expect(amt.budget).toBe(5000);
    expect(amt.source).toBe('project_budget');
  });
});
