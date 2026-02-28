import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUrgencyColor } from './CalendarEventCard';
import type { ComplianceEvent } from '@/hooks/useComplianceEvents';

interface Props {
  events: ComplianceEvent[];
  onEventClick: (event: ComplianceEvent) => void;
}

export function CalendarMonthView({ events, onEventClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDay = (d: Date) =>
    events.filter(e => isSameDay(new Date(e.due_date), d));

  return (
    <div className="flex flex-col h-full">
      {/* Header nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Instrument Serif' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date())}>
          Today
        </Button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map(wd => (
          <div key={wd} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1" style={{ fontFamily: 'JetBrains Mono' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px flex-1 bg-border rounded-lg overflow-hidden">
        {days.map((d, i) => {
          const dayEvents = getEventsForDay(d);
          const isToday = isSameDay(d, new Date());
          const isCurrentMonth = isSameMonth(d, currentMonth);

          return (
            <div
              key={i}
              className={`min-h-[80px] bg-card p-1.5 ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday ? 'ring-1 ring-inset ring-primary/30' : ''}`}
            >
              <div className={`text-[11px] font-medium mb-1 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {format(d, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate text-white transition-opacity hover:opacity-80 ${getUrgencyColor(ev.due_date, ev.status)}`}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
