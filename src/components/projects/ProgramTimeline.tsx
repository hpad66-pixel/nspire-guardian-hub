import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/hooks/useProjects';
import type { ProjectTree } from '@/lib/projectTree';
import { cn } from '@/lib/utils';

// A lightweight Gantt of a program's subprojects. Bars come from start_date →
// target_end_date, so items running side-by-side read as parallel and stacked
// items read as sequential. Colored by status; overdue gets a rose ring.

const day = (iso: string | null | undefined) => (iso ? new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso) : null);
const MS = 86400000;

const BAR: Record<string, string> = {
  active: 'bg-[var(--apas-emerald)]',
  planning: 'bg-[var(--apas-sapphire)]',
  on_hold: 'bg-[var(--apas-amber)]',
  completed: 'bg-muted-foreground/50',
  closed: 'bg-muted-foreground/40',
};

interface Row { project: Project; depth: number }

export function ProgramTimeline({ rootId, tree }: { rootId: string; tree: ProjectTree<Project> }) {
  const navigate = useNavigate();

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const walk = (id: string, depth: number) => {
      for (const c of tree.children(id)) { out.push({ project: c, depth }); walk(c.id, depth + 1); }
    };
    walk(rootId, 0);
    return out;
  }, [rootId, tree]);

  const range = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const { project: p } of rows) {
      const s = day(p.start_date)?.getTime();
      const e = day(p.target_end_date)?.getTime();
      if (s != null) { min = Math.min(min, s); max = Math.max(max, s); }
      if (e != null) { min = Math.min(min, e); max = Math.max(max, e); }
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!isFinite(min)) { min = today.getTime() - 30 * MS; max = today.getTime() + 30 * MS; }
    // pad 5%
    const pad = Math.max((max - min) * 0.05, 3 * MS);
    min -= pad; max += pad;
    if (max <= min) max = min + 60 * MS;
    return { min, max, span: max - min };
  }, [rows]);

  const pct = (t: number) => `${((t - range.min) / range.span) * 100}%`;
  const today = Date.now();
  const todayPct = today >= range.min && today <= range.max ? ((today - range.min) / range.span) * 100 : null;

  // Month tick labels across the top.
  const ticks = useMemo(() => {
    const out: { label: string; left: number }[] = [];
    const d = new Date(range.min); d.setDate(1); d.setHours(0, 0, 0, 0);
    let guard = 0;
    while (d.getTime() <= range.max && guard < 48) {
      const t = d.getTime();
      if (t >= range.min) out.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), left: ((t - range.min) / range.span) * 100 });
      d.setMonth(d.getMonth() + 1); guard++;
    }
    return out;
  }, [range]);

  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No subprojects to place on a timeline yet.</div>;
  }

  return (
    <div className="rounded-xl border bg-card p-4 overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Axis */}
        <div className="relative h-5 ml-[40%]">
          {ticks.map((tk, i) => (
            <div key={i} className="absolute top-0 text-[10px] text-muted-foreground -translate-x-1/2" style={{ left: `${tk.left}%` }}>{tk.label}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="relative">
          {/* gridlines + today */}
          <div className="absolute inset-0 ml-[40%] pointer-events-none">
            {ticks.map((tk, i) => <div key={i} className="absolute top-0 bottom-0 w-px bg-border/40" style={{ left: `${tk.left}%` }} />)}
            {todayPct != null && <div className="absolute top-0 bottom-0 w-px bg-[var(--apas-rose)]/70" style={{ left: `${todayPct}%` }} title="Today" />}
          </div>

          {rows.map(({ project: p, depth }) => {
            const s = day(p.start_date)?.getTime();
            const e = day(p.target_end_date)?.getTime();
            const hasDates = s != null || e != null;
            const start = s ?? e ?? range.min;
            const end = e ?? s ?? start;
            const overdue = e != null && e < today && p.status !== 'completed' && p.status !== 'closed';
            const dep = p.depends_on_project_id ? tree.byId.get(p.depends_on_project_id) : null;
            return (
              <div key={p.id} className="flex items-center h-9 group">
                <button onClick={() => navigate(`/projects/${p.id}`)} className="w-[40%] shrink-0 pr-3 text-left truncate text-xs hover:underline" style={{ paddingLeft: depth * 12 }} title={p.name}>
                  <span className="text-muted-foreground">{depth > 0 ? '↳ ' : ''}</span>{p.name}
                </button>
                <div className="relative flex-1 h-full">
                  {hasDates ? (
                    <div
                      className={cn('absolute top-1/2 -translate-y-1/2 h-4 rounded-md flex items-center', BAR[p.status ?? 'planning'] ?? 'bg-muted-foreground/50', overdue && 'ring-2 ring-[var(--apas-rose)]')}
                      style={{ left: pct(start), width: `max(6px, calc(${pct(end)} - ${pct(start)}))` }}
                      title={`${p.start_date ?? '?'} → ${p.target_end_date ?? '?'}`}
                    >
                      {dep && <span className="ml-1.5 text-[9px] text-white/90 whitespace-nowrap overflow-hidden">after {dep.name}</span>}
                    </div>
                  ) : (
                    <span className="absolute top-1/2 -translate-y-1/2 left-0 text-[10px] text-muted-foreground italic">no dates</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {[['active', 'Active'], ['planning', 'Planning'], ['on_hold', 'On hold'], ['completed', 'Done']].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1"><span className={cn('h-2 w-3 rounded-sm', BAR[k])} />{l}</span>
          ))}
          <span className="flex items-center gap-1"><span className="h-3 w-px bg-[var(--apas-rose)]/70" />Today</span>
        </div>
      </div>
    </div>
  );
}
