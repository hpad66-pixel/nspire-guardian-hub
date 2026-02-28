import { getRiskScore, getRiskScoreLevel } from '@/hooks/useRisks';
import type { Risk } from '@/hooks/useRisks';

const PROBABILITY_LABELS = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['', 'Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface Props {
  risks: Risk[];
  onCellClick?: (p: number, i: number) => void;
}

export function RiskMatrix({ risks, onCellClick }: Props) {
  const getCellColor = (score: number) => {
    if (score >= 20) return 'bg-rose-500/30 border-rose-500/50';
    if (score >= 13) return 'bg-orange-500/25 border-orange-500/40';
    if (score >= 7) return 'bg-amber-500/20 border-amber-500/35';
    return 'bg-emerald-500/15 border-emerald-500/30';
  };

  const getRiskCount = (p: number, i: number) =>
    risks.filter(r => r.probability === p && r.impact === i && !['closed', 'accepted'].includes(r.status)).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4" style={{ fontFamily: 'JetBrains Mono' }}>
        RISK MATRIX
      </h3>

      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground writing-mode-vertical" 
            style={{ fontFamily: 'JetBrains Mono', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Probability
          </span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map(p => (
              [1, 2, 3, 4, 5].map(i => {
                const score = p * i;
                const count = getRiskCount(p, i);
                return (
                  <button
                    key={`${p}-${i}`}
                    onClick={() => onCellClick?.(p, i)}
                    className={`aspect-square rounded-md border flex items-center justify-center text-xs font-bold transition-all hover:scale-105 ${getCellColor(score)} ${count > 0 ? 'ring-1 ring-white/20' : ''}`}
                  >
                    {count > 0 ? count : ''}
                  </button>
                );
              })
            ))}
          </div>

          {/* X axis labels */}
          <div className="grid grid-cols-5 gap-1 mt-1">
            {IMPACT_LABELS.slice(1).map(label => (
              <div key={label} className="text-center text-[8px] text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
                {label}
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
              Impact
            </span>
          </div>
        </div>

        {/* Y axis labels */}
        <div className="flex flex-col-reverse gap-1 justify-center">
          {PROBABILITY_LABELS.slice(1).map(label => (
            <div key={label} className="text-[8px] text-muted-foreground text-right h-[32px] flex items-center" style={{ fontFamily: 'JetBrains Mono' }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
