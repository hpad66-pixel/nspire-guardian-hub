/**
 * E1 · BaselineCompare — compare the current schedule tasks against a saved
 * baseline and show per-task variance.
 *
 * Variance is reported three ways:
 *   - Start variance  (days, current - baseline)
 *   - Finish variance (days, current - baseline)
 *   - % complete drift (current - baseline)
 *
 * Negative start/finish deltas mean "ahead of baseline"; positive means
 * "behind." We render a compact table with a severity badge (on-track /
 * slipping / delayed) and a project-level summary at the top.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleTask } from "@/hooks/useSchedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Baseline {
  id: string;
  schedule_id: string;
  name: string | null;
  captured_at: string;
  tasks_snapshot: ScheduleTask[];
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

function severity(finishDelta: number | null): "ahead" | "on-track" | "slipping" | "delayed" {
  if (finishDelta == null) return "on-track";
  if (finishDelta <= -2) return "ahead";
  if (finishDelta <= 0) return "on-track";
  if (finishDelta <= 5) return "slipping";
  return "delayed";
}

export interface BaselineCompareProps {
  scheduleId: string;
  currentTasks: ScheduleTask[];
}

export function BaselineCompare({ scheduleId, currentTasks }: BaselineCompareProps) {
  const [baselineId, setBaselineId] = useState<string | "">("");
  const [search, setSearch] = useState("");

  const { data: baselines = [] } = useQuery<Baseline[]>({
    queryKey: ["schedule-baselines", scheduleId],
    enabled: Boolean(scheduleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_baselines" as any)
        .select("id, schedule_id, name, captured_at, tasks_snapshot")
        .eq("schedule_id", scheduleId)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Baseline[];
    },
  });

  const activeBaseline = baselines.find((b) => b.id === baselineId) ?? null;

  const comparisons = useMemo(() => {
    if (!activeBaseline) return [];
    const baselineById = new Map<string, ScheduleTask>();
    for (const t of activeBaseline.tasks_snapshot ?? []) baselineById.set(t.id, t);

    return currentTasks.map((cur) => {
      const base = baselineById.get(cur.id);
      const startDelta = base ? daysBetween(cur.start_date, base.start_date) : null;
      const finishDelta = base ? daysBetween(cur.finish_date, base.finish_date) : null;
      const pctDelta = base
        ? (cur.pct_complete ?? 0) - (base.pct_complete ?? 0)
        : null;
      return {
        task: cur,
        baseline: base ?? null,
        startDelta,
        finishDelta,
        pctDelta,
        severity: severity(finishDelta),
      };
    });
  }, [activeBaseline, currentTasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return comparisons;
    return comparisons.filter(
      (c) => (c.task.name ?? "").toLowerCase().includes(q) ||
             (c.task.task_code ?? "").toLowerCase().includes(q),
    );
  }, [comparisons, search]);

  const summary = useMemo(() => {
    const result = { ahead: 0, onTrack: 0, slipping: 0, delayed: 0, unmatched: 0 };
    for (const c of comparisons) {
      if (!c.baseline) { result.unmatched++; continue; }
      if (c.severity === "ahead") result.ahead++;
      else if (c.severity === "on-track") result.onTrack++;
      else if (c.severity === "slipping") result.slipping++;
      else result.delayed++;
    }
    return result;
  }, [comparisons]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span>Baseline compare</span>
          <Select value={baselineId} onValueChange={(v) => setBaselineId(v)}>
            <SelectTrigger className="h-8 w-64">
              <SelectValue placeholder={
                baselines.length === 0 ? "No baselines captured" : "Pick a baseline…"
              } />
            </SelectTrigger>
            <SelectContent>
              {baselines.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name ?? "Unnamed"}
                  <span className="text-xs text-muted-foreground ml-2">
                    · {new Date(b.captured_at).toLocaleDateString()}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!activeBaseline ? (
          <div className="text-sm text-muted-foreground p-6 text-center">
            {baselines.length === 0
              ? "Capture a baseline on this schedule to enable comparison."
              : "Pick a baseline above to see variance."}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="default">On track · {summary.onTrack}</Badge>
              <Badge variant="outline">Ahead · {summary.ahead}</Badge>
              <Badge className="bg-[var(--apas-amber)] text-white hover:bg-[var(--apas-amber)]">
                Slipping · {summary.slipping}
              </Badge>
              <Badge variant="destructive">Delayed · {summary.delayed}</Badge>
              {summary.unmatched > 0 && (
                <Badge variant="secondary">No match · {summary.unmatched}</Badge>
              )}
            </div>

            <Input
              placeholder="Filter tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Task</th>
                      <th className="text-right px-3 py-2">Start Δ</th>
                      <th className="text-right px-3 py-2">Finish Δ</th>
                      <th className="text-right px-3 py-2">% Δ</th>
                      <th className="text-right px-3 py-2">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ task, baseline, startDelta, finishDelta, pctDelta, severity: sev }) => (
                      <tr key={task.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {task.task_code && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {task.task_code}
                              </span>
                            )}
                            <span className="truncate max-w-[32ch]">{task.name}</span>
                            {task.is_milestone && <Badge variant="outline" className="text-[10px]">M</Badge>}
                            {task.is_critical && <Badge variant="destructive" className="text-[10px]">C</Badge>}
                          </div>
                          {!baseline && (
                            <div className="text-xs text-muted-foreground">Not in baseline</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {startDelta == null ? "—" : (startDelta > 0 ? `+${startDelta}` : String(startDelta))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {finishDelta == null ? "—" : (finishDelta > 0 ? `+${finishDelta}` : String(finishDelta))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {pctDelta == null ? "—" : (pctDelta > 0 ? `+${pctDelta}` : String(pctDelta))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge
                            variant={
                              sev === "delayed" ? "destructive"
                              : sev === "on-track" ? "default"
                              : "outline"
                            }
                            className={
                              sev === "slipping"
                                ? "bg-[var(--apas-amber)] text-white hover:bg-[var(--apas-amber)]"
                                : sev === "ahead"
                                  ? "bg-[var(--apas-emerald)] text-white hover:bg-[var(--apas-emerald)]"
                                  : ""
                            }
                          >
                            {sev}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
