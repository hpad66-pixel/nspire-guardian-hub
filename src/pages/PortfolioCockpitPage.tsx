import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Gauge, Sparkles, Loader2, AlertTriangle, TrendingUp, DollarSign, ListChecks, Flame,
  Trophy, Medal, ChevronRight, ChevronDown as ChevronDownIcon, Network, ShieldAlert, CircleDot, Radar, ArrowRight, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioCockpit, type CockpitProject, type Rag } from '@/hooks/usePortfolioCockpit';
import { useWorkloadLeaderboard, type LeaderRow } from '@/hooks/useWorkloadLeaderboard';
import type { ProjectKind } from '@/lib/projectKind';
import { BAND_META } from '@/lib/envcompliance/complianceScore';

const money = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n).toLocaleString()}`;
};

const RAG: Record<Rag, { label: string; dot: string; text: string; bg: string; border: string; hex: string }> = {
  red:   { label: 'At risk',  dot: 'bg-[var(--apas-rose)]',    text: 'text-[var(--apas-rose)]',    bg: 'bg-[var(--apas-rose)]/8',    border: 'border-[var(--apas-rose)]/30',    hex: '#F43F5E' },
  amber: { label: 'Watch',    dot: 'bg-[var(--apas-amber)]',   text: 'text-[var(--apas-amber)]',   bg: 'bg-[var(--apas-amber)]/8',   border: 'border-[var(--apas-amber)]/30',   hex: '#F59E0B' },
  green: { label: 'On track', dot: 'bg-[var(--apas-emerald)]', text: 'text-[var(--apas-emerald)]', bg: 'bg-[var(--apas-emerald)]/8', border: 'border-[var(--apas-emerald)]/30', hex: '#10B981' },
};

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';

interface Briefing { summary: string; topRisks: any[]; recommendations: string[]; peopleInsights: { name: string; note: string }[] }

function KpiCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Icon className={cn('h-3.5 w-3.5', tone)} />{label}</div>
      <div className={cn('mt-1.5 text-2xl font-bold tracking-tight', tone)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function PortfolioCockpitPage() {
  const navigate = useNavigate();
  const { rows, totals, isLoading } = usePortfolioCockpit();
  const leaderboard = useWorkloadLeaderboard();

  const [kind, setKind] = useState<'all' | ProjectKind>('all');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [risk, setRisk] = useState<{ project: CockpitProject; risks: any[] } | null>(null);
  const [riskLoading, setRiskLoading] = useState<string | null>(null);

  const [ragFilter, setRagFilter] = useState<'all' | Rag>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const clientNames = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) { const n = (r.project as any).client?.name; if (n) s.add(n); }
    return [...s].sort();
  }, [rows]);

  const shown = useMemo(() => rows.filter((r) => {
    if (kind !== 'all' && r.kind !== kind) return false;
    if (ragFilter !== 'all' && r.rag !== ragFilter) return false;
    if (clientFilter !== 'all' && (r.project as any).client?.name !== clientFilter) return false;
    return true;
  }), [rows, kind, ragFilter, clientFilter]);

  // Hierarchy grouping for the risk tiles.
  const [groupTiles, setGroupTiles] = useState(true);
  const [collapsedProg, setCollapsedProg] = useState<Set<string>>(new Set());
  const visibleIds = useMemo(() => new Set(shown.map((r) => r.project.id)), [shown]);
  const childRows = (id: string) => shown.filter((r) => r.parentId === id);
  const rootRows = shown.filter((r) => !r.parentId || !visibleIds.has(r.parentId));
  const hasHierarchy = shown.some((r) => r.parentId && visibleIds.has(r.parentId));
  const toggleProg = (id: string) => setCollapsedProg((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const charts = useMemo(() => {
    const budgetVsBilled = [...shown].filter((r) => r.revisedBudget > 0).sort((a, b) => b.revisedBudget - a.revisedBudget).slice(0, 8)
      .map((r) => ({ name: r.project.name.length > 16 ? r.project.name.slice(0, 15) + '…' : r.project.name, Budget: r.revisedBudget, Billed: r.billed }));
    const openByProject = [...shown].filter((r) => r.openItems > 0).sort((a, b) => b.openItems - a.openItems).slice(0, 8)
      .map((r) => ({ name: r.project.name.length > 16 ? r.project.name.slice(0, 15) + '…' : r.project.name, open: r.openItems, overdue: r.overdueItems }));
    const rag = (['green', 'amber', 'red'] as Rag[]).map((k) => ({ name: RAG[k].label, value: shown.filter((r) => r.rag === k).length, fill: RAG[k].hex })).filter((d) => d.value > 0);
    return { budgetVsBilled, openByProject, rag };
  }, [shown]);

  const attention = shown.filter((r) => r.rag !== 'green').slice(0, 10);

  const generateBriefing = async () => {
    setBriefingLoading(true);
    try {
      const payload = {
        portfolio: {
          totals,
          projects: shown.map((r) => ({ name: r.project.name, kind: r.kind, status: r.project.status, rag: r.rag, revisedBudget: r.revisedBudget, billed: r.billed, openItems: r.openItems, overdueItems: r.overdueItems, flags: r.flags })),
        },
        people: leaderboard.rows.map((p) => ({ name: p.name, open: p.open, overdue: p.overdue, completed: p.completed, onTimePct: p.onTimePct })),
      };
      const { data, error } = await supabase.functions.invoke('portfolio-briefing', { body: payload });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || 'Briefing failed');
      setBriefing(data as Briefing);
    } catch (e) { toast.error(`Couldn't generate briefing: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setBriefingLoading(false); }
  };

  const runRisk = async (r: CockpitProject) => {
    setRiskLoading(r.project.id);
    try {
      const { data, error } = await supabase.functions.invoke('risk-radar', { body: { projectId: r.project.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || 'Risk radar failed');
      setRisk({ project: r, risks: (data as any)?.risks ?? [] });
    } catch (e) { toast.error(`Couldn't run risk radar: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setRiskLoading(null); }
  };

  // A single project risk tile.
  const Tile = (r: CockpitProject) => (
    <div key={r.project.id} className={cn('rounded-xl border p-3.5 transition-all hover:shadow-md', RAG[r.rag].border)}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => navigate(`/projects/${r.project.id}`)} className="min-w-0 text-left group">
          <div className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-full shrink-0', RAG[r.rag].dot)} /><span className="font-semibold truncate group-hover:underline">{r.project.name}</span></div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{r.kind} · {r.project.status}</div>
        </button>
        <span className={cn('text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border shrink-0', RAG[r.rag].text, RAG[r.rag].border)}>{RAG[r.rag].label}</span>
      </div>
      {r.revisedBudget > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>{money(r.billed)} billed</span><span>{money(r.revisedBudget)}</span></div>
          <Progress value={Math.min(100, r.billedPct)} className="h-1.5" />
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className={cn('flex items-center gap-1', r.overdueItems ? 'text-[var(--apas-rose)] font-semibold' : 'text-muted-foreground')}><AlertTriangle className="h-3.5 w-3.5" />{r.overdueItems} overdue</span>
        <span className="flex items-center gap-1 text-muted-foreground"><ListChecks className="h-3.5 w-3.5" />{r.openItems} open</span>
        {r.compliance.hasData && <span className="flex items-center gap-1 font-medium" style={{ color: BAND_META[r.compliance.band].color }} title={`Compliance: ${BAND_META[r.compliance.band].label}`}><Gauge className="h-3.5 w-3.5" />{r.compliance.score}</span>}
      </div>
      {r.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">{r.flags.slice(0, 3).map((f, i) => <span key={i} className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">{f}</span>)}</div>
      )}
      <Button size="sm" variant="outline" className="mt-3 h-7 w-full gap-1.5 text-xs" onClick={() => runRisk(r)} disabled={riskLoading === r.project.id}>
        {riskLoading === r.project.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}AI risk radar
      </Button>
    </div>
  );

  // A program with subprojects: rolled-up header + expandable children.
  const ProgramTile = (r: CockpitProject) => {
    const kids = childRows(r.project.id);
    const leaves = kids.filter((k) => childRows(k.project.id).length === 0);
    const subs = kids.filter((k) => childRows(k.project.id).length > 0);
    const collapsed = collapsedProg.has(r.project.id);
    const pct = r.rolledBudget > 0 ? Math.round((r.rolledBilled / r.rolledBudget) * 100) : 0;
    return (
      <div key={r.project.id} className={cn('rounded-xl border bg-muted/20', RAG[r.rolledRag].border)}>
        <div className="flex items-center gap-2.5 p-3">
          <button onClick={() => toggleProg(r.project.id)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted shrink-0">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}</button>
          <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', RAG[r.rolledRag].dot)} />
          <button onClick={() => navigate(`/projects/${r.project.id}`)} className="min-w-0 text-left group">
            <div className="flex items-center gap-2"><span className="font-semibold truncate group-hover:underline">{r.project.name}</span><span className="text-[10px] font-bold uppercase rounded-full bg-secondary px-1.5 py-0.5 text-secondary-foreground">Program</span></div>
            <div className="text-[11px] text-muted-foreground">{kids.length} subproject{kids.length !== 1 ? 's' : ''} · {r.rolledOverdue} overdue</div>
          </button>
          <div className="ml-auto hidden sm:block w-40 shrink-0">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5"><span>{money(r.rolledBilled)}</span><span>{money(r.rolledBudget)}</span></div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>
        {!collapsed && (
          <div className="px-3 pb-3 pl-6 ml-4 border-l-2 border-border/60 space-y-3">
            {leaves.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{leaves.map(Tile)}</div>}
            {subs.map(ProgramTile)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"><Gauge className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Portfolio Cockpit</h1>
            <p className="mt-1 text-muted-foreground">Every project, every risk, every teammate — in one glance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="single" value={kind} onValueChange={(v) => v && setKind(v as any)} className="border rounded-lg p-0.5 bg-muted/30">
            <ToggleGroupItem value="all" className="h-8 px-3 text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="construction" className="h-8 px-3 text-xs">Construction</ToggleGroupItem>
            <ToggleGroupItem value="consulting" className="h-8 px-3 text-xs">Consulting</ToggleGroupItem>
          </ToggleGroup>
          <Select value={ragFilter} onValueChange={(v) => setRagFilter(v as any)}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All health</SelectItem>
              <SelectItem value="red">At risk</SelectItem>
              <SelectItem value="amber">Watch</SelectItem>
              <SelectItem value="green">On track</SelectItem>
            </SelectContent>
          </Select>
          {clientNames.length > 0 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clientNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={generateBriefing} disabled={briefingLoading || isLoading} className="gap-1.5">
            {briefingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}AI briefing
          </Button>
        </div>
      </div>

      {/* Attention rail */}
      {attention.length > 0 && (
        <div className="rounded-xl border border-[var(--apas-rose)]/25 bg-[var(--apas-rose)]/[0.04] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--apas-rose)]"><Flame className="h-3.5 w-3.5" />Needs attention</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attention.map((r) => (
              <button key={r.project.id} onClick={() => navigate(`/projects/${r.project.id}`)}
                className={cn('group shrink-0 w-60 text-left rounded-lg border p-3 transition-all hover:shadow-md hover:-translate-y-0.5', RAG[r.rag].bg, RAG[r.rag].border)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0"><span className={cn('h-2 w-2 rounded-full shrink-0', RAG[r.rag].dot)} /><span className="font-semibold text-sm truncate">{r.project.name}</span></div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.flags.slice(0, 3).map((f, i) => <span key={i} className={cn('text-[10px] font-medium rounded-full px-1.5 py-0.5 border', RAG[r.rag].text, RAG[r.rag].border)}>{f}</span>)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI briefing */}
      {briefing && (
        <div className="rounded-xl border bg-gradient-to-br from-[var(--apas-sapphire)]/[0.05] to-transparent p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />Portfolio briefing</div>
          {briefing.summary && <p className="text-sm leading-relaxed text-foreground/90">{briefing.summary}</p>}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {briefing.topRisks?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Top risks</div>
                <ul className="space-y-1.5">
                  {briefing.topRisks.map((t: any, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', t.severity === 'high' ? 'bg-[var(--apas-rose)]' : t.severity === 'medium' ? 'bg-[var(--apas-amber)]' : 'bg-muted-foreground')} />
                      <span><span className="font-medium">{t.project ? `${t.project}: ` : ''}{t.title}</span>{t.action ? <span className="text-muted-foreground"> — {t.action}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {briefing.recommendations?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Recommended this week</div>
                <ul className="space-y-1.5">
                  {briefing.recommendations.map((rec, i) => <li key={i} className="text-sm flex items-start gap-1.5"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--apas-sapphire)]" />{rec}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Radar className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Trophy className="h-4 w-4" />Team</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={ListChecks} label="Active projects" value={String(totals.projects)} sub={`${totals.construction} construction · ${totals.consulting} consulting`} />
            <KpiCard icon={ShieldAlert} label="At risk" value={String(totals.atRisk)} sub={`${totals.watch} on watch`} tone={totals.atRisk ? 'text-[var(--apas-rose)]' : undefined} />
            <KpiCard icon={AlertTriangle} label="Overdue items" value={String(totals.overdueItems)} sub={`${totals.openItems} open total`} tone={totals.overdueItems ? 'text-[var(--apas-amber)]' : undefined} />
            <KpiCard icon={DollarSign} label="Contract value" value={money(totals.contractValue)} sub={`${money(totals.billed)} billed`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 lg:col-span-2">
              <div className="mb-3 text-sm font-semibold">Budget vs billed</div>
              {charts.budgetVsBilled.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={charts.budgetVsBilled} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={44} />
                    <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={(v) => money(v)} />
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Bar dataKey="Budget" fill="#C4A35A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Billed" fill="#1D6FE8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Portfolio health</div>
              {charts.rag.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={charts.rag} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                      {charts.rag.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty />}
              <div className="mt-1 flex justify-center gap-3 text-xs">
                {charts.rag.map((d) => <span key={d.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />{d.name} {d.value}</span>)}
              </div>
            </div>
          </div>

          {/* Risk tiles */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Projects <span className="font-normal text-muted-foreground">· sorted by attention</span></div>
              {shown.length > 0 && (
                <Button variant={groupTiles ? 'default' : 'outline'} size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setGroupTiles((v) => !v)} title={hasHierarchy ? 'Group subprojects under their program' : 'Groups subprojects under their program once you add some'}>
                  <Network className="h-3.5 w-3.5" />Group by program
                </Button>
              )}
            </div>
            {isLoading ? <Empty label="Loading projects…" /> : shown.length === 0 ? <Empty label="No projects in this view." /> : (
              groupTiles ? (
                <div className="space-y-3">
                  {rootRows.filter((r) => childRows(r.project.id).length > 0).map(ProgramTile)}
                  {rootRows.filter((r) => childRows(r.project.id).length === 0).length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rootRows.filter((r) => childRows(r.project.id).length === 0).map(Tile)}</div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map(Tile)}</div>
              )
            )}
          </div>
        </TabsContent>

        {/* ── TEAM ── */}
        <TabsContent value="team" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Users} label="People with work" value={String(leaderboard.totals.people)} />
            <KpiCard icon={ListChecks} label="Open items" value={String(leaderboard.totals.open)} />
            <KpiCard icon={AlertTriangle} label="Overdue" value={String(leaderboard.totals.overdue)} tone={leaderboard.totals.overdue ? 'text-[var(--apas-rose)]' : undefined} />
            <KpiCard icon={CircleDot} label="Completed (90d)" value={String(leaderboard.totals.completed)} tone="text-[var(--apas-emerald)]" />
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-4 py-3 flex items-center gap-1.5 text-sm font-semibold"><Trophy className="h-4 w-4 text-[var(--accent)]" />Leaderboard <span className="font-normal text-muted-foreground">· last 90 days</span></div>
            {leaderboard.isLoading ? <Empty label="Loading team…" /> : leaderboard.rows.length === 0 ? <Empty label="No assigned work yet." /> : (
              <div className="divide-y">
                {leaderboard.rows.map((p) => <LeaderRowView key={p.userId} p={p} maxLoad={Math.max(1, ...leaderboard.rows.map((x) => x.open))} note={briefing?.peopleInsights?.find((n) => n.name === p.name)?.note} />)}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Points = completed × 10 + on-time × 5 − overdue × 3. Click <span className="font-medium text-foreground">AI briefing</span> above to add a per-person read.</p>
        </TabsContent>
      </Tabs>

      {/* Risk radar dialog */}
      <Dialog open={!!risk} onOpenChange={(o) => !o && setRisk(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Radar className="h-5 w-5 text-[var(--apas-sapphire)]" />Risk radar · {risk?.project.project.name}</DialogTitle>
            <DialogDescription>AI-analyzed risks from RFIs, submittals, punch, change orders, and daily logs.</DialogDescription>
          </DialogHeader>
          {risk && (risk.risks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No significant risks detected. 🎉</div>
          ) : (
            <div className="space-y-2.5">
              {risk.risks.map((rk: any, i: number) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-bold uppercase rounded-full px-2 py-0.5', rk.severity === 'high' ? 'bg-[var(--apas-rose)]/10 text-[var(--apas-rose)]' : rk.severity === 'medium' ? 'bg-[var(--apas-amber)]/10 text-[var(--apas-amber)]' : 'bg-muted text-muted-foreground')}>{rk.severity}</span>
                    {rk.area && <span className="text-[11px] text-muted-foreground">{rk.area}</span>}
                  </div>
                  <div className="mt-1 text-sm font-medium">{rk.title}</div>
                  {rk.detail && <div className="mt-0.5 text-xs text-muted-foreground">{rk.detail}</div>}
                  {rk.action && <div className="mt-1.5 text-xs flex items-start gap-1"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--apas-sapphire)]" />{rk.action}</div>}
                </div>
              ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ label = 'Nothing to show yet.' }: { label?: string }) {
  return <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{label}</div>;
}

function LeaderRowView({ p, maxLoad, note }: { p: LeaderRow; maxLoad: number; note?: string }) {
  const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : null;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 text-center shrink-0">{medal ? <span className="text-xl">{medal}</span> : <span className="text-sm font-semibold text-muted-foreground">{p.rank}</span>}</div>
      <Avatar className="h-9 w-9 shrink-0">
        {p.profile?.avatar_url && <AvatarImage src={p.profile.avatar_url} />}
        <AvatarFallback className="text-xs">{initials(p.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{p.name}</span>
          {p.rank <= 3 && <span className="text-[10px] font-bold uppercase rounded-full bg-[var(--accent)]/15 text-accent-foreground px-1.5 py-0.5">{p.points} pts</span>}
          {p.onTimePct != null && <span className={cn('text-[10px] rounded-full px-1.5 py-0.5', p.onTimePct >= 80 ? 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)]' : 'bg-muted text-muted-foreground')}>{p.onTimePct}% on-time</span>}
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-[var(--apas-emerald)]" />{p.completed} done</span>
          <span>{p.open} open</span>
          {p.overdue > 0 && <span className="text-[var(--apas-rose)] font-medium">{p.overdue} overdue</span>}
        </div>
        {note && <div className="mt-1 text-[11px] italic text-muted-foreground">“{note}”</div>}
        <div className="mt-1.5 h-1.5 w-full max-w-[240px] rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-[var(--apas-sapphire)]/60" style={{ width: `${(p.open / maxLoad) * 100}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0"><div className="text-lg font-bold tabular-nums">{p.points}</div><div className="text-[10px] uppercase text-muted-foreground">points</div></div>
    </div>
  );
}
