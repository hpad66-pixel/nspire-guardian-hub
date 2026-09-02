import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import type { WaterQaReport } from '@/lib/water-intel/qa';

export function WaterIntelQaBanner({ report }: { report: WaterQaReport }) {
  return (
    <section
      className={`rounded-3xl border px-5 py-4 shadow-sm ${
        report.ok ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'
      }`}
      data-testid="water-intel-qa"
      data-qa={report.ok ? 'pass' : 'fail'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {report.ok ? (
            <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 h-7 w-7 shrink-0 text-amber-600" aria-hidden />
          )}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              QA / QC · ledger
            </div>
            <h2 className="font-display text-2xl text-[#08271f]">
              {report.ok
                ? 'Green check — Glorieta WASD ledger is up to date'
                : 'Ledger is incomplete — see checks below'}
            </h2>
            <p className="mt-1 text-sm text-[#5c6863]">
              {report.ocrMatched}/{report.ocrExpected} June 2026 statements match the ingested archive
              {report.latestPeriod ? ` · latest ${report.latestPeriod.slice(0, 7)}` : ''}.
            </p>
          </div>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {report.checks.map((check) => (
          <li
            key={check.id}
            className="flex gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm"
            data-testid={`water-qa-${check.id}`}
            data-status={check.status}
          >
            {check.status === 'pass' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : check.status === 'fail' ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1D6FE8]" />
            )}
            <div>
              <div className="font-semibold text-[#08271f]">{check.label}</div>
              <div className="text-xs leading-relaxed text-[#5c6863]">{check.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
