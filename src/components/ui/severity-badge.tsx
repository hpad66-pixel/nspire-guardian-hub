import { SeverityLevel } from '@/types/modules';
import { SEVERITY_CONFIG } from '@/data/nspire-catalog';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  showDeadline?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, showDeadline = false, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

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
