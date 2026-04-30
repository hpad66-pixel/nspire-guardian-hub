/**
 * T4.12 · Gantt chart with drag-to-reschedule.
 *
 * Pure-SVG implementation — no gantt-task-react dependency. Handles:
 *   - horizontal bars sized by (finish_date - start_date)
 *   - drag body to shift dates, drag right edge to adjust duration
 *   - critical-path + milestone coloring
 *   - lookahead filter via start/end bounds
 *
 * Caller provides onUpdate(taskId, {start_date, finish_date}) which performs
 * the Supabase mutation. For dependency arrows (predecessors), we draw thin
 * L-shaped lines between connected tasks.
 */
import { useMemo, useRef, useState } from "react";
import type { ScheduleTask } from "@/hooks/useSchedule";

const ROW_H = 28;
const HEADER_H = 36;
const DAY_W_DEFAULT = 18;

export interface GanttChartProps {
  tasks: ScheduleTask[];
  predecessors?: Array<{ task_id: string; predecessor_task_id: string }>;
  onUpdate?: (taskId: string, patch: { start_date?: string; finish_date?: string }) => void;
  readOnly?: boolean;
  startOverride?: Date;
  endOverride?: Date;
  dayWidth?: number;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function GanttChart({
  tasks, predecessors = [], onUpdate, readOnly = false,
  startOverride, endOverride, dayWidth = DAY_W_DEFAULT,
}: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<null | {
    taskId: string; mode: "move" | "resize";
    startX: number; origStart: Date; origFinish: Date;
  }>(null);

  const { minDate, maxDate, weeks } = useMemo(() => {
    const dates = tasks.flatMap((t) => [
      t.start_date ? new Date(t.start_date) : null,
      t.finish_date ? new Date(t.finish_date) : null,
    ]).filter((x): x is Date => x != null);

    let min = startOverride ?? (dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date());
    let max = endOverride ?? (dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : addDays(min, 30));
    // Pad
    min = addDays(min, -3);
    max = addDays(max, 7);
    const ws: Array<{ start: Date; x: number }> = [];
    let cur = new Date(min);
    while (cur <= max) {
      ws.push({ start: new Date(cur), x: daysBetween(min, cur) * dayWidth });
      cur = addDays(cur, 7);
    }
    return { minDate: min, maxDate: max, weeks: ws };
  }, [tasks, startOverride, endOverride, dayWidth]);

  const totalDays = daysBetween(minDate, maxDate);
  const svgWidth = totalDays * dayWidth + 220;
  const svgHeight = HEADER_H + tasks.length * ROW_H + 20;

  function handlePointerDown(
    e: React.PointerEvent<SVGGElement>,
    task: ScheduleTask,
    mode: "move" | "resize",
  ) {
    if (readOnly || !task.start_date || !task.finish_date) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      taskId: task.id,
      mode,
      startX: e.clientX,
      origStart: new Date(task.start_date),
      origFinish: new Date(task.finish_date),
    });
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!drag) return;
    const dxPx = e.clientX - drag.startX;
    const dxDays = Math.round(dxPx / dayWidth);
    if (dxDays === 0) return;
    const taskEl = svgRef.current?.querySelector<SVGRectElement>(
      `[data-task-id="${drag.taskId}"] rect.bar`,
    );
    if (!taskEl) return;

    const ns = drag.mode === "move" ? addDays(drag.origStart, dxDays) : drag.origStart;
    const nf = addDays(drag.origFinish, dxDays);

    const xStart = daysBetween(minDate, ns) * dayWidth + 220;
    const xFinish = daysBetween(minDate, nf) * dayWidth + 220;
    taskEl.setAttribute("x", String(xStart));
    taskEl.setAttribute("width", String(Math.max(4, xFinish - xStart)));
  }

  function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    if (!drag) return;
    const dxPx = e.clientX - drag.startX;
    const dxDays = Math.round(dxPx / dayWidth);
    if (dxDays !== 0 && onUpdate) {
      const newStart = drag.mode === "move" ? addDays(drag.origStart, dxDays) : drag.origStart;
      const newFinish = addDays(drag.origFinish, dxDays);
      onUpdate(drag.taskId, { start_date: toISO(newStart), finish_date: toISO(newFinish) });
    }
    setDrag(null);
  }

  // Dependency arrows
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const taskRowIdx = new Map(tasks.map((t, i) => [t.id, i]));

  return (
    <div className="overflow-auto border rounded-md">
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Header week ticks */}
        <g>
          <rect x={0} y={0} width={svgWidth} height={HEADER_H} fill="#f8f8f6" />
          {weeks.map((w) => (
            <g key={w.x}>
              <line
                x1={w.x + 220} y1={0} x2={w.x + 220} y2={svgHeight}
                stroke="#e8e7e3" strokeWidth={0.5}
              />
              <text x={w.x + 224} y={22} fontSize={10} fill="#878581">
                {w.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
            </g>
          ))}
          <line x1={0} y1={HEADER_H} x2={svgWidth} y2={HEADER_H} stroke="#d9d8d4" />
          <line x1={220} y1={0} x2={220} y2={svgHeight} stroke="#d9d8d4" />
        </g>

        {/* Task rows */}
        {tasks.map((t, i) => {
          const y = HEADER_H + i * ROW_H;
          const start = t.start_date ? new Date(t.start_date) : null;
          const finish = t.finish_date ? new Date(t.finish_date) : null;
          const barX = start ? daysBetween(minDate, start) * dayWidth + 220 : 220;
          const barW = start && finish
            ? Math.max(4, daysBetween(start, finish) * dayWidth)
            : 0;
          const fill = t.is_critical ? "#F43F5E" : t.is_milestone ? "#8B5CF6" : "#1D6FE8";

          return (
            <g key={t.id} data-task-id={t.id}>
              {/* row separator */}
              <line x1={0} y1={y + ROW_H} x2={svgWidth} y2={y + ROW_H}
                stroke="#f0efec" strokeWidth={0.5} />
              {/* task name */}
              <text x={10} y={y + ROW_H * 0.65} fontSize={11} fill="#1A1714">
                {t.task_code && <tspan fill="#878581">{t.task_code} </tspan>}
                {t.name.slice(0, 26)}{t.name.length > 26 ? "…" : ""}
              </text>
              {/* bar */}
              {start && finish && (
                <>
                  <rect
                    className="bar"
                    x={barX} y={y + 5}
                    width={barW} height={ROW_H - 10}
                    rx={3} fill={fill}
                    style={{ cursor: readOnly ? "default" : "grab" }}
                    onPointerDown={(e) => handlePointerDown(e as any, t, "move")}
                  />
                  {/* progress overlay */}
                  <rect
                    x={barX} y={y + 5}
                    width={(barW * (t.pct_complete ?? 0)) / 100}
                    height={ROW_H - 10}
                    rx={3} fill="rgba(0,0,0,0.22)"
                    pointerEvents="none"
                  />
                  {/* resize handle */}
                  {!readOnly && (
                    <rect
                      x={barX + barW - 4} y={y + 5}
                      width={6} height={ROW_H - 10}
                      fill="transparent"
                      style={{ cursor: "ew-resize" }}
                      onPointerDown={(e) => handlePointerDown(e as any, t, "resize")}
                    />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Dependency arrows */}
        {predecessors.map((p, i) => {
          const from = taskById.get(p.predecessor_task_id);
          const to = taskById.get(p.task_id);
          if (!from?.finish_date || !to?.start_date) return null;
          const yFrom = HEADER_H + (taskRowIdx.get(from.id) ?? 0) * ROW_H + ROW_H / 2;
          const yTo = HEADER_H + (taskRowIdx.get(to.id) ?? 0) * ROW_H + ROW_H / 2;
          const xFrom = daysBetween(minDate, new Date(from.finish_date)) * dayWidth + 220;
          const xTo = daysBetween(minDate, new Date(to.start_date)) * dayWidth + 220;
          return (
            <polyline
              key={i}
              points={`${xFrom},${yFrom} ${xFrom + 8},${yFrom} ${xFrom + 8},${yTo} ${xTo},${yTo}`}
              fill="none" stroke="#878581" strokeWidth={1} markerEnd="url(#arrowhead)"
            />
          );
        })}

        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#878581" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
