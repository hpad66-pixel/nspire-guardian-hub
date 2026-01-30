import { InspectionArea } from '@/types/modules';
import { AREA_CONFIG } from '@/data/nspire-catalog';
import { cn } from '@/lib/utils';
import { TreePine, Building, DoorOpen } from 'lucide-react';

interface AreaBadgeProps {
  area: InspectionArea;
  showIcon?: boolean;
  className?: string;
}

const AREA_ICONS = {
  outside: TreePine,
  inside: Building,
  unit: DoorOpen,
};

export function AreaBadge({ area, showIcon = true, className }: AreaBadgeProps) {
  const config = AREA_CONFIG[area];
  const Icon = AREA_ICONS[area];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        `border-${config.color}-200 bg-${config.color}-50 text-${config.color}-700`,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
