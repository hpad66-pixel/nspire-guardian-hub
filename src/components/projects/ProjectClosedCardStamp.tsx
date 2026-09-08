import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClosedFinancialResult, type ProjectCardRecord } from '@/lib/projects/projectCardPresentation';

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

export function ProjectClosedCardStamp({ project }: { project: ProjectCardRecord }) {
  const result = getClosedFinancialResult(project);
  const closedDate = project.closed_at
    ? format(new Date(project.closed_at), 'MMM d, yyyy')
    : null;

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-amber-300/40 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-3 text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_12%_15%,white_0,transparent_24%),radial-gradient(circle_at_95%_100%,#6ee7b7_0,transparent_34%)]" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-double border-amber-300 bg-slate-950 shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
          <div className="text-center leading-none">
            <ShieldCheck className="mx-auto h-5 w-5 text-amber-300" />
            <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.15em] text-amber-100">Closed</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">Certified closeout</p>
          {result ? (
            <>
              <p className={cn(
                'mt-0.5 text-xs font-semibold',
                result.kind === 'loss' ? 'text-rose-200' : result.kind === 'profit' ? 'text-emerald-200' : 'text-amber-100',
              )}>
                {result.label}
              </p>
              <p className={cn(
                'mt-0.5 text-xl font-black tabular-nums tracking-tight',
                result.kind === 'loss' ? 'text-rose-100' : result.kind === 'profit' ? 'text-emerald-100' : 'text-amber-50',
              )}>
                {result.kind === 'loss' ? '−' : result.kind === 'profit' ? '+' : ''}{money(result.absoluteAmount)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-white/90">Final records locked</p>
          )}
          {closedDate && <p className="mt-0.5 text-[10px] text-white/55">Closed {closedDate}</p>}
        </div>
      </div>
    </div>
  );
}

