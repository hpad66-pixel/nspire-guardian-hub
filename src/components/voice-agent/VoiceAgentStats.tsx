import { Phone, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useMaintenanceRequestStats } from '@/hooks/useMaintenanceRequests';

export function VoiceAgentStats() {
  const { data: stats, isLoading } = useMaintenanceRequestStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Total Calls"
        value={stats?.totalThisMonth || 0}
        subtitle="This Month"
        icon={Phone}
      />
      <StatCard
        title="Emergency"
        value={stats?.emergency || 0}
        subtitle="Need Action"
        icon={AlertTriangle}
        variant="severe"
      />
      <StatCard
        title="Pending"
        value={stats?.pending || 0}
        subtitle="Awaiting"
        icon={Clock}
        variant="moderate"
      />
      <StatCard
        title="Resolved"
        value={stats?.completedThisWeek || 0}
        subtitle="This Week"
        icon={CheckCircle2}
        variant="success"
      />
    </div>
  );
}
