import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { DollarSign, Building2, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useUtilityBills, useUtilityYearOverYear } from '@/hooks/useUtilityBills';
import { useInventoryItems, useLowStockCount } from '@/hooks/useInventory';

interface PropertyCostSummaryProps {
  propertyId: string;
  totalUnits: number | null;
  selectedYear: number;
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const isUp = pct > 0;
  const isNeutral = Math.abs(pct) <= 0;
  const color = isUp
    ? Math.abs(pct) > 5 ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600'
    : 'bg-emerald-100 text-emerald-700';
  return (
    <Badge className={`${color} border-0 text-xs font-medium hover:${color}`}>
      {isUp ? <TrendingUp className="h-3 w-3 mr-0.5 inline" /> : <TrendingDown className="h-3 w-3 mr-0.5 inline" />}
      {isUp ? '+' : ''}{pct.toFixed(1)}% vs last year
    </Badge>
  );
}

export function PropertyCostSummary({ propertyId, totalUnits, selectedYear }: PropertyCostSummaryProps) {
  const { data: bills,   isLoading: billsLoading } = useUtilityBills(propertyId, { year: selectedYear });
  const { data: lastYearBills } = useUtilityBills(propertyId, { year: selectedYear - 1 });
  const { data: yoyData }       = useUtilityYearOverYear(propertyId);
  const { data: items,   isLoading: itemsLoading } = useInventoryItems(propertyId);
  const { data: lowStockCount } = useLowStockCount(propertyId);

  const ytdTotal = useMemo(
    () => (bills ?? []).reduce((sum, b) => sum + b.amount, 0),
    [bills]
  );

  const lastYearTotal = useMemo(
    () => (lastYearBills ?? []).reduce((sum, b) => sum + b.amount, 0),
    [lastYearBills]
  );

  const ytdChangePct = lastYearTotal > 0
    ? ((ytdTotal - lastYearTotal) / lastYearTotal) * 100
    : null;

  const monthlyAvgPerUnit = totalUnits && totalUnits > 0
    ? ytdTotal / 12 / totalUnits
    : null;

  const inventoryValue = useMemo(
    () => (items ?? []).reduce(
      (sum, item) => sum + (item.current_quantity * (item.unit_cost ?? 0)),
      0
    ),
    [items]
  );

  const uniqueCategories = useMemo(
    () => new Set((items ?? []).map((i) => i.category)).size,
    [items]
  );

  // YoY bar chart data
  const yoyChartData = useMemo(() => {
    if (!yoyData) return [];
    const byType: Record<string, Record<number, number>> = {};
    for (const row of yoyData) {
      if (!byType[row.utility_type]) byType[row.utility_type] = {};
      byType[row.utility_type][row.year] = row.annual_total;
    }
    return Object.entries(byType).map(([type, years]) => {
      const current  = years[selectedYear]      ?? 0;
      const previous = years[selectedYear - 1]  ?? 0;
      const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      return { type: type.charAt(0).toUpperCase() + type.slice(1), current, previous, changePct };
    }).sort((a, b) => b.current - a.current);
  }, [yoyData, selectedYear]);

  const isLoading = billsLoading || itemsLoading;

  const KPI_CARDS = [
    {
      title: 'YTD Utility Spend',
      icon: DollarSign,
      value: isLoading ? null : `$${ytdTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `${selectedYear} · all utilities`,
      badge: <ChangeBadge pct={ytdChangePct} />,
    },
    {
      title: 'Cost Per Unit',
      icon: Building2,
      value: isLoading ? null : monthlyAvgPerUnit != null
        ? `$${monthlyAvgPerUnit.toFixed(0)}/unit`
        : '—',
      sub: `monthly avg · ${totalUnits ?? '?'} units`,
      badge: <span className="text-xs text-muted-foreground">Industry avg ~$180/unit</span>,
    },
    {
      title: 'Inventory Items',
      icon: Package,
      value: isLoading ? null : `${(items ?? []).length}`,
      sub: `${uniqueCategories} categories tracked`,
      badge: (lowStockCount ?? 0) > 0 ? (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-xs">
          ⚠ {lowStockCount} low stock
        </Badge>
      ) : null,
    },
    {
      title: 'Inventory Value',
      icon: TrendingUp,
      value: isLoading ? null : `$${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: 'estimated at cost',
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                {card.value === null ? (
                  <Skeleton className="h-8 w-24 mb-2" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight mb-1">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground mb-2">{card.sub}</p>
                {card.badge}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* YoY comparison */}
      {yoyChartData.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">Year-Over-Year Comparison</h3>
            <p className="text-xs text-muted-foreground">{selectedYear - 1} vs {selectedYear}</p>
          </div>
          <div className="space-y-3">
            {yoyChartData.map((row) => {
              const maxVal = Math.max(row.current, row.previous, 1);
              const changeColor = row.changePct > 10
                ? 'text-destructive'
                : row.changePct > 0
                ? 'text-amber-600'
                : 'text-emerald-600';

              return (
                <div key={row.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.type}</span>
                    <span className={`text-xs font-medium ${changeColor}`}>
                      {row.changePct > 0 ? '+' : ''}{row.changePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-right text-muted-foreground">{selectedYear - 1}</span>
                      <div className="flex-1 rounded-full bg-muted h-5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-muted-foreground/40 flex items-center justify-end pr-2 text-xs font-medium text-foreground transition-all"
                          style={{ width: `${(row.previous / maxVal) * 100}%` }}
                        >
                          {row.previous > 0 && `$${row.previous.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-right text-muted-foreground">{selectedYear}</span>
                      <div className="flex-1 rounded-full bg-muted h-5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary flex items-center justify-end pr-2 text-xs font-medium text-primary-foreground transition-all"
                          style={{ width: `${(row.current / maxVal) * 100}%` }}
                        >
                          {row.current > 0 && `$${row.current.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
