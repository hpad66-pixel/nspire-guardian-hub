import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, DollarSign, Zap, Hash, TrendingUp, Globe, Building2 } from 'lucide-react';
import { useAiUsage, type UsageRange, type AiUsageEvent } from '@/hooks/useAiUsage';
import { MODEL_PRICING, MODEL_ORDER, modelLabel, modelColor, skillLabel, fmtUsd, fmtTokens } from '@/lib/ai/pricing';
import { cn } from '@/lib/utils';

const RANGES: { value: UsageRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' }, { value: 'all', label: 'All time' },
];

const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const shortDay = (k: string) => { const [, m, d] = k.split('-'); return `${m}/${d}`; };

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AiUsageAnalyticsPage() {
  const [range, setRange] = useState<UsageRange>('30d');
  const { events, isLoading, isSuperAdmin, projectNames, tenantNames } = useAiUsage(range);

  const agg = useMemo(() => {
    const sum = (e: AiUsageEvent[], f: (x: AiUsageEvent) => number) => e.reduce((a, x) => a + f(x), 0);
    const totalCost = sum(events, (e) => Number(e.cost_usd) || 0);
    const totalIn = sum(events, (e) => e.input_tokens || 0);
    const totalOut = sum(events, (e) => e.output_tokens || 0);
    const calls = events.length;

    const bucket = <K extends string>(key: (e: AiUsageEvent) => K) => {
      const m = new Map<K, { cost: number; calls: number; inTok: number; outTok: number }>();
      for (const e of events) {
        const k = key(e);
        const cur = m.get(k) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
        cur.cost += Number(e.cost_usd) || 0; cur.calls += 1; cur.inTok += e.input_tokens || 0; cur.outTok += e.output_tokens || 0;
        m.set(k, cur);
      }
      return m;
    };

    const byModel = [...bucket((e) => e.model).entries()].map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => MODEL_ORDER.indexOf(a.model) - MODEL_ORDER.indexOf(b.model));
    const bySkill = [...bucket((e) => e.skill).entries()].map(([skill, v]) => ({ skill, ...v })).sort((a, b) => b.cost - a.cost);
    const byProject = [...bucket((e) => e.project_id ?? '—').entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.cost - a.cost);
    const byTenant = [...bucket((e) => e.tenant_id ?? '—').entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.cost - a.cost);

    const dayMap = bucket((e) => dayKey(e.created_at) as string);
    const daily = [...dayMap.entries()].map(([k, v]) => ({ day: k, cost: v.cost })).sort((a, b) => (a.day < b.day ? -1 : 1)).map((d) => ({ ...d, label: shortDay(d.day) }));

    return { totalCost, totalIn, totalOut, calls, byModel, bySkill, byProject, byTenant, daily };
  }, [events]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"><Sparkles className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">AI Usage & Cost</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              {isSuperAdmin ? <><Globe className="h-4 w-4 text-[var(--apas-sapphire)]" /> Platform-wide — every workspace</> : <><Building2 className="h-4 w-4" /> Your workspace only</>}
            </p>
          </div>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as UsageRange)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total cost" value={fmtUsd(agg.totalCost)} sub={`${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`} />
        <StatCard icon={Hash} label="AI calls" value={agg.calls.toLocaleString()} sub={agg.calls ? `${fmtUsd(agg.totalCost / agg.calls)} avg / call` : undefined} />
        <StatCard icon={Zap} label="Input tokens" value={fmtTokens(agg.totalIn)} />
        <StatCard icon={TrendingUp} label="Output tokens" value={fmtTokens(agg.totalOut)} />
      </div>

      {isLoading ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">Loading usage…</div>
      ) : agg.calls === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <div className="text-sm font-medium">No AI usage recorded in this window yet.</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Usage accrues automatically as AI features run (meeting extraction, agendas, proposals, the assistant, and more). Check back after some AI activity, or widen the range. The pricing reference below is available now.</p>
        </div>
      ) : (
        <>
          {/* Daily cost area */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Daily cost</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={agg.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs><linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1D6FE8" stopOpacity={0.35} /><stop offset="100%" stopColor="#1D6FE8" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => fmtUsd(v)} />
                <Tooltip formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']} labelFormatter={(l) => `Day ${l}`} />
                <Area type="monotone" dataKey="cost" stroke="#1D6FE8" strokeWidth={2} fill="url(#costFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Cost by model */}
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Cost by model</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agg.byModel.map((m) => ({ ...m, name: modelLabel(m.model) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => fmtUsd(v)} />
                  <Tooltip formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>{agg.byModel.map((m) => <Cell key={m.model} fill={modelColor(m.model)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost by feature */}
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Cost by feature</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={agg.bySkill.slice(0, 8).map((s) => ({ ...s, name: skillLabel(s.skill) }))} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000010" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtUsd(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]} fill="#C4A35A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By client/workspace (super admin cross-tenant) */}
          {isSuperAdmin && agg.byTenant.length > 1 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b px-4 py-3 text-sm font-semibold">Cost by client / workspace</div>
              <UsageTable rows={agg.byTenant.map((t) => ({ label: tenantNames[t.id] || (t.id === '—' ? 'Unattributed' : t.id.slice(0, 8)), ...t }))} />
            </div>
          )}

          {/* By project */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-4 py-3 text-sm font-semibold">Cost by project</div>
            <UsageTable rows={agg.byProject.slice(0, 25).map((p) => ({ label: projectNames[p.id] || (p.id === '—' ? 'No project' : p.id.slice(0, 8)), ...p }))} />
          </div>
        </>
      )}

      {/* Pricing reference */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">Model pricing reference <span className="font-normal text-muted-foreground">· USD per 1M tokens</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
              <th className="px-4 py-2 font-medium">Model</th><th className="px-4 py-2 font-medium text-right">Input</th><th className="px-4 py-2 font-medium text-right">Output</th><th className="px-4 py-2 font-medium text-right">Cache read</th><th className="px-4 py-2 font-medium text-right">Cache write</th>
            </tr></thead>
            <tbody>
              {MODEL_ORDER.map((m) => { const p = MODEL_PRICING[m]; return (
                <tr key={m} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium"><span className="inline-block h-2 w-2 rounded-full mr-2 align-middle" style={{ background: modelColor(m) }} />{modelLabel(m)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">${p.in.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">${p.out.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">${p.cacheRead.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">${p.cacheWrite.toFixed(2)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 text-xs text-muted-foreground border-t">Set which model each feature uses in <span className="font-medium text-foreground">Settings → AI Skills</span>. Opus is highest quality and cost; Haiku is cheapest.</div>
      </div>
    </div>
  );
}

function UsageTable({ rows }: { rows: Array<{ label: string; cost: number; calls: number; inTok: number; outTok: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.cost));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
          <th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium text-right">Calls</th><th className="px-4 py-2 font-medium text-right">In</th><th className="px-4 py-2 font-medium text-right">Out</th><th className="px-4 py-2 font-medium text-right">Cost</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-2 max-w-[280px] truncate">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 rounded bg-[var(--apas-sapphire)]/8" style={{ width: `${(r.cost / max) * 100}%` }} />
                  <span className="relative font-medium">{r.label}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.calls.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{fmtTokens(r.inTok)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{fmtTokens(r.outTok)}</td>
              <td className={cn('px-4 py-2 text-right tabular-nums font-semibold')}>{fmtUsd(r.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
