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
import { WaterTerm } from './WaterTerm';

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

function periodDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const first = new Date(`${start}T00:00:00Z`).getTime();
  const last = new Date(`${end}T00:00:00Z`).getTime();
  return Number.isFinite(first) && Number.isFinite(last) && last >= first ? Math.round((last - first) / 86_400_000) + 1 : 0;
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
  const measuredDays = periodDays(analytics.reportingStart, analytics.reportingEnd);
  const benchmarkVariance = analytics.benchmarkGapGallons == null || !analytics.benchmarkGallons
    ? null
    : (analytics.benchmarkGapGallons / analytics.benchmarkGallons) * 100;

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
          label={<WaterTerm term="gpud">Actual unit intensity</WaterTerm>}
          value={metric(analytics.gallonsPerUnitDay, 'gal/unit/day')}
          detail={`${metric(analytics.epaMedianGallonsPerUnitDay, 'national median')} · ${pct(unitVariance)}`}
          tone={unitVariance != null && unitVariance > 10 ? 'rose' : 'green'}
        />
        <MetricCard
          icon={Users}
          label={<WaterTerm term="gpcd">Modeled per capita</WaterTerm>}
          value={metric(analytics.gallonsPerCapitaDay, 'GPCD')}
          detail={`${analytics.modeledResidents?.toLocaleString() ?? 'No'} modeled residents · verify population for a factual result`}
          tone="blue"
        />
        <MetricCard
          icon={BadgeDollarSign}
          label={<WaterTerm term="avoided">Rate-normalized avoided cost</WaterTerm>}
          value={signedMoney(analytics.avoidedCost)}
          detail={`${signedGallons(analytics.avoidedGallons)} vs matched prior year`}
          tone={savingsPositive ? 'green' : 'rose'}
        />
        <MetricCard
          icon={CircleGauge}
          label={<WaterTerm term="intensity">Annualized cost intensity</WaterTerm>}
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
              <Droplets className="h-4 w-4 text-[#1D6FE8]" /> National multifamily median reference
            </div>
            <div className="mt-3 font-display text-3xl text-[#08271f]">
              {analytics.epaMedianGallonsPerUnitYear.toLocaleString()} gal/unit/year
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#5c6863]">
              The property is currently {analytics.benchmarkGapGallons == null ? 'not comparable' : benchmarkPositive ? `${gallons(Math.abs(analytics.benchmarkGapGallons))} (${Math.abs(benchmarkVariance ?? 0).toFixed(1)}%) below` : `${gallons(Math.abs(analytics.benchmarkGapGallons))} (${Math.abs(benchmarkVariance ?? 0).toFixed(1)}%) above`} that median-volume reference for the measured period.
            </p>
            {analytics.benchmarkGallons != null && <div className="mt-4 space-y-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-950"><p className="font-bold uppercase tracking-wide">Visible calculation</p><p><strong>Measured:</strong> {gallons(analytics.actualGallons)} from non-estimated statements.</p><p><strong>Reference:</strong> 43,600 × {analytics.totalUnits.toLocaleString()} connected units × {measuredDays.toLocaleString()} days ÷ 365 = {gallons(analytics.benchmarkGallons)}.</p><p><strong>Difference:</strong> measured minus reference = {signedGallons(analytics.benchmarkGapGallons)}.</p></div>}
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
        <p><strong>Source and method:</strong> The 43,600 gal/unit/year value is the multifamily median property-specific metric in the June 2023 ENERGY STAR/WaterSense <a className="font-semibold text-[#1D6FE8] underline" href="https://www.energystar.gov/sites/default/files/tools/National%20WUI%20Technical%20Reference%202023_0719b.pdf" target="_blank" rel="noreferrer">U.S. Water Use Intensity by Property Type technical reference</a>. Savings use matched prior-year meter use, service-day adjustment, and reporting-period water/sewer rates. This is a management comparison—not a compliance finding, efficiency certification, or diagnosis.</p>
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
  label: React.ReactNode;
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
