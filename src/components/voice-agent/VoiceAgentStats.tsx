import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  PhoneIncoming,
  Wrench,
} from 'lucide-react';
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const cards: Array<{
    metric: VoiceIntakeMetric;
    title: string;
    value: number;
    subtitle: string;
    Icon: typeof PhoneIncoming;
    tone: string;
    activeTone: string;
    iconTone: string;
    marker: string;
  }> = [
    {
      metric: 'today',
      title: "Today's calls",
      value: stats?.todayCalls ?? 0,
      subtitle: 'Call-created tickets',
      Icon: PhoneIncoming,
      tone: 'border-sky-200 bg-gradient-to-br from-white via-sky-50 to-white',
      activeTone: 'ring-sky-500/60',
      iconTone: 'bg-sky-100 text-sky-700',
      marker: 'bg-sky-500',
    },
    {
      metric: 'processed',
      title: 'Processed',
      value: stats?.todayProcessed ?? 0,
      subtitle: 'Assigned or completed',
      Icon: CheckCircle2,
      tone: 'border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-white',
      activeTone: 'ring-emerald-500/60',
      iconTone: 'bg-emerald-100 text-emerald-700',
      marker: 'bg-emerald-500',
    },
    {
      metric: 'backlog',
      title: 'Backlog',
      value: stats?.backlog ?? stats?.pending ?? 0,
      subtitle: 'Needs movement',
      Icon: ClipboardList,
      tone: 'border-amber-200 bg-gradient-to-br from-white via-amber-50 to-white',
      activeTone: 'ring-amber-500/60',
      iconTone: 'bg-amber-100 text-amber-800',
      marker: 'bg-amber-500',
    },
    {
      metric: 'work_orders',
      title: 'Work orders',
      value: stats?.withWorkOrder ?? 0,
      subtitle: 'Wired to WO board',
      Icon: Wrench,
      tone: 'border-indigo-200 bg-gradient-to-br from-white via-indigo-50 to-white',
      activeTone: 'ring-indigo-500/60',
      iconTone: 'bg-indigo-100 text-indigo-700',
      marker: 'bg-indigo-500',
    },
    {
      metric: 'emergency',
      title: 'Emergency',
      value: stats?.emergency ?? 0,
      subtitle: 'Open priority calls',
      Icon: AlertTriangle,
      tone: 'border-rose-200 bg-gradient-to-br from-white via-rose-50 to-white',
      activeTone: 'ring-rose-500/60',
      iconTone: 'bg-rose-100 text-rose-700',
      marker: 'bg-rose-500',
    },
  ];

  return (
    <div className="space-y-3" data-testid="voice-agent-stats">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Today&apos;s intake
        </p>
        {isFetching && (
          <span className="text-[11px] font-medium text-sky-700">Updating…</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {cards.map(({ metric, title, value, subtitle, Icon, tone, activeTone, iconTone, marker }) => {
          const active = activeMetric === metric;
          return (
            <button
              key={metric}
              type="button"
              onClick={() => onMetricSelect?.(metric)}
              className={cn(
                'group min-w-0 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2',
                tone,
                active && 'ring-2',
                active && activeTone,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconTone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', marker)} />
              </div>
              <p className="mt-4 truncate text-sm font-semibold text-slate-700">{title}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-tight text-[#10263f]">{value}</p>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0f766e]" />
              </div>
              <p className="mt-1 min-h-4 truncate text-xs font-medium text-slate-500">{subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
