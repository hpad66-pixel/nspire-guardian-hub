/**
 * Owner-only executive dashboard for Property Ops.
 * Property Managers and techs cannot see this route.
 */
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Crown, Loader2, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { useWorkOrdersByProperty } from '@/hooks/useWorkOrders';
import {
  useStoresItems,
  useStoresTransactions,
  useStoresReceipts,
  useStoresWorkOrders,
} from '@/hooks/useProjectStores';
import {
  buildStoresAiBrief,
  issuesByMonth,
  issuesByUnit,
  money,
  onHandValue,
  predictiveFlags,
  repeatOffenders,
  spendByCategory,
  topMovedParts,
} from '@/lib/stores/storesAnalytics';
import { StoresAnalyticsCharts } from '@/components/projects/stores/StoresAnalyticsCharts';
import { computeWorkOrderDashboardKpis } from '@/lib/workorders/workOrderDashboard';

export default function OpsExecutivePage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrdersByProperty(propertyId);
  const { data: items = [], isLoading: itemsLoading } = useStoresItems(propertyId ?? undefined);
  const { data: txns = [], isLoading: txLoading } = useStoresTransactions(propertyId ?? undefined);
  const { data: receipts = [] } = useStoresReceipts(propertyId ?? undefined);
  const { data: storesWOs = [] } = useStoresWorkOrders(propertyId ?? undefined);

  const kpis = useMemo(() => computeWorkOrderDashboardKpis(workOrders as any), [workOrders]);
  const view = useMemo(() => {
    const byCategory = spendByCategory(items, txns);
    const byMonth = issuesByMonth(txns);
    const topParts = topMovedParts(items, txns, 6);
    const byUnit = issuesByUnit(txns, 10);
    const repeats = repeatOffenders(items, txns, 2);
    const flags = predictiveFlags(items, txns);
    const brief = buildStoresAiBrief({
      propertyName: context?.property_name ?? 'Property',
      items,
      txns,
      workOrders: storesWOs,
    });
    const receiptSpend = receipts.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    return {
      byCategory,
      byMonth,
      topParts,
      byUnit,
      repeats,
      flags,
      brief,
      onHand: onHandValue(items),
      receiptSpend,
      materialsSpend: byCategory.reduce((s, c) => s + c.spend, 0),
    };
  }, [items, txns, storesWOs, receipts, context?.property_name]);

  if (!isLoading && !can('executive')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  const loading = isLoading || woLoading || itemsLoading || txLoading;

  return (
    <div className="space-y-6" data-testid="ops-executive-page">
      <div>
        <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#d5aa52]/40 bg-[#d5aa52]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#08271f]">
          <Crown className="h-3.5 w-3.5" /> Owner exclusive
        </div>
        <h1 className="mt-3 font-display text-4xl font-medium text-[#08271f]">Executive Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5c6863]">
          High-level property performance for {context?.property_name}. Maintenance staff and property managers do not see this view.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#dedbd1] bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open backlog</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold text-[#08271f]">{kpis.backlog}</CardContent>
            </Card>
            <Card className="border-[#dedbd1] bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Created today</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold text-[#08271f]">{kpis.createdToday}</CardContent>
            </Card>
            <Card className="border-[#dedbd1] bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Materials spend</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold text-[#08271f]">{money(view.materialsSpend)}</CardContent>
            </Card>
            <Card className="border-[#dedbd1] bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> On-hand stock</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold text-[#08271f]">{money(view.onHand)}</CardContent>
            </Card>
          </div>

          <Card className="border-[#dedbd1] bg-[#08271f] text-white">
            <CardHeader>
              <CardTitle className="font-display text-2xl font-medium text-[#d5aa52]">Owner brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-[#dce5e1]">
              {view.brief.split('\n').filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <p className="pt-2 text-xs text-[#9aada6]">
                Procurement receipts recorded: {receipts.length} · total {money(view.receiptSpend)}
              </p>
            </CardContent>
          </Card>

          {view.flags.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-900">Predictive flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-amber-950">
                {view.flags.slice(0, 6).map((flag) => (
                  <p key={flag.id}>
                    <span className="font-semibold">{flag.title}</span>
                    {flag.detail ? ` — ${flag.detail}` : ''}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <StoresAnalyticsCharts
            byCategory={view.byCategory}
            byMonth={view.byMonth}
            topParts={view.topParts}
            byUnit={view.byUnit}
            repeats={view.repeats}
          />
        </>
      )}
    </div>
  );
}
