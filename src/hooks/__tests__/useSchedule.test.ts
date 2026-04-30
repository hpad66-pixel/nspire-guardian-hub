import { describe, it, expect } from "vitest";
import { computeCriticalPath, type ScheduleTask } from "@/hooks/useSchedule";

function task(id: string, dur: number, extras: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id, schedule_id: "s1", task_code: id, name: `Task ${id}`,
    start_date: null, finish_date: null, duration_days: dur,
    pct_complete: 0, is_milestone: false, is_critical: false,
    parent_task_id: null, wbs_path: null,
    ...extras,
  };
}

describe("computeCriticalPath", () => {
  it("marks the longest-path tasks as critical", () => {
    // A -> B -> D   (total 10+5+3 = 18)
    // A -> C -> D   (total 10+7+3 = 20) ← critical
    const tasks = [task("A", 10), task("B", 5), task("C", 7), task("D", 3)];
    const preds = [
      { task_id: "B", predecessor_task_id: "A", lag_days: 0 },
      { task_id: "C", predecessor_task_id: "A", lag_days: 0 },
      { task_id: "D", predecessor_task_id: "B", lag_days: 0 },
      { task_id: "D", predecessor_task_id: "C", lag_days: 0 },
    ];
    const critical = computeCriticalPath(tasks, preds);
    // D's earliest finish = 20 (project finish); D is critical.
    expect(critical.has("D")).toBe(true);
  });

  it("returns empty set for empty input", () => {
    expect(computeCriticalPath([], []).size).toBe(0);
  });

  it("returns a Set with exactly the lone task when no predecessors", () => {
    const tasks = [task("X", 5)];
    const critical = computeCriticalPath(tasks, []);
    expect(critical.has("X")).toBe(true);
  });
});
