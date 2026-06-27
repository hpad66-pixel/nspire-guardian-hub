import { CalendarDays, ListChecks, Megaphone, Loader2, Images } from 'lucide-react';
import { usePortalData, PHASE_LABEL } from '@/hooks/usePortalData';

const HEALTH: Record<string, { label: string; bg: string; fg: string }> = {
  on_track: { label: 'On track', bg: '#E1F5EE', fg: '#0F6E56' },
  at_risk:  { label: 'At risk',  bg: '#FAEEDA', fg: '#854F0B' },
  delayed:  { label: 'Delayed',  bg: '#FCEBEB', fg: '#A32D2D' },
};

const fmtDate = (d?: string | null) => {
  if (!d) return null;
  try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return null; }
};

export function PortalProjectOverview({ slug, accent }: { slug?: string; accent: string }) {
  const { data, isLoading } = usePortalData(slug);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data?.project) return null;

  const { phases, project, milestones, latest_update, punch, photos } = data;
  const curIdx = Math.max(0, phases.indexOf(project.phase));
  const punchTotal = punch.open + punch.closed;
  const punchPct = punchTotal ? Math.round((punch.closed / punchTotal) * 100) : 0;
  const upcoming = milestones.filter((m) => m.status !== 'completed' && m.date).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Phase tracker */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project phase</p>
        <div className="flex items-center">
          {phases.map((p, i) => (
            <div key={p} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: i <= curIdx ? accent : '#E5E7EB' }} />
                <span className="whitespace-nowrap text-[10px] font-medium" style={{ color: i === curIdx ? accent : i < curIdx ? '#0F6E56' : '#9CA3AF' }}>
                  {PHASE_LABEL[p] ?? p}
                </span>
              </div>
              {i < phases.length - 1 && <span className="mx-1 h-[3px] flex-1 rounded-full" style={{ background: i < curIdx ? accent : '#E5E7EB' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Latest update */}
      {latest_update && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Megaphone className="h-4 w-4" style={{ color: accent }} /> Latest update{latest_update.period ? ` · ${latest_update.period}` : ''}
            </div>
            {HEALTH[latest_update.health] && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: HEALTH[latest_update.health].bg, color: HEALTH[latest_update.health].fg }}>
                {HEALTH[latest_update.health].label}
              </span>
            )}
          </div>
          {latest_update.summary && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{latest_update.summary}</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Key dates */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4" style={{ color: accent }} /> Key dates</div>
          <div className="mt-2 space-y-1.5 text-[13px]">
            {upcoming.length === 0 && project.target_end_date && (
              <div className="flex justify-between"><span className="text-muted-foreground">Target completion</span><span className="font-semibold">{fmtDate(project.target_end_date)}</span></div>
            )}
            {upcoming.map((m, i) => (
              <div key={i} className="flex justify-between gap-2"><span className="truncate text-muted-foreground">{m.title}</span><span className="shrink-0 font-semibold">{fmtDate(m.date)}</span></div>
            ))}
            {upcoming.length === 0 && !project.target_end_date && <p className="text-muted-foreground">No dates scheduled yet.</p>}
          </div>
        </div>

        {/* Punch list */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ListChecks className="h-4 w-4" style={{ color: accent }} /> Punch list</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">{punch.open}</span>
            <span className="text-xs text-muted-foreground">open · {punch.closed} closed</span>
          </div>
          {punchTotal > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${punchPct}%`, background: accent }} />
            </div>
          )}
        </div>
      </div>

      {/* Progress photos */}
      {photos.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Images className="h-4 w-4" style={{ color: accent }} /> Progress photos</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((ph, i) => (
              <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer" className="group relative shrink-0" title={ph.caption ?? undefined}>
                <img src={ph.url} alt={ph.caption ?? 'Progress photo'} loading="lazy" className="h-24 w-32 rounded-lg object-cover ring-1 ring-border transition-transform group-hover:scale-[1.02]" />
                {ph.caption && <span className="absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{ph.caption}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
