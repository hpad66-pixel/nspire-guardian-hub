import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PhoneIncoming,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useMaintenanceRequestStats } from '@/hooks/useMaintenanceRequests';

export function VoiceAgentStats({
  propertyId,
  live,
}: {
  propertyId?: string;
  live?: boolean;
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          subtitle="Tickets created today"
          icon={PhoneIncoming}
        />
        <StatCard
          title="Processed"
          value={stats?.todayProcessed ?? 0}
          subtitle="Assigned / in progress / done"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Backlog"
          value={stats?.backlog ?? stats?.pending ?? 0}
          subtitle="New · reviewed · assigned"
          icon={ClipboardList}
          variant="moderate"
        />
        <StatCard
          title="Work orders"
          value={stats?.withWorkOrder ?? 0}
          subtitle="Tickets wired to a WO"
          icon={Wrench}
        />
        <StatCard
          title="Emergency"
          value={stats?.emergency ?? 0}
          subtitle="Open emergencies"
          icon={AlertTriangle}
          variant="severe"
        />
      </div>
    </div>
  );
}
