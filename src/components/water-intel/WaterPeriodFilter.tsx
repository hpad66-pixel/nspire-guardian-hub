import { CalendarRange } from 'lucide-react';
import type { WaterPeriodPreset, WaterPeriodSelection, WaterPeriodSummary } from '@/lib/water-intel/period';
import { gallons, money } from '@/lib/water-intel';

const LABELS: Record<WaterPeriodPreset, string> = {
  all: 'All data', t12: 'Last 12 months', ytd: 'Year to date', previous_year: 'Previous year', custom: 'Custom dates',
};

function displayDate(value: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function WaterPeriodFilter({
  preset,
  selection,
  summary,
  onPresetChange,
  onCustomChange,
  compact = false,
}: {
  preset: WaterPeriodPreset;
  selection: WaterPeriodSelection;
  summary: WaterPeriodSummary;
  onPresetChange: (preset: WaterPeriodPreset) => void;
  onCustomChange: (start: string, end: string) => void;
  compact?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-[#dedbd1] bg-white p-4 shadow-sm" data-testid="water-period-filter">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]"><CalendarRange className="h-4 w-4" /> Reporting period</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(LABELS) as WaterPeriodPreset[]).map((value) => (
              <button key={value} type="button" onClick={() => onPresetChange(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${preset === value ? 'border-[#08271f] bg-[#08271f] text-white' : 'border-[#dedbd1] bg-white text-[#5c6863] hover:border-[#8a8478]'}`}>{LABELS[value]}</button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-xs text-[#5c6863]">From <input aria-label="Water period start date" type="date" value={selection.start ?? ''} max={selection.end ?? undefined} onChange={(event) => onCustomChange(event.target.value, selection.end ?? '')} className="h-10 rounded-xl border border-[#dedbd1] px-3" /></label>
              <label className="flex items-center gap-2 text-xs text-[#5c6863]">To <input aria-label="Water period end date" type="date" value={selection.end ?? ''} min={selection.start ?? undefined} onChange={(event) => onCustomChange(selection.start ?? '', event.target.value)} className="h-10 rounded-xl border border-[#dedbd1] px-3" /></label>
            </div>
          )}
        </div>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <Summary label="Included" value={`${displayDate(summary.firstDate)} – ${displayDate(summary.lastDate)}`} wide />
          <Summary label="Bills" value={summary.billCount.toLocaleString()} />
          <Summary label="Spend" value={money(summary.spend)} />
          {!compact && <Summary label="Consumption" value={gallons(summary.gallons)} />}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-2xl bg-[#f7f6f2] px-3 py-2 ${wide ? 'col-span-2' : ''}`}><div className="text-[9px] font-bold uppercase tracking-wider text-[#8a8478]">{label}</div><div className="mt-0.5 text-sm font-semibold text-[#08271f]">{value}</div></div>;
}
