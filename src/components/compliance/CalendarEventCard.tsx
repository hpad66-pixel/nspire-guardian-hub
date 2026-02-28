import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Shield, GraduationCap, ClipboardCheck, FileText, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { ComplianceEvent } from '@/hooks/useComplianceEvents';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  permit_renewal: <Shield className="h-4 w-4" />,
  license_expiry: <Shield className="h-4 w-4" />,
  inspection_due: <ClipboardCheck className="h-4 w-4" />,
  training_due: <GraduationCap className="h-4 w-4" />,
  certification_expiry: <GraduationCap className="h-4 w-4" />,
  regulatory_deadline: <AlertTriangle className="h-4 w-4" />,
  reporting_deadline: <FileText className="h-4 w-4" />,
  insurance_renewal: <Shield className="h-4 w-4" />,
  other: <Calendar className="h-4 w-4" />,
};

export function getUrgencyColor(dueDate: string, status: string): string {
  if (status === 'completed' || status === 'waived') return 'bg-emerald-500';
  const diff = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'bg-rose-500';
  if (diff <= 7) return 'bg-rose-500';
  if (diff <= 30) return 'bg-amber-500';
  if (diff <= 90) return 'bg-blue-500';
  return 'bg-muted-foreground/30';
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-amber-400/20 text-amber-400',
    in_progress: 'bg-amber-500/20 text-amber-500',
    overdue: 'bg-rose-500/20 text-rose-500',
    acknowledged: 'bg-blue-500/20 text-blue-500',
    waived: 'bg-muted text-muted-foreground',
    upcoming: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[status] || colors.upcoming}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

interface Props {
  event: ComplianceEvent;
  onEdit?: (event: ComplianceEvent) => void;
  onComplete?: (event: ComplianceEvent) => void;
}

export function CalendarEventCard({ event, onEdit, onComplete }: Props) {
  const due = new Date(event.due_date);
  const isOverdue = isPast(due) && event.status !== 'completed' && event.status !== 'waived';
  const urgencyColor = getUrgencyColor(event.due_date, event.status);

  return (
    <div className="group relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20">
      {/* Urgency bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${urgencyColor}`} />

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5 ml-2 text-muted-foreground">
        {CATEGORY_ICONS[event.category] || CATEGORY_ICONS.other}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold truncate">{event.title}</h4>
          {event.agency && (
            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {event.agency}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {event.property && <span>{(event.property as any).name}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {formatDistanceToNow(due, { addSuffix: true })}
            </span>
            <span className="text-muted-foreground/60">· {format(due, 'MMM d, yyyy')}</span>
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {event.assigned_profile && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={(event.assigned_profile as any).avatar_url ?? undefined} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {((event.assigned_profile as any).full_name || '?').charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <StatusBadge status={isOverdue ? 'overdue' : event.status} />
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {event.status !== 'completed' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onComplete?.(event)}>
              Complete
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit?.(event)}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
