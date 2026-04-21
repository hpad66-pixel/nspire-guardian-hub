import { useParams } from "react-router-dom";
import { useSchedules, useScheduleTasks } from "@/hooks/useSchedule";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SchedulePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: schedules = [] } = useSchedules(projectId ?? null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<14 | 28 | null>(null);
  const { data: tasks = [] } = useScheduleTasks(scheduleId, windowDays ?? undefined);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-1">Schedule</h1>
      <p className="text-muted-foreground mb-6">Gantt, P6/MSP import, baselines.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Schedules</h2>
          {schedules.length === 0 ? (
            <div className="text-muted-foreground">No schedules.</div>
          ) : schedules.map((s) => (
            <button
              key={s.id}
              onClick={() => setScheduleId(s.id)}
              className={`w-full text-left p-3 rounded-md border mb-1 ${scheduleId === s.id ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground uppercase">{s.source}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <div className="flex gap-1">
                <button onClick={() => setWindowDays(null)} className={`text-xs px-2 py-1 rounded ${!windowDays ? "bg-primary text-primary-foreground" : "border"}`}>All</button>
                <button onClick={() => setWindowDays(14)} className={`text-xs px-2 py-1 rounded ${windowDays === 14 ? "bg-primary text-primary-foreground" : "border"}`}>2wk</button>
                <button onClick={() => setWindowDays(28)} className={`text-xs px-2 py-1 rounded ${windowDays === 28 ? "bg-primary text-primary-foreground" : "border"}`}>4wk</button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-muted-foreground">No tasks.</div>
              ) : (
                <div className="divide-y text-sm">
                  {tasks.map((t) => (
                    <div key={t.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-muted-foreground mr-2">{t.task_code}</span>
                        {t.name}
                      </div>
                      <div className="flex gap-2 items-center">
                        {t.is_critical && <Badge variant="destructive">Critical</Badge>}
                        {t.is_milestone && <Badge>Milestone</Badge>}
                        <span className="text-xs text-muted-foreground">{t.pct_complete}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
