import { cn } from '@/lib/utils';
import type { IncidentStatus } from '@/hooks/useSafety';

interface IncidentStatusBadgeProps {
  status: IncidentStatus;
  isOshaRecordable?: boolean | null;
  classification?: string | null;
  className?: string;
}

export function IncidentStatusBadge({
  status,
  isOshaRecordable,
  classification,
  className,
}: IncidentStatusBadgeProps) {
  const getConfig = () => {
    if (status === 'closed') {
      return { label: 'Closed', classes: 'bg-green-100 text-green-700 border-green-200' };
    }
    if (isOshaRecordable === true) {
      return { label: 'OSHA Recordable', classes: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (isOshaRecordable === false || classification === 'first_aid_only') {
      return { label: 'First Aid Only', classes: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (classification === 'near_miss') {
      return { label: 'Near Miss', classes: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
    if (status === 'under_review') {
      return { label: 'Under Review', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Pending Review', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
  };

  const { label, classes } = getConfig();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
        classes,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
