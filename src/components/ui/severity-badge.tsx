import { SeverityLevel } from '@/types/modules';
import { SEVERITY_CONFIG } from '@/data/nspire-catalog';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  lifeThreatening?: boolean;
  isUnscored?: boolean;
  showDeadline?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, lifeThreatening = false, isUnscored = false, showDeadline = false, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  if (lifeThreatening && severity === 'severe') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold',
          'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] ring-2 ring-[hsl(var(--destructive))]/30',
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Life-Threatening
        {showDeadline && (
          <span className="opacity-80">(24 hours)</span>
        )}
      </span>
    );
  }

  if (isUnscored) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
          'bg-[hsl(var(--module-inspections))]/15 text-[hsl(var(--module-inspections))] border border-[hsl(var(--module-inspections))]/30',
          className
        )}
      >
        H&S (Unscored)
        {showDeadline && (
          <span className="opacity-80">(24 hours)</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
      {showDeadline && (
        <span className="opacity-80">({config.deadline})</span>
      )}
    </span>
  );
}
