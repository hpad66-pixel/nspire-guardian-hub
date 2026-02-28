import { format, isPast } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRiskScore } from '@/hooks/useRisks';
import type { Risk } from '@/hooks/useRisks';
import { RiskStatusBadge, RiskScoreBadge } from './RiskStatusBadge';

interface Props {
  risks: Risk[];
  onRiskClick: (risk: Risk) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  regulatory: 'text-teal-500', financial: 'text-amber-500', safety: 'text-rose-500',
  schedule: 'text-violet-500', environmental: 'text-emerald-500', legal: 'text-blue-500',
  operational: 'text-cyan-500', reputational: 'text-orange-500',
};

export function RiskRegisterTable({ risks, onRiskClick }: Props) {
  if (risks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        No risks logged. Start by identifying your first risk.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>#</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Risk</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Category</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Property</th>
            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>P</th>
            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>I</th>
            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Score</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Status</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Owner</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Review</th>
          </tr>
        </thead>
        <tbody>
          {risks.map(risk => {
            const reviewOverdue = risk.review_date && isPast(new Date(risk.review_date)) && !['closed', 'accepted'].includes(risk.status);
            return (
              <tr
                key={risk.id}
                onClick={() => onRiskClick(risk)}
                className="border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/20"
              >
                <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums" style={{ fontFamily: 'JetBrains Mono' }}>
                  {risk.risk_number}
                </td>
                <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{risk.title}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs font-medium capitalize ${CATEGORY_COLORS[risk.category] || ''}`}>
                    {risk.category}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{(risk.property as any)?.name || '—'}</td>
                <td className="px-3 py-2.5 text-center text-xs tabular-nums">{risk.probability}</td>
                <td className="px-3 py-2.5 text-center text-xs tabular-nums">{risk.impact}</td>
                <td className="px-3 py-2.5 text-center"><RiskScoreBadge probability={risk.probability} impact={risk.impact} /></td>
                <td className="px-3 py-2.5"><RiskStatusBadge status={risk.status} /></td>
                <td className="px-3 py-2.5">
                  {risk.owner_profile ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={(risk.owner_profile as any).avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {((risk.owner_profile as any).full_name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className={`px-3 py-2.5 text-xs ${reviewOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {risk.review_date ? format(new Date(risk.review_date), 'MMM d') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
