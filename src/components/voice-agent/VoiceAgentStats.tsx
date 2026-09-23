import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PhoneIncoming,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useMaintenanceRequestStats } from '@/hooks/useMaintenanceRequests';
import { cn } from '@/lib/utils';

export type VoiceIntakeMetric = 'today' | 'processed' | 'backlog' | 'work_orders' | 'emergency';

export function VoiceAgentStats({
  propertyId,
  live,
  activeMetric,
  onMetricSelect,
}: {
  propertyId?: string;
  live?: boolean;
  activeMetric?: VoiceIntakeMetric;
  onMetricSelect?: (metric: VoiceIntakeMetric) => void;
}) {
  const { data: stats, isLoading, isFetching } = useMaintenanceRequestStats({
    property_id: propertyId,
    live,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="voice-agent-stats">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Today&apos;s intake
        </p>
        {isFetching && (
          <span className="text-[11px] font-medium text-sky-700">Updating…</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Calls today"
          value={stats?.todayCalls ?? 0}
          subtitle="Open today's call-created tickets"
          icon={PhoneIncoming}
          onClick={() => onMetricSelect?.('today')}
          className={cn(
            'border-sky-200/80 bg-gradient-to-br from-white via-sky-50/70 to-white shadow-sm',
            activeMetric === 'today' && 'ring-2 ring-sky-500/60',
          )}
        />
        <StatCard
          title="Processed"
          value={stats?.todayProcessed ?? 0}
          subtitle="Assigned / in progress / done"
          icon={CheckCircle2}
          variant="success"
          onClick={() => onMetricSelect?.('processed')}
          className={cn(
            'border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/70 to-white shadow-sm',
            activeMetric === 'processed' && 'ring-2 ring-emerald-500/60',
          )}
        />
        <StatCard
          title="Backlog"
          value={stats?.backlog ?? stats?.pending ?? 0}
          subtitle="New · reviewed · assigned"
          icon={ClipboardList}
          variant="moderate"
          onClick={() => onMetricSelect?.('backlog')}
          className={cn(
            'border-amber-200/80 bg-gradient-to-br from-white via-amber-50/70 to-white shadow-sm',
            activeMetric === 'backlog' && 'ring-2 ring-amber-500/60',
          )}
        />
        <StatCard
          title="Work orders"
          value={stats?.withWorkOrder ?? 0}
          subtitle="Tickets wired to a WO"
          icon={Wrench}
          onClick={() => onMetricSelect?.('work_orders')}
          className={cn(
            'border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/70 to-white shadow-sm',
            activeMetric === 'work_orders' && 'ring-2 ring-indigo-500/60',
          )}
        />
        <StatCard
          title="Emergency"
          value={stats?.emergency ?? 0}
          subtitle="Open emergencies"
          icon={AlertTriangle}
          variant="severe"
          onClick={() => onMetricSelect?.('emergency')}
          className={cn(
            'border-rose-200/80 bg-gradient-to-br from-white via-rose-50/70 to-white shadow-sm',
            activeMetric === 'emergency' && 'ring-2 ring-rose-500/60',
          )}
        />
      </div>
    </div>
  );
}
