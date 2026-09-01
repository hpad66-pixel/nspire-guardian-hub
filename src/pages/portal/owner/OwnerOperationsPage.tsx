/**
 * Owner portal — Stores / maintenance operations (high-level).
 * Shows trends, top repairs, repeat offenders — not the full stock cage.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Package, ShieldCheck, Sparkles, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useClientPortalProject, useOwnerPortalHref } from '@/components/portal/ClientPortalProjectContext';
import { StoresAnalyticsCharts } from '@/components/projects/stores/StoresAnalyticsCharts';
import {
  useProjectPropertyId,
  useStoresItems,
  useStoresTransactions,
  useStoresWorkOrders,
} from '@/hooks/useProjectStores';
import {
  buildStoresAiBrief,
  issuesByMonth,
  issuesByUnit,
  lowStockItems,
  money,
  onHandValue,
  repeatOffenders,
  spendByCategory,
  topMovedParts,
} from '@/lib/stores/storesAnalytics';

export default function OwnerOperationsPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId, projects } = useClientPortalProject();
  const projectName = projects.find((p) => p.id === projectId)?.name ?? 'Your project';
  const { data: project, isLoading: loadingProject } = useProjectPropertyId(projectId);
  const propertyId = project?.property_id ?? undefined;
  const { data: items = [], isLoading: loadingItems } = useStoresItems(propertyId);
  const { data: txns = [], isLoading: loadingTxns } = useStoresTransactions(propertyId);
  const { data: workOrders = [] } = useStoresWorkOrders(propertyId);

  const view = useMemo(() => {
    const byCategory = spendByCategory(items, txns);
    const byMonth = issuesByMonth(txns);
    const topParts = topMovedParts(items, txns, 8);
    const byUnit = issuesByUnit(txns, 10);
    const repeats = repeatOffenders(items, txns, 2);
    const brief = buildStoresAiBrief({ propertyName: projectName, items, txns, workOrders });
    const closed = workOrders.filter((w) => ['completed', 'verified', 'closed'].includes(w.status)).length;
    return {
      byCategory,
      byMonth,
      topParts,
      byUnit,
      repeats,
      brief,
      onHand: onHandValue(items),
      low: lowStockItems(items).length,
      closed,
      issueCount: txns.filter((t) => t.transaction_type === 'used').length,
      materialsSpend: money(byCategory.reduce((s, c) => s + c.spend, 0)),
    };
  }, [items, txns, workOrders, projectName]);

  const loading = loadingProject || loadingItems || loadingTxns;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6" data-testid="owner-operations-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to={href()} className="text-sm text-muted-foreground hover:underline">← Portal overview</Link>
          <h1 className="mt-2 font-display text-4xl font-medium text-[#082b23]">Operations & materials</h1>
          <p className="mt-1 text-muted-foreground">
            Transparent maintenance for {projectName} — what was repaired, where, and how often. Every part ties to a work order.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Work-order controlled
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading operations…
        </div>
      ) : !propertyId || items.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-10 text-center text-muted-foreground">
            <Warehouse className="mx-auto h-8 w-8 opacity-50" />
            <p>Stores & materials for this project will appear here once the stock room is activated.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border border-[#0D3B30]/15 bg-gradient-to-br from-[#0D3B30] to-[#0f766e] p-6 text-white shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/90">Maintenance transparency</p>
                <h2 className="mt-1 text-3xl font-bold">Living materials register</h2>
                <p className="mt-2 max-w-xl text-sm text-white/80">
                  {view.issueCount} parts issued · {view.closed} work orders closed · ${view.materialsSpend.toLocaleString()} materials spend in the window shown.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase text-white/70">On-hand</p>
                  <p className="text-2xl font-bold tabular-nums">${view.onHand.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/70">Low stock</p>
                  <p className="text-2xl font-bold tabular-nums">{view.low}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/70">SKUs</p>
                  <p className="text-2xl font-bold tabular-nums">{items.length}</p>
                </div>
              </div>
            </div>
          </section>

          <StoresAnalyticsCharts
            byCategory={view.byCategory}
            byMonth={view.byMonth}
            topParts={view.topParts}
            byUnit={view.byUnit}
            repeats={view.repeats}
          />

          <Card className="border-[#0D3B30]/15">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-[#0D3B30]">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-semibold">Monthly materials narrative</h3>
                <Badge variant="outline" className="ml-auto gap-1"><Package className="h-3 w-3" /> AI brief</Badge>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-[#1A1714]">
                {view.brief}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
