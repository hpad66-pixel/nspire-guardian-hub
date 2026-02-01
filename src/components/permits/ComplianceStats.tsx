import { StatCard } from '@/components/ui/stat-card';
import { Shield, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';

interface ComplianceStatsProps {
  stats: {
    active: number;
    expiringSoon: number;
    dueThisMonth: number;
    nonCompliant: number;
    total: number;
  } | undefined;
  isLoading?: boolean;
}

export function ComplianceStats({ stats, isLoading }: ComplianceStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Active Permits"
        value={stats?.active || 0}
        subtitle={`${stats?.total || 0} total permits`}
        icon={Shield}
        variant="success"
      />
      <StatCard
        title="Expiring Soon"
        value={stats?.expiringSoon || 0}
        subtitle="Within 30 days"
        icon={Calendar}
        variant={stats?.expiringSoon ? 'moderate' : 'default'}
      />
      <StatCard
        title="Due This Month"
        value={stats?.dueThisMonth || 0}
        subtitle="Requirements due"
        icon={CheckCircle}
        variant="default"
      />
      <StatCard
        title="Non-Compliant"
        value={stats?.nonCompliant || 0}
        subtitle="Requires attention"
        icon={AlertTriangle}
        variant={stats?.nonCompliant ? 'severe' : 'default'}
      />
    </div>
  );
}
