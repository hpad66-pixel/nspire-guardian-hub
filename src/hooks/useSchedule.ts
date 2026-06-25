/**
 * E1 · Schedule — Gantt + P6/MSP import.
 */
import { toDateOnly } from "@/lib/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Schedule {
  id: string; tenant_id: string; project_id: string;
  name: string; source: "native"|"p6"|"msp";
  imported_at: string | null; is_current: boolean; created_at: string;
}

export interface ScheduleTask {
  id: string; schedule_id: string; task_code: string | null; name: string;
  start_date: string | null; finish_date: string | null; duration_days: number | null;
  pct_complete: number; is_milestone: boolean; is_critical: boolean;
  parent_task_id: string | null; wbs_path: string | null;
}

export function useSchedules(projectId: string | null) {
  return useQuery<Schedule[]>({
    queryKey: ["schedules", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules" as any).select("*")
        .eq("project_id", projectId!).order("imported_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Schedule[];
    },
  });
}

export function useScheduleTasks(scheduleId: string | null, windowDays?: number) {
  return useQuery<ScheduleTask[]>({
    queryKey: ["schedule-tasks", scheduleId, windowDays],
    enabled: Boolean(scheduleId),
    queryFn: async () => {
      let q = supabase.from("schedule_tasks" as any).select("*").eq("schedule_id", scheduleId!);
      if (windowDays) {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() + windowDays);
        q = q
          .gte("finish_date", toDateOnly(today))
          .lte("start_date", toDateOnly(end));
      }
      const { data, error } = await q.order("start_date");
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleTask[];
    },
  });
}

/**
 * Compute critical path on the client using the longest-path algorithm.
 * Returns a Set of task IDs that are on the critical path.
 * NOTE: intended for < 2000 tasks; for larger schedules, move to a Postgres
 * function and call via RPC.
 */
export function computeCriticalPath(
  tasks: ScheduleTask[],
  predecessors: Array<{ task_id: string; predecessor_task_id: string; lag_days: number }>,
): Set<string> {
  const byId = new Map<string, ScheduleTask>(tasks.map((t) => [t.id, t]));
  const predsByTask = new Map<string, { id: string; lag: number }[]>();
  for (const p of predecessors) {
    const arr = predsByTask.get(p.task_id) ?? [];
    arr.push({ id: p.predecessor_task_id, lag: p.lag_days });
    predsByTask.set(p.task_id, arr);
  }

  const earliestFinish = new Map<string, number>();
  function efOf(id: string): number {
    if (earliestFinish.has(id)) return earliestFinish.get(id)!;
    const t = byId.get(id);
    if (!t) return 0;
    const dur = t.duration_days ?? 0;
    const preds = predsByTask.get(id) ?? [];
    const ef = preds.length === 0
      ? dur
      : dur + Math.max(...preds.map((p) => efOf(p.id) + p.lag));
    earliestFinish.set(id, ef);
    return ef;
  }
  for (const t of tasks) efOf(t.id);

  const projectFinish = Math.max(0, ...[...earliestFinish.values()]);
  const critical = new Set<string>();
  for (const [id, ef] of earliestFinish.entries()) {
    // A task is critical if its earliest finish == project finish along its chain
    if (ef === projectFinish) critical.add(id);
  }
  return critical;
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; name: string; source?: Schedule["source"] }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("schedules" as any).insert({
        tenant_id, project_id: input.projectId,
        name: input.name,
        source: input.source ?? "native",
      } as any).select().single();
      if (error) throw error;
      return data as unknown as Schedule;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["schedules", v.projectId] }),
  });
}

export function useCaptureBaseline(scheduleId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      if (!scheduleId) throw new Error("No schedule");
      const { data: tasks } = await supabase
        .from("schedule_tasks" as any).select("*").eq("schedule_id", scheduleId);
      const { data, error } = await supabase.from("schedule_baselines" as any).insert({
        schedule_id: scheduleId,
        name: input.name,
        tasks_snapshot: tasks ?? [],
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule-baselines", scheduleId] }),
  });
}
