import { useMemo } from 'react';

interface NspireScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

export function NspireScoreGauge({ score, size = 180, label = 'REAC Score' }: NspireScoreGaugeProps) {
  const { color, strokeDash, circumference } = useMemo(() => {
    const radius = (size - 20) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, score)) / 100;
    const dash = circ * pct;
    let c = 'hsl(var(--success))';
    if (score < 60) c = 'hsl(var(--destructive))';
    else if (score < 80) c = 'hsl(var(--warning, 45 93% 47%))';
    return { color: c, strokeDash: dash, circumference: circ };
  }, [score, size]);

  const radius = (size - 20) / 2;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-4xl font-bold">{Math.round(score)}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
