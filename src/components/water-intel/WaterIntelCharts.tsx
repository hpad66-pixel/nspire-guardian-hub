import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildMonthlySeries, gallons, money, yearOverYear } from '@/lib/water-intel';
import type { AccountRollup, WaterBill } from '@/lib/water-intel';

const GOLD = '#C4A35A';
const FOREST = '#08271f';
const SAPPHIRE = '#1D6FE8';
const ROSE = '#F43F5E';

function Tip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#dedbd1] bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-[#08271f]">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6 text-[#5c6863]">
          <span>{p.name}</span>
          <span className="font-mono text-[#08271f]">
            {String(p.dataKey).includes('gal') ? gallons(p.value) : money(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WaterIntelCharts({
  bills,
  rollups,
}: {
  bills: WaterBill[];
  rollups: AccountRollup[];
}) {
  const monthly = buildMonthlySeries(bills);
  const years = yearOverYear(bills);
  const byAccount = rollups
    .slice()
    .sort((a, b) => b.last12Spend - a.last12Spend)
    .map((r) => ({
      name: r.buildingLabel.replace(/^Building\s+/i, 'Bldg '),
      spend: Math.round(r.last12Spend),
      gallons: Math.round(r.last12Gallons),
    }));

  if (!bills.length) {
    return (
      <div className="rounded-3xl border border-dashed border-[#dedbd1] bg-white p-10 text-center text-sm text-[#8a8478]" data-testid="water-charts-empty">
        No trend data yet — ingest WASD statements to populate spend, gallons, and year-over-year charts.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3" data-testid="water-intel-charts">
      <section className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm xl:col-span-2">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Trend</div>
            <h3 className="font-display text-2xl text-[#08271f]">Spend & consumption</h3>
          </div>
          <div className="flex gap-3 text-[11px] text-[#5c6863]">
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#08271f]" /> Spend</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#C4A35A]" /> Gallons</span>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wiSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={FOREST} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={FOREST} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="wiGal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#efe9da" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <YAxis yAxisId="gal" orientation="right" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<Tip />} />
              <Area yAxisId="spend" type="monotone" dataKey="spend" name="Spend" stroke={FOREST} fill="url(#wiSpend)" strokeWidth={2} />
              <Area yAxisId="gal" type="monotone" dataKey="gallons" name="Gallons" stroke={GOLD} fill="url(#wiGal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Year over year</div>
        <h3 className="mb-4 font-display text-2xl text-[#08271f]">Annual cost</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={years} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#efe9da" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="spend" name="Spend" radius={[8, 8, 0, 0]}>
                {years.map((y, i) => (
                  <Cell key={y.year} fill={i === years.length - 1 ? GOLD : FOREST} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm xl:col-span-3">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">By service account</div>
            <h3 className="font-display text-2xl text-[#08271f]">Where the money goes</h3>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byAccount} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#efe9da" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#08271f' }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="spend" name="T12 spend" radius={[0, 8, 8, 0]}>
                {byAccount.map((row, i) => (
                  <Cell key={row.name} fill={i === 0 ? ROSE : i === 1 ? SAPPHIRE : FOREST} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
