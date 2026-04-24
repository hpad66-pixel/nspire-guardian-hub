/**
 * F2 · Owner portal — read-only Gantt view of the project schedule.
 * Reuses src/components/schedule/GanttChart with readOnly=true.
 */
import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSchedules, useScheduleTasks, type Schedule,
} from "@/hooks/useSchedule";
import { GanttChart } from "@/components/schedule/GanttChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function OwnerSchedulePage() {
  // Owner sees any project they have prime contracts on. Pick first by default.
  const { data: contracts = [] } = useQuery({
    queryKey: ["owner-prime-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contracts" as any).select("id, project_id, title, contract_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [projectId, setProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId ?? (contracts[0] as any)?.project_id ?? null;

  const { data: schedules = [] } = useSchedules(effectiveProjectId);
  const [windowDays, setWindowDays] = useState<14 | 28 | null>(null);
  const schedule = schedules[0] as Schedule | undefined;
  const { data: tasks = [] } = useScheduleTasks(schedule?.id ?? null, windowDays ?? undefined);

  const { data: preds = [] } = useQuery({
    queryKey: ["schedule-preds", schedule?.id],
    enabled: Boolean(schedule?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_predecessors" as any).select("*");
      if (error) throw error;
      return (data ?? []) as Array<{ task_id: string; predecessor_task_id: string; lag_days: number }>;
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <Link to="/portal/owner" className="text-sm text-muted-foreground hover:underline">
          ← Owner dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Project schedule</h1>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Gantt (read-only)</CardTitle>
          <div className="flex items-center gap-2">
            {contracts.length > 1 && (
              <Select value={effectiveProjectId ?? ""} onValueChange={setProjectId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((c: any) => (
                    <SelectItem key={c.id} value={c.project_id}>
                      {c.contract_no} · {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1">
              <button onClick={() => setWindowDays(null)}
                      className={`text-xs px-2 py-1 rounded ${!windowDays ? "bg-primary text-primary-foreground" : "border"}`}>
                All
              </button>
              <button onClick={() => setWindowDays(14)}
                      className={`text-xs px-2 py-1 rounded ${windowDays === 14 ? "bg-primary text-primary-foreground" : "border"}`}>
                2wk
              </button>
              <button onClick={() => setWindowDays(28)}
                      className={`text-xs px-2 py-1 rounded ${windowDays === 28 ? "bg-primary text-primary-foreground" : "border"}`}>
                4wk
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center">
              No schedule imported yet for this project.
            </div>
          ) : (
            <>
              <div className="mb-2 flex gap-2">
                <Badge variant="outline">{tasks.length} tasks</Badge>
                <Badge variant="destructive">
                  {tasks.filter((t) => t.is_critical).length} critical
                </Badge>
                <Badge>
                  {tasks.filter((t) => t.is_milestone).length} milestones
                </Badge>
              </div>
              <GanttChart tasks={tasks} predecessors={preds} readOnly />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
