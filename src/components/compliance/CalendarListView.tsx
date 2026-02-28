import { isPast, differenceInDays } from 'date-fns';
import { CalendarEventCard } from './CalendarEventCard';
import type { ComplianceEvent } from '@/hooks/useComplianceEvents';

interface Props {
  events: ComplianceEvent[];
  onEdit: (event: ComplianceEvent) => void;
  onComplete: (event: ComplianceEvent) => void;
}

interface Group {
  label: string;
  color: string;
  events: ComplianceEvent[];
}

export function CalendarListView({ events, onEdit, onComplete }: Props) {
  const now = new Date();

  const groups: Group[] = [
    { label: 'OVERDUE', color: 'text-rose-500', events: [] },
    { label: 'THIS WEEK', color: 'text-amber-500', events: [] },
    { label: 'THIS MONTH', color: 'text-amber-400', events: [] },
    { label: 'NEXT 90 DAYS', color: 'text-blue-500', events: [] },
    { label: 'FUTURE', color: 'text-muted-foreground', events: [] },
  ];

  for (const event of events) {
    if (event.status === 'completed' || event.status === 'waived') continue;
    const due = new Date(event.due_date);
    const diff = differenceInDays(due, now);

    if (isPast(due) && diff < 0) {
      groups[0].events.push(event);
    } else if (diff <= 7) {
      groups[1].events.push(event);
    } else if (diff <= 30) {
      groups[2].events.push(event);
    } else if (diff <= 90) {
      groups[3].events.push(event);
    } else {
      groups[4].events.push(event);
    }
  }

  const nonEmptyGroups = groups.filter(g => g.events.length > 0);

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        No compliance events found. Add your first event to get started.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {nonEmptyGroups.map(group => (
        <div key={group.label}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${group.color}`} style={{ fontFamily: 'JetBrains Mono' }}>
            {group.label} ({group.events.length})
          </h3>
          <div className="space-y-2">
            {group.events.map(event => (
              <CalendarEventCard key={event.id} event={event} onEdit={onEdit} onComplete={onComplete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
