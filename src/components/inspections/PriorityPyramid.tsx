import { PRIORITY_PYRAMID_TIERS } from '@/types/modules';
import type { DefectForScoring } from '@/lib/nspire-scoring';
import { Badge } from '@/components/ui/badge';

interface PriorityPyramidProps {
  defects: DefectForScoring[];
}

export function PriorityPyramid({ defects }: PriorityPyramidProps) {
  const tierCounts = PRIORITY_PYRAMID_TIERS.map((tier) => {
    const count = defects.filter((d) => {
      const areaMatch = d.area === tier.area;
      const sevMatch = d.severity === tier.severity;
      const ltMatch = tier.lt ? d.lifeThreatening : !d.lifeThreatening;
      return areaMatch && sevMatch && ltMatch;
    }).length;
    return { ...tier, count };
  });

  const maxWidth = 100;
  const minWidth = 30;
  const step = (maxWidth - minWidth) / 11;

  const getColor = (rank: number) => {
    if (rank <= 3) return 'bg-destructive text-destructive-foreground';
    if (rank <= 6) return 'bg-orange-500 text-white';
    if (rank <= 9) return 'bg-amber-400 text-amber-950';
    return 'bg-blue-400 text-white';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {tierCounts.map((tier) => {
        const widthPct = minWidth + step * (tier.rank - 1);
        return (
          <div
            key={tier.rank}
            className={`flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium ${getColor(tier.rank)} transition-all`}
            style={{ width: `${widthPct}%`, minHeight: '28px' }}
          >
            <span className="truncate">{tier.label}</span>
            {tier.count > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] flex items-center justify-center text-[10px]">
                {tier.count}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
