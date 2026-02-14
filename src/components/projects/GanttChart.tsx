import { useMemo } from 'react';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Database } from '@/integrations/supabase/types';

type MilestoneRow = Database['public']['Tables']['project_milestones']['Row'];

const statusColors: Record<string, string> = {
  pending: 'bg-muted',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  overdue: 'bg-destructive',
};

export function GanttChart({ milestones, projectStart, projectEnd }: {
  milestones: MilestoneRow[];
  projectStart: string | null;
  projectEnd: string | null;
}) {
  const timeline = useMemo(() => {
    if (!milestones.length) return null;

    const dates = milestones.map(m => new Date(m.due_date));
    if (projectStart) dates.push(new Date(projectStart));
    if (projectEnd) dates.push(new Date(projectEnd));

    const minDate = startOfDay(new Date(Math.min(...dates.map(d => d.getTime()))));
    const maxDate = startOfDay(addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 7));
    const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);

    // Generate month labels
    const months: { label: string; left: number; width: number }[] = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const left = Math.max(0, differenceInDays(monthStart, minDate) / totalDays * 100);
      const right = Math.min(100, differenceInDays(monthEnd, minDate) / totalDays * 100);
      months.push({ label: format(current, 'MMM yyyy'), left, width: right - left });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return { minDate, maxDate, totalDays, months };
  }, [milestones, projectStart, projectEnd]);

  if (!timeline || !milestones.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Add milestones to view the Gantt chart
        </CardContent>
      </Card>
    );
  }

  const sorted = [...milestones].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const today = startOfDay(new Date());
  const todayPos = Math.min(100, Math.max(0, differenceInDays(today, timeline.minDate) / timeline.totalDays * 100));

  const getMilestoneStatus = (m: MilestoneRow) => {
    if (m.status === 'completed') return 'completed';
    if (m.status === 'in_progress') return 'in_progress';
    if (new Date(m.due_date) < today) return 'overdue';
    return 'pending';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gantt Chart</CardTitle>
        <CardDescription>Visual project timeline with milestone dependencies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          {/* Month headers */}
          <div className="relative h-8 mb-2 border-b">
            {timeline.months.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center px-2 text-xs text-muted-foreground border-l border-border"
                style={{ left: `${m.left}%`, width: `${m.width}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Today line */}
          <div
            className="absolute top-8 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${todayPos}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-primary font-medium whitespace-nowrap">
              Today
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-2 pt-2">
            <TooltipProvider>
              {sorted.map((m) => {
                const status = getMilestoneStatus(m);
                const dueDate = new Date(m.due_date);
                const startPos = differenceInDays(dueDate, timeline.minDate) / timeline.totalDays * 100;
                const barWidth = Math.max(2, (Number(m.progress_percent) || 0) / 100 * 10);
                const dependsOn = m.depends_on ? sorted.find(s => s.id === m.depends_on) : null;

                return (
                  <div key={m.id} className="relative h-10 flex items-center">
                    {/* Label */}
                    <div className="w-40 shrink-0 pr-3 text-sm font-medium truncate">
                      {m.name}
                    </div>
                    {/* Bar area */}
                    <div className="flex-1 relative h-full">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${statusColors[status]} min-w-[12px] cursor-pointer transition-all hover:opacity-80`}
                            style={{
                              left: `${Math.max(0, startPos - 2)}%`,
                              width: `${Math.max(3, barWidth)}%`,
                            }}
                          >
                            {/* Progress fill */}
                            <div
                              className="h-full rounded-full bg-white/20"
                              style={{ width: `${Number(m.progress_percent) || 0}%` }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{m.name}</p>
                            <p>Due: {format(dueDate, 'MMM d, yyyy')}</p>
                            <p>Status: {status}</p>
                            {m.progress_percent && <p>Progress: {m.progress_percent}%</p>}
                            {dependsOn && <p>Depends on: {dependsOn.name}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Diamond marker */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-2 ${status === 'completed' ? 'bg-green-500 border-green-600' : status === 'overdue' ? 'bg-destructive border-destructive' : 'bg-card border-primary'}`}
                        style={{ left: `${startPos}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
