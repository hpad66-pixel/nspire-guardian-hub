import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  changeOrderAmendmentCount,
  invalidateChangeOrderFinancialViews,
  marginClassificationNeedsReview,
} from '../changeOrderPropagation';

describe('change-order margin amendment propagation', () => {
  it('keeps a classification saved when amount and amendment revision match', () => {
    expect(marginClassificationNeedsReview(
      { amount: 24_000, amendment_history: [{ at: '2026-08-01' }] },
      { source_amount: '24000.00', source_amendment_count: 1 },
    )).toBe(false);
  });

  it('requires review when an executed CO was reopened after classification', () => {
    expect(marginClassificationNeedsReview(
      { amount: 24_000, amendment_history: [{ at: '2026-08-01' }, { at: '2026-08-24' }] },
      { source_amount: 24_000, source_amendment_count: 1 },
    )).toBe(true);
  });

  it('requires review when the draft amendment changes the owner amount', () => {
    expect(marginClassificationNeedsReview(
      { amount: 26_500, amendment_history: [{ at: '2026-08-24' }] },
      { source_amount: 24_000, source_amendment_count: 1 },
    )).toBe(true);
  });

  it('treats non-array history as no amendments', () => {
    expect(changeOrderAmendmentCount({ amendment_history: null })).toBe(0);
    expect(changeOrderAmendmentCount({ amendment_history: { bad: true } })).toBe(0);
  });

  it('invalidates margin, every vendor tab, and downstream financial views', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    invalidateChangeOrderFinancialViews(queryClient);

    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    expect(keys).toEqual(expect.arrayContaining([
      'margin',
      'vendor-reconciliation',
      'project-financials',
      'financial-report-data',
      'apas-trueup',
      'commitment-totals',
      'all-project-financials',
    ]));
  });
});
