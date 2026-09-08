import { describe, expect, it } from 'vitest';
import {
  getClosedFinancialResult,
  getProjectOwnerInitials,
  getProjectOwnerLabel,
} from '../projectCardPresentation';

describe('project card presentation', () => {
  it('shows a named accountable owner and initials', () => {
    const project = { owner: { full_name: 'Simi Patel', email: 'simi@example.com' } };
    expect(getProjectOwnerLabel(project)).toBe('Simi Patel');
    expect(getProjectOwnerInitials(project)).toBe('SP');
  });

  it('clearly identifies a historical unassigned project', () => {
    expect(getProjectOwnerLabel({ owner: null })).toBe('Unassigned');
    expect(getProjectOwnerInitials({ owner: null })).toBe('?');
  });

  it('presents a frozen negative closeout as a final net loss', () => {
    const result = getClosedFinancialResult({
      status: 'closed',
      close_snapshot: { financial_position: { net_profit: '-400.00' } },
    });
    expect(result).toEqual({ amount: -400, absoluteAmount: 400, kind: 'loss', label: 'Final net loss' });
  });

  it('presents profit and break-even without inventing a sign', () => {
    expect(getClosedFinancialResult({
      status: 'closed',
      close_snapshot: { financial_position: { net_profit: 1250.5 } },
    })?.kind).toBe('profit');
    expect(getClosedFinancialResult({
      status: 'closed',
      close_snapshot: { financial_position: { net_profit: 0 } },
    })?.kind).toBe('break_even');
  });

  it('does not expose a draft or malformed number as reconciled', () => {
    expect(getClosedFinancialResult({
      status: 'active',
      close_snapshot: { financial_position: { net_profit: 500 } },
    })).toBeNull();
    expect(getClosedFinancialResult({
      status: 'closed',
      close_snapshot: { financial_position: { net_profit: 'pending' } },
    })).toBeNull();
  });
});
