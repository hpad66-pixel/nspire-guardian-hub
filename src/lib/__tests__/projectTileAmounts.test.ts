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

  it('uses the certified closeout value for the Glorieta sewer project when rollups are empty', () => {
    const amt = resolveProjectTileAmounts({
      project: {
        id: '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d',
        name: 'Sewer Extension',
        project_type: 'property',
        budget: 0,
        spent: 0,
        property: { name: 'Glorieta Gardens' },
      },
      construction: { revised_contract: 0, billed_to_date: 0 },
    });

    expect(amt.kind).toBe('construction');
    expect(amt.budget).toBe(902104.65);
    expect(amt.spent).toBe(902104.65);
    expect(amt.source).toBe('certified_closeout');
  });

  it('uses the certified closeout value for the live Sewer Extension title even without a property relation', () => {
    const amt = resolveProjectTileAmounts({
      project: {
        id: 'live-sewer-extension',
        name: 'Sewer Extension',
        project_type: 'property',
        budget: 0,
        spent: 0,
        property: null,
      },
      construction: { revised_contract: 0, billed_to_date: 0 },
    });

    expect(amt.kind).toBe('construction');
    expect(amt.budget).toBe(902104.65);
    expect(amt.spent).toBe(902104.65);
    expect(amt.source).toBe('certified_closeout');
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
