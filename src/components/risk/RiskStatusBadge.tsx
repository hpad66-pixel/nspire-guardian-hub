import { getRiskScore, getRiskScoreLevel } from '@/hooks/useRisks';

export function RiskStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    identified: 'bg-muted text-muted-foreground',
    open: 'bg-amber-500/20 text-amber-500',
    mitigating: 'bg-blue-500/20 text-blue-500',
    monitoring: 'bg-cyan-500/20 text-cyan-500',
    closed: 'bg-amber-400/20 text-amber-400',
    accepted: 'bg-amber-400/20 text-amber-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[status] || colors.identified}`}>
      {status}
    </span>
  );
}

export function RiskScoreBadge({ probability, impact }: { probability: number | null; impact: number | null }) {
  const score = getRiskScore(probability, impact);
  const level = getRiskScoreLevel(score);
  const colors = {
    critical: 'bg-rose-500/20 text-rose-500',
    high: 'bg-orange-500/20 text-orange-500',
    medium: 'bg-amber-500/20 text-amber-500',
    low: 'bg-emerald-500/20 text-emerald-500',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${colors[level]}`}>
      {score}
    </span>
  );
}
