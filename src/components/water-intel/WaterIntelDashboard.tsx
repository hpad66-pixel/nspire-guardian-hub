import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  Droplets,
  Gauge,
  Loader2,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billSpend, computeEfficiencyAnalytics, gallons, money, n, pct } from '@/lib/water-intel';
import type { InsightSeverity } from '@/lib/water-intel';
import {
  useWaterIntelligence,
  type WaterIntelScope,
} from '@/hooks/useWaterIntelligence';
import {
  filterWaterBills,
  findWaterDataGaps,
  resolveWaterPeriod,
  summarizeWaterPeriod,
  type WaterPeriodPreset,
} from '@/lib/water-intel/period';
import { auditWaterIntel } from '@/lib/water-intel/qa';
import { WaterIntelBillLedger } from './WaterIntelBillLedger';
import { WaterIntelCharts } from './WaterIntelCharts';
import { WaterIntelChat } from './WaterIntelChat';
import { WaterIntelNotes } from './WaterIntelNotes';
import { WaterIntelQaBanner } from './WaterIntelQaBanner';
import { WaterIntelUpload } from './WaterIntelUpload';
import { WaterEfficiencyPanel } from './WaterEfficiencyPanel';
import { WaterMeterPerformance } from './WaterMeterPerformance';
import { WaterDataReadiness } from './WaterDataReadiness';
import { WaterPeriodFilter } from './WaterPeriodFilter';
import { WaterGlossary, WaterTerm } from './WaterTerm';

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
  mode: 'staff' | 'magic' | 'property_manager';
}) {
  const intel = useWaterIntelligence(scope);
  const [chatOpen, setChatOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<WaterPeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodSelection = useMemo(
    () => resolveWaterPeriod(intel.bills, periodPreset, customStart, customEnd),
    [customEnd, customStart, intel.bills, periodPreset],
  );
  const periodBills = useMemo(
    () => filterWaterBills(intel.bills, periodSelection),
    [intel.bills, periodSelection],
  );

  const filteredBills = useMemo(() => {
    if (accountFilter === 'all') return periodBills;
    return periodBills.filter((b) => b.account_id === accountFilter);
  }, [periodBills, accountFilter]);

  const periodSummary = useMemo(() => summarizeWaterPeriod(filteredBills), [filteredBills]);
  const dataGaps = useMemo(() => findWaterDataGaps(intel.accounts, intel.bills), [intel.accounts, intel.bills]);
  const periodRollups = useMemo(() => intel.rollups.map((rollup) => {
    const accountBills = periodBills.filter((bill) => bill.account_id === rollup.accountId);
    return {
      ...rollup,
      last12Spend: accountBills.reduce((sum, bill) => sum + billSpend(bill), 0),
      last12Gallons: accountBills.reduce((sum, bill) => sum + n(bill.consumption_gallons), 0),
    };
  }), [intel.rollups, periodBills]);

  const viewEfficiency = useMemo(() => {
    if (accountFilter === 'all') return intel.efficiency;
    const selected = intel.accounts.filter((account) => account.id === accountFilter);
    const account = selected[0];
    return computeEfficiencyAnalytics(selected, intel.bills.filter((bill) => bill.account_id === accountFilter), {
      totalUnits: account?.connected_units ?? 0,
      occupiedUnits: account?.occupied_units ?? 0,
    });
  }, [accountFilter, intel.accounts, intel.bills, intel.efficiency]);

  const qa = useMemo(() => auditWaterIntel(intel.accounts, intel.bills), [intel.accounts, intel.bills]);

  function changePeriodPreset(next: WaterPeriodPreset) {
    if (next === 'custom' && (!customStart || !customEnd)) {
      const all = resolveWaterPeriod(intel.bills, 'all');
      setCustomStart(all.start ?? '');
      setCustomEnd(all.end ?? '');
    }
    setPeriodPreset(next);
  }

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

  const { kpis, rollups, insights, meta, accounts, notes, bills, efficiency } = intel;
  const propertyName = meta?.property_name ?? 'Property';
  const guest = mode === 'magic';
  const canUpload = mode !== 'magic';
  const deltaUp = (kpis.ytdDeltaPct ?? 0) > 0;

  if (mode === 'property_manager') {
    return (
      <div className="space-y-5 pb-16" data-testid="water-property-manager-dashboard">
        <header className="overflow-hidden rounded-[28px] bg-[#08271f] px-6 py-8 text-white shadow-xl md:px-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5aa52]">Water statements · property operations</div>
          <h1 className="mt-2 font-display text-4xl font-medium md:text-5xl">{propertyName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#b8c5c0]">Keep the water record current by uploading each monthly statement. Proj OS handles extraction and matching; administrators control analytical settings.</p>
        </header>
        <WaterDataReadiness gaps={dataGaps} simple />
        {meta?.property_id && <WaterIntelUpload propertyId={meta.property_id} accounts={accounts} />}
        <WaterPeriodFilter
          preset={periodPreset}
          selection={periodSelection}
          summary={periodSummary}
          onPresetChange={changePeriodPreset}
          onCustomChange={(start, end) => { setCustomStart(start); setCustomEnd(end); }}
          compact
        />
        <WaterIntelCharts bills={periodBills} rollups={periodRollups} simple />
        <WaterGlossary compact />
        <section className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Recent source records</div>
          <h2 className="mt-1 font-display text-2xl text-[#08271f]">Latest uploads</h2>
          <div className="mt-4 divide-y divide-[#ece9e0]">{bills.slice(0, 8).map((bill) => { const account = accounts.find((row) => row.id === bill.account_id); return <div key={bill.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#08271f]">{account?.building_label || account?.service_address || 'Service account'}</p><p className="text-xs text-[#8a8478]">{bill.bill_period_start} · {bill.document_name || 'Ledger record'}</p></div><span className="font-mono text-[#08271f]">{gallons(bill.consumption_gallons)}</span></div>; })}</div>
          {!bills.length && <p className="mt-4 text-sm text-[#8a8478]">No statements uploaded yet.</p>}
        </section>
      </div>
    );
  }

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

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
          <Kpi
            label="Normalized avoided cost"
            value={efficiency.avoidedCost == null ? '—' : money(efficiency.avoidedCost)}
            hint={`${efficiency.status} · excludes estimated reads`}
            icon={CircleDollarSign}
            tone={(efficiency.avoidedCost ?? 0) < 0 ? 'rose' : 'gold'}
          />
        </div>
      </header>

      <WaterIntelQaBanner report={qa} />

      {canUpload && meta?.property_id && (
        <WaterIntelUpload propertyId={meta.property_id} accounts={accounts} />
      )}

      {!guest && <WaterDataReadiness gaps={dataGaps} />}

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

      <WaterPeriodFilter
        preset={periodPreset}
        selection={periodSelection}
        summary={periodSummary}
        onPresetChange={changePeriodPreset}
        onCustomChange={(start, end) => { setCustomStart(start); setCustomEnd(end); }}
      />

      <WaterEfficiencyPanel analytics={viewEfficiency} />

      <WaterMeterPerformance
        propertyId={meta?.property_id ?? null}
        accounts={accounts}
        meters={viewEfficiency.meters}
        canManage={mode === 'staff'}
      />

      <WaterIntelCharts bills={filteredBills} rollups={accountFilter === 'all' ? periodRollups : periodRollups.filter((r) => r.accountId === accountFilter)} />

      <WaterIntelBillLedger bills={filteredBills} accounts={accounts} />

      <WaterIntelNotes
        scope={scope}
        notes={notes}
        accounts={accounts}
        rollups={rollups}
        propertyName={propertyName}
        guest={guest}
      />

      <WaterGlossary />

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
        {label === 'YTD spend' ? <WaterTerm term="ytd" className="text-[#b8c5c0]">YTD spend</WaterTerm> : label === 'Trailing 12 months' ? <WaterTerm term="t12" className="text-[#b8c5c0]">Trailing 12 months</WaterTerm> : label}
        <Icon className={`h-4 w-4 ${tone === 'rose' ? 'text-[#F43F5E]' : 'text-[#d5aa52]'}`} />
      </div>
      <div className="mt-2 font-mono text-3xl tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[#b8c5c0]">{hint}</div>
    </div>
  );
}
