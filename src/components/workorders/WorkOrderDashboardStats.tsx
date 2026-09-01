import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hourglass,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import type { WorkOrderDashboardKpis } from '@/lib/workorders/workOrderDashboard';
import { cn } from '@/lib/utils';

const AGING_COLORS: Record<string, string> = {
  '0_1': 'bg-[var(--apas-sapphire)]',
  '2_3': 'bg-[var(--apas-emerald)]',
  '4_7': 'bg-[var(--apas-amber)]',
  '8_plus': 'bg-[var(--apas-rose)]',
};

export function WorkOrderDashboardStats({
  kpis,
  isLoading,
  onFilterPreset,
}: {
  kpis: WorkOrderDashboardKpis;
  isLoading?: boolean;
  /** Click a KPI / aging bucket to focus the list. */
  onFilterPreset?: (
    preset:
      | 'today'
      | 'backlog'
      | 'processed'
      | 'in_progress'
      | 'overdue'
      | 'emergency'
      | WorkOrderDashboardKpis['aging'][number]['key'],
  ) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const agingTotal = kpis.aging.reduce((n, b) => n + b.count, 0) || 1;

  return (
    <div className="space-y-4" data-testid="work-order-dashboard-stats">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Maintenance command center · today
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--apas-sapphire)]">
          <Sparkles className="h-3 w-3" />
          Live for crew dispatch
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('today')}>
          <StatCard
            title="Created today"
            value={kpis.createdToday}
            subtitle="New work orders"
            icon={ClipboardList}
          />
        </button>
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('processed')}>
          <StatCard
            title="Processed"
            value={kpis.processedToday}
            subtitle="Touched / completed today"
            icon={CheckCircle2}
            variant="success"
          />
        </button>
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('backlog')}>
          <StatCard
            title="Backlog"
            value={kpis.backlog}
            subtitle="Awaiting staff action"
            icon={Hourglass}
            variant="moderate"
          />
        </button>
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('in_progress')}>
          <StatCard
            title="In progress"
            value={kpis.inProgress}
            subtitle="Crew on it"
            icon={Wrench}
          />
        </button>
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('emergency')}>
          <StatCard
            title="Emergency"
            value={kpis.emergencyOpen}
            subtitle="Open emergencies"
            icon={AlertTriangle}
            variant="severe"
          />
        </button>
        <button type="button" className="text-left" onClick={() => onFilterPreset?.('overdue')}>
          <StatCard
            title="Overdue"
            value={kpis.overdue}
            subtitle="Past due date"
            icon={Clock3}
            variant="severe"
          />
        </button>
      </div>

      <Card className="border-border/70 bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Open work-order aging</CardTitle>
          <p className="text-xs text-muted-foreground">
            How long open tickets have been waiting — click a bucket to filter the list.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            {kpis.aging.map((bucket) => (
              <div
                key={bucket.key}
                className={cn(AGING_COLORS[bucket.key], 'transition-all')}
                style={{ width: `${(bucket.count / agingTotal) * 100}%` }}
                title={`${bucket.label}: ${bucket.count}`}
              />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {kpis.aging.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                onClick={() => onFilterPreset?.(bucket.key)}
                className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-left transition hover:border-[var(--apas-sapphire)]/40 hover:shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', AGING_COLORS[bucket.key])} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {bucket.label}
                  </span>
                </div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{bucket.count}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
