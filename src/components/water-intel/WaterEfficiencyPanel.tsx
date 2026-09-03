import {
  BadgeDollarSign,
  Building2,
  CircleGauge,
  Droplets,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { gallons, money, pct } from '@/lib/water-intel';
import type { WaterEfficiencyAnalytics } from '@/lib/water-intel';

const FOREST = '#08271f';
const GOLD = '#C4A35A';
const SAPPHIRE = '#1D6FE8';

function metric(value: number | null, suffix: string, digits = 1) {
  return value == null ? '—' : `${value.toFixed(digits)} ${suffix}`;
}

function signedMoney(value: number | null) {
  if (value == null) return '—';
  return `${value < 0 ? '−' : ''}${money(Math.abs(value))}`;
}

function signedGallons(value: number | null) {
  if (value == null) return '—';
  return `${value < 0 ? '−' : ''}${gallons(Math.abs(value))}`;
}

function periodLabel(start: string | null, end: string | null) {
  if (!start || !end) return 'No complete comparison period';
  const format = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${format(start)}–${format(end)}`;
}

function QualityPill({ label, value }: { label: string; value: number }) {
  const tone = value >= 90
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : value >= 70
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {label} {Math.round(value)}%
    </span>
  );
}

interface EfficiencyTipEntry {
  dataKey?: string;
  name?: string;
  value?: number;
}

function EfficiencyTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: EfficiencyTipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#dedbd1] bg-white px-3 py-2 text-xs shadow-xl">
      <div className="mb-1.5 font-semibold text-[#08271f]">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex min-w-48 items-center justify-between gap-5 py-0.5 text-[#5c6863]">
          <span>{entry.name}</span>
          <span className="font-mono font-semibold text-[#08271f]">
            {entry.dataKey === 'avoidedCost'
              ? signedMoney(entry.value ?? null)
              : gallons(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WaterEfficiencyPanel({ analytics }: { analytics: WaterEfficiencyAnalytics }) {
  const unitVariance = analytics.gallonsPerUnitDay == null
    ? null
    : ((analytics.gallonsPerUnitDay - analytics.epaMedianGallonsPerUnitDay)
      / analytics.epaMedianGallonsPerUnitDay) * 100;
  const savingsPositive = (analytics.avoidedCost ?? 0) >= 0;
  const benchmarkPositive = (analytics.benchmarkGapCost ?? 0) <= 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dedbd1] bg-[#f8f6ef] shadow-sm" data-testid="water-efficiency-panel">
      <div className="border-b border-[#dedbd1] bg-white px-5 py-5 md:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Normalized water performance</div>
            <h2 className="mt-1 font-display text-3xl text-[#08271f]">What it is · what it should be · what it saves</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5c6863]">
              Non-estimated ledger consumption is normalized by service days, connected units, and population. Dollar savings use the bill’s water-and-sewer rate so a rate increase is not mistaken for excess consumption.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              analytics.status === 'verified'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : analytics.status === 'modeled'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}>
              {analytics.status === 'verified' ? 'Verified savings' : analytics.status === 'modeled' ? 'Modeled · verify inputs' : 'Insufficient comparison data'}
            </span>
            <span className="rounded-full border border-[#dedbd1] bg-white px-3 py-1 text-xs text-[#5c6863]">
              {periodLabel(analytics.reportingStart, analytics.reportingEnd)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        <MetricCard
          icon={Building2}
          label="Actual unit intensity"
          value={metric(analytics.gallonsPerUnitDay, 'gal/unit/day')}
          detail={`${metric(analytics.epaMedianGallonsPerUnitDay, 'EPA median')} · ${pct(unitVariance)}`}
          tone={unitVariance != null && unitVariance > 10 ? 'rose' : 'green'}
        />
        <MetricCard
          icon={Users}
          label="Modeled per capita"
          value={metric(analytics.gallonsPerCapitaDay, 'GPCD')}
          detail={`${analytics.epaAverageIndoorGpcd} average · ${analytics.waterSenseEfficientGpcd} efficient reference`}
          tone={analytics.gallonsPerCapitaDay != null && analytics.gallonsPerCapitaDay > analytics.epaAverageIndoorGpcd ? 'rose' : 'blue'}
        />
        <MetricCard
          icon={BadgeDollarSign}
          label="Rate-normalized avoided cost"
          value={signedMoney(analytics.avoidedCost)}
          detail={`${signedGallons(analytics.avoidedGallons)} vs matched prior year`}
          tone={savingsPositive ? 'green' : 'rose'}
        />
        <MetricCard
          icon={CircleGauge}
          label="Annualized cost intensity"
          value={analytics.annualizedCostPerUnit == null ? '—' : `${money(analytics.annualizedCostPerUnit)}/unit`}
          detail={`${analytics.costPerThousandGallons == null ? '—' : money(analytics.costPerThousandGallons, 2)} per 1,000 gal`}
          tone="gold"
        />
      </div>

      <div className="grid gap-4 px-4 pb-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)] md:px-6 md:pb-6">
        <div className="rounded-3xl border border-[#dedbd1] bg-white p-4 md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Performance trend</div>
              <h3 className="font-display text-2xl text-[#08271f]">Actual use vs normalized baseline</h3>
            </div>
            <div className="text-xs text-[#8a8478]">Positive $ = avoided cost · negative $ = excess cost</div>
          </div>
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#efe9da" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="gallons" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1_000)}k`} />
                <YAxis yAxisId="dollars" orientation="right" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(value / 1_000)}k`} />
                <Tooltip content={<EfficiencyTip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar yAxisId="dollars" dataKey="avoidedCost" name="Avoided cost" fill={SAPPHIRE} opacity={0.24} radius={[5, 5, 0, 0]} />
                <Line yAxisId="gallons" type="monotone" dataKey="actualGallons" name="Actual gallons" stroke={FOREST} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="gallons" type="monotone" dataKey="baselineGallons" name="Normalized baseline" stroke={GOLD} strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <Droplets className="h-4 w-4 text-[#1D6FE8]" /> EPA multifamily reference
            </div>
            <div className="mt-3 font-display text-3xl text-[#08271f]">
              {analytics.epaMedianGallonsPerUnitYear.toLocaleString()} gal/unit/year
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#5c6863]">
              The property is currently {analytics.benchmarkGapGallons == null ? 'not comparable' : benchmarkPositive ? `${gallons(Math.abs(analytics.benchmarkGapGallons))} below` : `${gallons(Math.abs(analytics.benchmarkGapGallons))} above`} that median-volume reference for the measured period.
            </p>
            <div className={`mt-4 rounded-2xl px-4 py-3 ${benchmarkPositive ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wide">Rate-equivalent gap</div>
              <div className="mt-1 font-mono text-xl font-semibold">{signedMoney(analytics.benchmarkGapCost)}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Data confidence
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <QualityPill label="Non-estimated" value={analytics.readingCoveragePct} />
              <QualityPill label="Source-backed pairs" value={analytics.sourceDocumentCoveragePct} />
              <QualityPill label="Prior-year pairs" value={analytics.comparisonCoveragePct} />
              <QualityPill label="Meter mapping" value={analytics.meterMappingCoveragePct} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#6d746f]">
              Per-capita results are modeled at 2.0 residents per occupied unit until verified resident counts are entered per meter. Seeded history can support planning analysis, but savings remain modeled until source-document coverage is sufficient. Estimated and duplicate bills are excluded.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#dedbd1] bg-white px-5 py-4 text-xs leading-relaxed text-[#6d746f] md:px-7">
        Method: EPA WaterSense/ENERGY STAR multifamily median of 43,600 gallons per unit per year; residential indoor references of 58.6 average and 36.7 efficient gallons per capita per day. Savings follow whole-meter M&amp;V logic: matched prior-year use, service-day adjustment, and reporting-period water/sewer rates. Benchmarks are management references, not compliance findings.
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'rose' | 'blue' | 'gold';
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
    gold: 'bg-amber-50 text-amber-700',
  };
  return (
    <article className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8478]">{label}</div>
        <span className={`rounded-xl p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-4 font-mono text-2xl font-semibold tracking-tight text-[#08271f]">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-[#6d746f]">{detail}</div>
    </article>
  );
}
