import { Gauge, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useComplianceScore } from '@/hooks/useComplianceScore';
import { BAND_META } from '@/lib/envcompliance/complianceScore';
import { cn } from '@/lib/utils';

export function ScorePanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useComplianceScore(projectId);

  if (isLoading) return <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">Loading…</div>;

  if (!data.hasData || data.score == null) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Gauge className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
        <p className="font-medium">No score yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">The compliance score is computed from this engagement's sampling results and permit obligations. Add some in the Sampling and Obligations tabs and it appears here.</p>
      </div>
    );
  }

  const meta = BAND_META[data.band];
  const score = data.score;
  const R = 54, C = 2 * Math.PI * R;
  const dash = (score / 100) * C;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[auto_1fr] items-center rounded-xl border bg-card p-5">
        {/* Gauge */}
        <div className="relative mx-auto h-[140px] w-[140px]">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/40" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={meta.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold tracking-tight" style={{ color: meta.color }}>{score}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">/ 100</div>
          </div>
        </div>
        {/* Band + drivers */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Compliance score</span>
            <span className="text-xs font-bold uppercase rounded-full px-2 py-0.5" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">A live health score from this engagement's sampling and obligations.</p>
          <div className="mt-3">
            {data.drivers.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pulling it down</div>
                {data.drivers.map((d, i) => <div key={i} className="flex items-center gap-1.5 text-sm"><AlertTriangle className="h-3.5 w-3.5 text-[var(--apas-rose)]" />{d}</div>)}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-[var(--apas-emerald)]"><CheckCircle2 className="h-4 w-4" />No compliance issues detected.</div>
            )}
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.components.map((c) => {
          const cb = BAND_META[c.score >= 90 ? 'strong' : c.score >= 75 ? 'good' : c.score >= 60 ? 'watch' : 'poor'];
          return (
            <div key={c.key} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{c.label}</span>
                <span className="text-sm font-bold" style={{ color: cb.color }}>{c.score}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.score}%`, background: cb.color }} /></div>
              <div className="mt-1.5 text-xs text-muted-foreground">{c.detail}</div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">Score = average of the components. Sampling drops with exceedances; Obligations drop with overdue (−15 each) and due-soon (−3 each) items.</p>
    </div>
  );
}
