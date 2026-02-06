import { Check, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingProgress } from '@/hooks/useTrainingProgress';

interface EBookProgressBadgeProps {
  status: TrainingProgress['status'] | null;
  className?: string;
}

export function EBookProgressBadge({ status, className }: EBookProgressBadgeProps) {
  if (!status || status === 'not_started') {
    return null;
  }

  const config = {
    in_progress: {
      icon: Clock,
      label: 'In Progress',
      className: 'bg-amber-500/90 text-white',
    },
    completed: {
      icon: Check,
      label: 'Completed',
      className: 'bg-green-500/90 text-white',
    },
  };

  const { icon: Icon, label, className: statusClass } = config[status];

  return (
    <div
      className={cn(
        'absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
        statusClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}
