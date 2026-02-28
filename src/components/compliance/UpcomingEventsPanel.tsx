import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Clock } from 'lucide-react';
import { getUrgencyColor } from './CalendarEventCard';
import type { ComplianceEvent } from '@/hooks/useComplianceEvents';

interface Props {
  events: ComplianceEvent[];
  onEventClick: (event: ComplianceEvent) => void;
}

export function UpcomingEventsPanel({ events, onEventClick }: Props) {
  const now = new Date();
  const upcoming = events
    .filter(e => e.status !== 'completed' && e.status !== 'waived')
    .filter(e => {
      const diff = (new Date(e.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 14;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono' }}>
          NEXT 14 DAYS
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">{upcoming.length} events</span>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No events in the next 14 days. ✓
        </p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(event => {
            const due = new Date(event.due_date);
            const isOverdue = isPast(due);
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/30 hover:border-primary/20"
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${getUrgencyColor(event.due_date, event.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{event.title}</p>
                    <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(due, { addSuffix: true })} · {format(due, 'MMM d')}
                    </p>
                    {event.agency && (
                      <span className="inline-block mt-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        {event.agency}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
