import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { LWCourse, LWUserProgress, LWCourseCategory } from '@/services/learnworlds/learnworldsTypes';
import { CATEGORY_LABELS } from '@/services/learnworlds/learnworldsTypes';
import { Clock, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  course: LWCourse;
  progress?: LWUserProgress;
  locked?: boolean;
  onLaunch?: (course: LWCourse) => void;
  onEnroll?: (course: LWCourse) => void;
}

const GRADIENTS: Record<LWCourseCategory, string> = {
  compliance: 'from-blue-500 to-blue-700',
  safety: 'from-amber-500 to-orange-600',
  property_management: 'from-green-500 to-emerald-700',
  construction: 'from-orange-500 to-red-600',
  ai_productivity: 'from-purple-500 to-indigo-700',
  hr: 'from-pink-500 to-rose-600',
  leadership: 'from-indigo-500 to-blue-700',
  custom: 'from-slate-400 to-slate-600',
};

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function LWCourseCardStandalone({ course, progress, locked, onLaunch, onEnroll }: Props) {
  const status = progress?.status ?? 'not_started';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  const handleAction = () => {
    if (locked) return;
    if (isCompleted || isInProgress) onLaunch?.(course);
    else onEnroll?.(course);
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-card overflow-hidden transition-all duration-200',
        locked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      )}
      onClick={locked ? undefined : handleAction}
    >
      <div className={cn('relative h-28 bg-gradient-to-br', GRADIENTS[course.category])}>
        {isCompleted && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
            <Lock className="h-5 w-5 text-white" />
            <span className="text-xs text-white font-medium">Upgrade to unlock</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
            {CATEGORY_LABELS[course.category]}
          </span>
        </div>
      </div>

      {isInProgress && progress && (
        <div className="h-1 bg-muted">
          <div className="h-full bg-blue-500" style={{ width: `${progress.progressPercent}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-2 p-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{course.title}</h3>
          {isCompleted && (
            <Badge className="flex-shrink-0 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">✓ Done</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />{fmt(course.durationMinutes)}
          </span>
          <span className="text-xs text-muted-foreground capitalize">{course.difficulty}</span>
        </div>
        {isInProgress && progress && (
          <p className="text-xs text-blue-600 font-medium">{progress.progressPercent}% complete</p>
        )}
        {!locked && (
          <div className="mt-auto pt-1">
            <Button size="sm" variant={isInProgress ? 'default' : 'outline'} className="w-full text-xs h-7"
              onClick={(e) => { e.stopPropagation(); handleAction(); }}>
              {isCompleted ? 'Retake' : isInProgress ? 'Continue' : 'Start Course'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
