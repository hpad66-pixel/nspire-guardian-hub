import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisks, useRiskStats } from '@/hooks/useRisks';
import { RiskMatrix } from '@/components/risk/RiskMatrix';
import { RiskRegisterTable } from '@/components/risk/RiskRegisterTable';
import { RiskDialog } from '@/components/risk/RiskDialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk } from '@/hooks/useRisks';

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>{label}</p>
        <p className="text-xl font-bold">{count}</p>
      </div>
    </div>
  );
}

export default function RiskRegisterPage() {
  const { data: risks = [], isLoading } = useRisks();
  const stats = useRiskStats();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  const handleEdit = (risk: Risk) => {
    setSelectedRisk(risk);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedRisk(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1" style={{ fontFamily: 'JetBrains Mono' }}>
            RISK MANAGEMENT
          </p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Instrument Serif' }}>Risk Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Identify. Own. Mitigate. Close.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />Export PDF
          </Button>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />Log Risk
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Critical" count={stats.critical} color="bg-rose-500" />
        <StatCard label="High" count={stats.high} color="bg-orange-500" />
        <StatCard label="Medium" count={stats.medium} color="bg-amber-500" />
        <StatCard label="Low" count={stats.low} color="bg-emerald-500" />
        <StatCard label="Closed" count={stats.closed} color="bg-amber-400" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <RiskRegisterTable risks={risks} onRiskClick={handleEdit} />
        <RiskMatrix risks={risks} />
      </div>

      <RiskDialog open={dialogOpen} onOpenChange={setDialogOpen} risk={selectedRisk} />
    </div>
  );
}
