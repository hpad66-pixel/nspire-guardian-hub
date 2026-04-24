/**
 * E1 · SchedulePage — schedule management surface.
 *
 * Three tabs:
 *   - Tasks      → filterable task table with LookAheadFilter
 *   - Baselines  → capture a new baseline, pick a baseline to compare
 *   - Gantt      → existing GanttChart rendering of the current schedule
 */
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useSchedules, useScheduleTasks, useCaptureBaseline,
} from "@/hooks/useSchedule";
import { ScheduleImportDialog } from "@/components/schedule/ScheduleImportDialog";
import { LookAheadFilter, type LookAheadFilterValue } from "@/components/schedule/LookAheadFilter";
import { BaselineCompare } from "@/components/schedule/BaselineCompare";
import { GanttChart } from "@/components/schedule/GanttChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Upload, Flag } from "lucide-react";
import { toast } from "sonner";

export default function SchedulePage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { data: schedules = [] } = useSchedules(projectId ?? null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const active = scheduleId
    ? schedules.find((s) => s.id === scheduleId) ?? null
    : schedules.find((s) => s.is_current) ?? schedules[0] ?? null;
  const activeId = active?.id ?? null;

  const [filter, setFilter] = useState<LookAheadFilterValue>({
    windowDays: null, criticalOnly: false, milestonesOnly: false,
  });
  const { data: tasks = [] } = useScheduleTasks(activeId, filter.windowDays ?? undefined);
  const captureBaseline = useCaptureBaseline(activeId);

  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter.criticalOnly && !t.is_critical) return false;
      if (filter.milestonesOnly && !t.is_milestone) return false;
      return true;
    });
  }, [tasks, filter]);

  async function handleCaptureBaseline() {
    if (!activeId) return;
    const name = window.prompt("Baseline name?", `Baseline ${new Date().toLocaleDateString()}`);
    if (!name) return;
    try {
      await captureBaseline.mutateAsync({ name });
      toast.success("Baseline captured");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Schedule</h1>
          <p className="text-muted-foreground">
            Gantt, P6/MSP import, baselines.
          </p>
        </div>
        <div className="flex gap-2">
          {activeId && (
            <Button variant="outline" onClick={handleCaptureBaseline}
                    disabled={captureBaseline.isPending}>
              <Flag className="h-4 w-4 mr-2" />
              {captureBaseline.isPending ? "Capturing…" : "Capture baseline"}
            </Button>
          )}
          <Button onClick={() => setImportOpen(true)} disabled={!projectId}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Schedules · {schedules.length}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No schedules yet — import a P6 XER or MSP XML.
                </p>
              ) : schedules.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScheduleId(s.id)}
                  className={`w-full text-left p-2 rounded-md border transition ${
                    activeId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="truncate flex-1">{s.name}</span>
                    {s.is_current && <Badge>Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase mt-0.5">
                    {s.source}
                    {s.imported_at && ` · ${new Date(s.imported_at).toLocaleDateString()}`}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-9">
          {!active ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Pick a schedule or import one to begin.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks">Tasks · {filtered.length}</TabsTrigger>
                <TabsTrigger value="baselines">Baselines</TabsTrigger>
                <TabsTrigger value="gantt">Gantt</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-3 space-y-3">
                <LookAheadFilter value={filter} onChange={setFilter} />
                <Card>
                  <CardContent className="p-0">
                    {filtered.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No tasks match the current filter.
                      </div>
                    ) : (
                      <div className="max-h-[65vh] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">Code</th>
                              <th className="text-left px-3 py-2">Name</th>
                              <th className="text-left px-3 py-2">Start</th>
                              <th className="text-left px-3 py-2">Finish</th>
                              <th className="text-right px-3 py-2">Dur</th>
                              <th className="text-right px-3 py-2">%</th>
                              <th className="text-right px-3 py-2">State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((t) => (
                              <tr key={t.id} className="border-t">
                                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                  {t.task_code ?? "—"}
                                </td>
                                <td className="px-3 py-2 truncate max-w-[36ch]">{t.name}</td>
                                <td className="px-3 py-2 tabular-nums">{t.start_date ?? "—"}</td>
                                <td className="px-3 py-2 tabular-nums">{t.finish_date ?? "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {t.duration_days ?? "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {t.pct_complete}%
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="inline-flex gap-1">
                                    {t.is_milestone && <Badge variant="outline" className="text-[10px]">M</Badge>}
                                    {t.is_critical && <Badge variant="destructive" className="text-[10px]">C</Badge>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="baselines" className="mt-3">
                <BaselineCompare scheduleId={active.id} currentTasks={tasks} />
              </TabsContent>

              <TabsContent value="gantt" className="mt-3">
                <Card>
                  <CardContent className="p-2 overflow-x-auto">
                    <GanttChart tasks={tasks} readOnly />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </section>
      </div>

      {projectId && (
        <ScheduleImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          projectId={projectId}
          onImported={(id) => setScheduleId(id)}
        />
      )}
    </div>
  );
}
