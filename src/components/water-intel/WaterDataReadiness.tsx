import { AlertTriangle, CalendarClock, CheckCircle2, FileQuestion, Gauge, UploadCloud } from 'lucide-react';
import type { WaterDataGap } from '@/lib/water-intel/period';

const ICONS = { missing_cycle: AlertTriangle, missing_source: FileQuestion, estimated_read: Gauge, meter_profile: FileQuestion, next_cycle: CalendarClock };
const TONES = {
  now: 'border-rose-200 bg-rose-50 text-rose-950',
  next: 'border-sky-200 bg-sky-50 text-sky-950',
  improve: 'border-amber-200 bg-amber-50 text-amber-950',
};

export function WaterDataReadiness({ gaps, simple = false }: { gaps: WaterDataGap[]; simple?: boolean }) {
  const actionable = simple ? gaps.filter((gap) => ['missing_cycle', 'estimated_read', 'next_cycle'].includes(gap.kind)) : gaps;
  const shown = actionable.slice(0, simple ? 8 : 12);
  return (
    <section className="rounded-[28px] border border-[#dedbd1] bg-white p-5 shadow-sm md:p-6" data-testid="water-data-readiness">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Data readiness</div><h2 className="mt-1 font-display text-3xl text-[#08271f]">{simple ? 'What to upload next' : 'What is missing'}</h2><p className="mt-1 max-w-2xl text-sm text-[#5c6863]">{simple ? 'Upload the source statement. Proj OS will extract and match it; no manual ledger editing is required.' : 'A deterministic check of billing cycles, source evidence, actual reads, and meter profiles.'}</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f7f6f2] px-3 py-1.5 text-xs font-semibold text-[#5c6863]"><UploadCloud className="h-3.5 w-3.5" />{actionable.length} item{actionable.length === 1 ? '' : 's'}</span>
      </div>
      {shown.length === 0 ? <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="h-5 w-5" /><div><p className="font-semibold">Current cycle is complete</p><p className="text-xs opacity-75">No missing billing records were detected.</p></div></div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{shown.map((gap) => { const Icon = ICONS[gap.kind]; return <article key={gap.id} className={`rounded-2xl border p-4 ${TONES[gap.priority]}`}><div className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold leading-snug">{gap.title}</p><p className="mt-1 text-xs leading-relaxed opacity-75">{gap.detail}</p><p className="mt-2 text-xs font-semibold">Next: {gap.action}</p></div></div></article>; })}</div>}
      {actionable.length > shown.length && <p className="mt-3 text-xs text-[#8a8478]">Showing {shown.length} highest-priority items. {actionable.length - shown.length} additional items remain in the full administrator view.</p>}
    </section>
  );
}
