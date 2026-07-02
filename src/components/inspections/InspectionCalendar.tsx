import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, format, parseISO,
} from 'date-fns';
import type { DailyInspection } from '@/hooks/useDailyInspections';
import { cn } from '@/lib/utils';

// A day's inspection state → color. Completed+approved is the "good" green;
// completed-but-unreviewed is amber; a draft (in_progress) is sapphire; a
// rejected/needs-revision report is rose.
function stateFor(insp: DailyInspection): { color: string; label: string; Icon: typeof CheckCircle2 } {
  const rs = (insp as { review_status?: string }).review_status;
  if (insp.status !== 'completed') return { color: '#1D6FE8', label: 'Draft', Icon: Clock };
  if (rs === 'needs_revision' || rs === 'rejected') return { color: '#F43F5E', label: 'Needs revision', Icon: AlertTriangle };
  if (rs === 'approved') return { color: '#10B981', label: 'Approved', Icon: CheckCircle2 };
  return { color: '#F59E0B', label: 'Pending review', Icon: CheckCircle2 };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function InspectionCalendar({
  inspections,
  month,
  onMonthChange,
  onSelect,
  propertyName,
}: {
  inspections: DailyInspection[];
  month: Date;
  onMonthChange: (d: Date) => void;
  onSelect: (insp: DailyInspection) => void;
  propertyName?: (propertyId: string) => string;
}) {
  const byDay = useMemo(() => {
    const m: Record<string, DailyInspection[]> = {};
    for (const insp of inspections) (m[insp.inspection_date] ??= []).push(insp);
    return m;
  }, [inspections]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month));
    const gridEnd = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const today = new Date();

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      {/* Month header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(subMonths(month, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onMonthChange(startOfMonth(new Date()))}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayInsps = byDay[key] ?? [];
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              className={cn(
                'min-h-[72px] rounded-xl border p-1.5 transition-colors',
                inMonth ? 'bg-background border-border' : 'bg-muted/30 border-transparent',
                isToday && 'ring-2 ring-[var(--apas-sapphire)] ring-offset-1',
              )}
            >
              <div className={cn('text-[11px] font-semibold mb-1', inMonth ? 'text-foreground' : 'text-muted-foreground/50', isToday && 'text-[var(--apas-sapphire)]')}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayInsps.slice(0, 2).map(insp => {
                  const s = stateFor(insp);
                  return (
                    <button
                      key={insp.id}
                      type="button"
                      onClick={() => onSelect(insp)}
                      title={`${s.label}${propertyName ? ' · ' + propertyName(insp.property_id) : ''}`}
                      className="flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10px] font-medium hover:opacity-80"
                      style={{ background: `${s.color}1a`, color: s.color }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="truncate">{propertyName ? propertyName(insp.property_id) : s.label}</span>
                    </button>
                  );
                })}
                {dayInsps.length > 2 && (
                  <button type="button" onClick={() => onSelect(dayInsps[2])} className="w-full text-left text-[10px] font-medium text-muted-foreground hover:text-foreground">
                    +{dayInsps.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        {[['#10B981', 'Approved'], ['#F59E0B', 'Pending review'], ['#1D6FE8', 'Draft'], ['#F43F5E', 'Needs revision']].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}
