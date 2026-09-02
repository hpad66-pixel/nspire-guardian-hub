import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Gauge,
  Loader2,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gallons, money, pct } from '@/lib/water-intel';
import type { InsightSeverity } from '@/lib/water-intel';
import {
  useWaterIntelligence,
  type WaterIntelScope,
} from '@/hooks/useWaterIntelligence';
import { auditWaterIntel } from '@/lib/water-intel/qa';
import { WaterIntelBillLedger } from './WaterIntelBillLedger';
import { WaterIntelCharts } from './WaterIntelCharts';
import { WaterIntelChat } from './WaterIntelChat';
import { WaterIntelNotes } from './WaterIntelNotes';
import { WaterIntelQaBanner } from './WaterIntelQaBanner';
import { WaterIntelUpload } from './WaterIntelUpload';

const SEV: Record<InsightSeverity, string> = {
  critical: 'bg-[#F43F5E]/10 text-[#9f1239] border-[#F43F5E]/30',
  watch: 'bg-[#F59E0B]/10 text-[#92400e] border-[#F59E0B]/30',
  opportunity: 'bg-[#10B981]/10 text-[#065f46] border-[#10B981]/30',
  info: 'bg-[#1D6FE8]/10 text-[#1e3a8a] border-[#1D6FE8]/30',
};

export function WaterIntelDashboard({
  scope,
  mode,
}: {
  scope: WaterIntelScope;
  mode: 'staff' | 'magic' | 'ops';
}) {
  const intel = useWaterIntelligence(scope);
  const [chatOpen, setChatOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const filteredBills = useMemo(() => {
    if (accountFilter === 'all') return intel.bills;
    return intel.bills.filter((b) => b.account_id === accountFilter);
  }, [intel.bills, accountFilter]);

  if (intel.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#8a8478]" data-testid="water-intel-loading">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening the water ledger…
      </div>
    );
  }

  if (intel.error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#dedbd1] bg-white p-10 text-center" data-testid="water-intel-error">
        <h1 className="font-display text-3xl text-[#08271f]">Link unavailable</h1>
        <p className="mt-2 text-sm text-[#5c6863]">{(intel.error as Error).message}</p>
      </div>
    );
  }

  const { kpis, rollups, insights, meta, accounts, notes, bills } = intel;
  const propertyName = meta?.property_name ?? 'Property';
  const guest = mode === 'magic';
  const canUpload = mode === 'staff';
  const deltaUp = (kpis.ytdDeltaPct ?? 0) > 0;
  const qa = useMemo(() => auditWaterIntel(accounts, bills), [accounts, bills]);

  return (
    <div className="space-y-6 pb-16" data-testid="water-intel-dashboard">
      <header className="overflow-hidden rounded-[28px] bg-[#08271f] px-6 py-8 text-white shadow-xl md:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5aa52]">
              Water Intelligence · Executive
            </div>
            <h1 className="mt-2 max-w-3xl font-display text-4xl font-medium leading-tight md:text-5xl">
              {propertyName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#b8c5c0]">
              Entire property · {kpis.accountCount} Miami-Dade service accounts · not a single-building sample.
              {kpis.latestPeriod ? ` Latest period ${kpis.latestPeriod.slice(0, 7)}.` : ''}
            </p>
          </div>
          <Button
            className="bg-[#d5aa52] text-[#08271f] hover:bg-[#e0c27a]"
            onClick={() => setChatOpen(true)}
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Ask what’s happening
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="YTD spend"
            value={money(kpis.ytdSpend)}
            hint={`${pct(kpis.ytdDeltaPct)} vs last year`}
            icon={deltaUp ? TrendingUp : TrendingDown}
            tone={deltaUp ? 'rose' : 'gold'}
          />
          <Kpi label="Trailing 12 months" value={money(kpis.last12Spend)} hint={gallons(kpis.last12Gallons)} icon={Droplets} />
          <Kpi label="Open / unpaid" value={money(kpis.openAmount)} hint={`${money(kpis.pastDueAmount)} past due`} icon={Scale} />
          <Kpi label="Estimated exposure" value={money(kpis.estimatedSpend)} hint={`${money(kpis.disputedSpend)} in dispute`} icon={Gauge} />
        </div>
      </header>

      <WaterIntelQaBanner report={qa} />

      {canUpload && meta?.property_id && (
        <WaterIntelUpload propertyId={meta.property_id} accounts={accounts} />
      )}

      {bills.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#dedbd1] bg-white p-10 text-center" data-testid="water-intel-empty">
          <h2 className="font-display text-2xl text-[#08271f]">No bills on this property yet</h2>
          <p className="mt-2 text-sm text-[#5c6863]">
            Charts stay blank until WASD statements are ingested. Enable Water Intelligence in Admin, then upload PDFs or confirm the Glorieta overlay migration ran.
          </p>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins) => (
          <article key={ins.id} className={`rounded-3xl border p-5 ${SEV[ins.severity]}`} data-testid="water-insight">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {ins.severity}
            </div>
            <h3 className="font-display text-xl leading-snug">{ins.title}</h3>
            <p className="mt-2 text-sm leading-relaxed opacity-90">{ins.body}</p>
            <p className="mt-3 text-sm font-semibold">{ins.action}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Interactive ledger</div>
          <h2 className="font-display text-3xl text-[#08271f]">Filter any service account</h2>
        </div>
        <select
          className="h-10 rounded-full border border-[#dedbd1] bg-white px-4 text-sm"
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          data-testid="water-account-filter"
        >
          <option value="all">All accounts — whole property</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.building_label || a.service_address} · {a.account_number}
            </option>
          ))}
        </select>
      </div>

      <WaterIntelCharts bills={filteredBills} rollups={accountFilter === 'all' ? rollups : rollups.filter((r) => r.accountId === accountFilter)} />

      <WaterIntelBillLedger bills={filteredBills} accounts={accounts} />

      <section className="overflow-hidden rounded-3xl border border-[#dedbd1] bg-white shadow-sm">
        <div className="border-b border-[#dedbd1] px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Service accounts</div>
          <h3 className="font-display text-2xl text-[#08271f]">Every meter on the property</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-[#F7F4EC] text-[11px] uppercase tracking-wide text-[#8a8478]">
              <tr>
                <th className="px-5 py-3 font-semibold">Building / address</th>
                <th className="px-3 py-3 font-semibold">Account</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">YTD</th>
                <th className="px-3 py-3 text-right font-semibold">T12 spend</th>
                <th className="px-3 py-3 text-right font-semibold">T12 gallons</th>
                <th className="px-3 py-3 text-right font-semibold">Δ vs prior</th>
                <th className="px-5 py-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((r) => (
                <tr
                  key={r.accountId}
                  className={`border-t border-[#efe9da] ${accountFilter === r.accountId ? 'bg-[#d5aa52]/10' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className="font-semibold text-[#08271f]">{r.buildingLabel}</div>
                    <div className="text-xs text-[#8a8478]">{r.serviceAddress}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{r.accountNumber}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                      r.status === 'disputed' ? 'bg-[#F43F5E]/10 text-[#9f1239]' : 'bg-[#08271f]/5 text-[#08271f]'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{money(r.ytdSpend)}</td>
                  <td className="px-3 py-3 text-right font-mono">{money(r.last12Spend)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{gallons(r.last12Gallons)}</td>
                  <td className={`px-3 py-3 text-right font-mono ${(r.spendDeltaPct ?? 0) > 0 ? 'text-[#9f1239]' : 'text-[#065f46]'}`}>
                    {pct(r.spendDeltaPct)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{money(r.openAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <WaterIntelNotes
        scope={scope}
        notes={notes}
        accounts={accounts}
        rollups={rollups}
        propertyName={propertyName}
        guest={guest}
      />

      <WaterIntelChat
        scope={scope}
        snapshot={intel.snapshot as unknown as Record<string, unknown>}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'gold',
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Droplets;
  tone?: 'gold' | 'rose';
}) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#b8c5c0]">
        {label}
        <Icon className={`h-4 w-4 ${tone === 'rose' ? 'text-[#F43F5E]' : 'text-[#d5aa52]'}`} />
      </div>
      <div className="mt-2 font-mono text-3xl tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[#b8c5c0]">{hint}</div>
    </div>
  );
}
