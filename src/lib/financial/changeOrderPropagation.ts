import type { QueryClient } from '@tanstack/react-query';

export interface MarginClassificationRevision {
  source_amount?: number | string | null;
  source_amendment_count?: number | string | null;
}
export interface ChangeOrderRevision {
  amount?: number | string | null;
  amendment_history?: unknown;
}

export function changeOrderAmendmentCount(co: ChangeOrderRevision): number {
  return Array.isArray(co.amendment_history) ? co.amendment_history.length : 0;
}

/**
 * A saved vendor classification belongs to one commercial revision of an owner
 * CO. Keep the assignment visible, but require review if the CO was subsequently
 * reopened or its amount changed after the classification was saved.
 */
export function marginClassificationNeedsReview(
  co: ChangeOrderRevision,
  link: MarginClassificationRevision,
): boolean {
  const sourceAmount = Number(link.source_amount ?? 0);
  const currentAmount = Number(co.amount ?? 0);
  const sourceAmendments = Number(link.source_amendment_count ?? 0);
  return sourceAmount !== currentAmount || sourceAmendments !== changeOrderAmendmentCount(co);
}

/** Refresh every financial projection that reads change_orders or its vendor allocation. */
export function invalidateChangeOrderFinancialViews(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['margin'] });
  queryClient.invalidateQueries({ queryKey: ['vendor-reconciliation'] });
  queryClient.invalidateQueries({ queryKey: ['project-financials'] });
  queryClient.invalidateQueries({ queryKey: ['financial-report-data'] });
  queryClient.invalidateQueries({ queryKey: ['apas-trueup'] });
  queryClient.invalidateQueries({ queryKey: ['commitment-totals'] });
  queryClient.invalidateQueries({ queryKey: ['all-project-financials'] });
}
