import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const WATER_TERMS = {
  pg: 'Per gallon. When shown in a rate, dollars are divided by billed gallons; the dashboard usually scales this to cost per 1,000 gallons for readability.',
  gal: 'Gallons—the volume of water recorded by the utility meter.',
  gpud: 'Gallons per unit per day: metered gallons divided by connected apartment units and measured service days.',
  gpcd: 'Gallons per capita per day: metered gallons divided by residents and service days. A result is modeled when verified resident counts are unavailable.',
  gc: 'Gallons consumed during the selected billing period.',
  pd: 'Per day. The total is divided by the number of utility service days.',
  ytd: 'Year to date: January 1 through the dashboard as-of date.',
  t12: 'Trailing 12 months: the most recent twelve-month window ending at the dashboard as-of date.',
  estimated: 'An estimated read is calculated by the utility instead of coming from an actual meter reading. It is excluded from verified savings.',
  baseline: 'The same meter and month one year earlier, adjusted when the number of service days differs.',
  avoided: 'Modeled gallons not used compared with the matched prior-year baseline. Avoided cost values those gallons at current-period water and sewer rates.',
  intensity: 'Water use divided by a comparable operating unit, such as gallons per apartment unit per year.',
  sourcePair: 'Both the current and prior-year comparison bills have an uploaded, OCR, or API source record.',
  mapping: 'The share of property units assigned to a known service meter.',
} as const;

export function WaterTerm({
  children,
  term,
  className,
}: {
  children: React.ReactNode;
  term: keyof typeof WATER_TERMS;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={cn('inline-flex items-center gap-1 text-left underline decoration-dotted underline-offset-4', className)}>
            {children}<CircleHelp className="h-3.5 w-3.5 shrink-0 opacity-65" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed" sideOffset={7}>{WATER_TERMS[term]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WaterGlossary({ compact = false }: { compact?: boolean }) {
  const entries: Array<[string, keyof typeof WATER_TERMS]> = compact
    ? [['gal', 'gal'], ['GC', 'gc'], ['PD', 'pd'], ['YTD', 'ytd']]
    : [['gal', 'gal'], ['PG', 'pg'], ['GC', 'gc'], ['PD', 'pd'], ['gal/unit/day', 'gpud'], ['GPCD', 'gpcd'], ['YTD', 'ytd'], ['T12', 't12'], ['Estimated read', 'estimated'], ['Normalized baseline', 'baseline'], ['Avoided cost', 'avoided'], ['Water-use intensity', 'intensity'], ['Source-backed pair', 'sourcePair'], ['Meter mapping', 'mapping']];
  return (
    <details className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm" data-testid="water-glossary">
      <summary className="cursor-pointer font-semibold text-[#08271f]">Plain-English glossary · tap to explain the terms</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{entries.map(([label, key]) => <div key={key} className="rounded-2xl bg-[#f7f6f2] p-3"><div className="text-xs font-bold text-[#08271f]">{label}</div><p className="mt-1 text-xs leading-relaxed text-[#5c6863]">{WATER_TERMS[key]}</p></div>)}</div>
    </details>
  );
}
