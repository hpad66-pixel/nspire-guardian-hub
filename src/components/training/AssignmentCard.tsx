import { format, parseISO, isAfter, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, User, RefreshCw, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignmentRow {
  id: string;
  lw_course_id: string;
  due_date: string | null;
  recurrence: string | null;
  is_mandatory: boolean;
  notes: string | null;
  assignee?: { full_name: string | null; avatar_url: string | null } | null;
  assigner?: { full_name: string | null } | null;
}

interface AssignmentCardProps {
  assignment: AssignmentRow;
  courseTitle?: string;
  progressPercent?: number;
  isCompleted?: boolean;
  onLaunch?: () => void;
  onRemove?: () => void;
  showAssignee?: boolean; // admin view
}

function getDueStatus(dueDate: string | null): 'overdue' | 'due_soon' | 'upcoming' | 'no_date' {
  if (!dueDate) return 'no_date';
  const due = parseISO(dueDate);
  const now = new Date();
  if (isAfter(now, due)) return 'overdue';
  if (isAfter(addDays(now, 14), due)) return 'due_soon';
  return 'upcoming';
}

const DUE_CONFIG = {
  overdue: { label: 'Overdue', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  due_soon: { label: 'Due Soon', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  upcoming: { label: '', className: '' },
  no_date: { label: '', className: '' },
};

export function AssignmentCard({
  assignment,
  courseTitle,
  progressPercent,
  isCompleted,
  onLaunch,
  onRemove,
  showAssignee,
}: AssignmentCardProps) {
  const dueStatus = getDueStatus(assignment.due_date);
  const dueCfg = DUE_CONFIG[dueStatus];

  const buttonLabel = isCompleted
    ? 'Retake'
    : typeof progressPercent === 'number' && progressPercent > 0
      ? 'Continue'
      : 'Start Course';

  const ButtonIcon = isCompleted ? RotateCcw : progressPercent ? Play : Play;

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-3 transition-all',
      dueStatus === 'overdue' && 'border-red-500/30',
      dueStatus === 'due_soon' && 'border-amber-500/30',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {courseTitle ?? assignment.lw_course_id}
            </p>
            {assignment.is_mandatory && (
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                Required
              </Badge>
            )}
            {dueCfg.label && (
              <Badge variant="outline" className={cn('text-[10px]', dueCfg.className)}>
                {dueCfg.label}
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                ✓ Completed
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            {assignment.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {format(parseISO(assignment.due_date), 'MMM d, yyyy')}
              </span>
            )}
            {showAssignee && assignment.assignee?.full_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {assignment.assignee.full_name}
              </span>
            )}
            {assignment.recurrence && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {assignment.recurrence === 'annually'
                  ? 'Required annually'
                  : assignment.recurrence === 'monthly'
                    ? 'Required monthly'
                    : `Every ${assignment.recurrence}`}
              </span>
            )}
          </div>

          {assignment.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground italic">{assignment.notes}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {typeof progressPercent === 'number' && progressPercent > 0 && !isCompleted && (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-xs text-blue-600">{progressPercent}% complete</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        {onRemove && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onRemove}>
            Remove
          </Button>
        )}
        {onLaunch && (
          <Button size="sm" className="h-7 text-xs" onClick={onLaunch}>
            <ButtonIcon className="mr-1.5 h-3 w-3" />
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
