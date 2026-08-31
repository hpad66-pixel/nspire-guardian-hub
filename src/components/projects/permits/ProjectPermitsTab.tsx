import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileBadge2,
  Filter,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useProjectPermits, type ProjectPermit } from '@/hooks/useProjectPermits';
import {
  PERMIT_STATUS_LABEL,
  buildPermitComplianceBrief,
  groupByBuilding,
  groupOpenByOwner,
  isCityBlocked,
  permitReadiness,
} from '@/lib/permits/projectPermitStats';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  closed: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  open_active: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  pending: 'bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/30',
  expired: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  on_hold: 'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('font-semibold', STATUS_STYLE[status] ?? STATUS_STYLE.on_hold)}>
      {PERMIT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function ProjectPermitsTab({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName?: string | null;
}) {
  const { data: permits = [], isLoading, update } = useProjectPermits(projectId);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed' | 'blocked'>('all');

  const readiness = useMemo(() => permitReadiness(permits), [permits]);
  const buildings = useMemo(() => groupByBuilding(permits), [permits]);
  const owners = useMemo(() => groupOpenByOwner(permits), [permits]);
  const brief = useMemo(
    () => buildPermitComplianceBrief(permits, { projectName: projectName || 'Project' }),
    [permits, projectName],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permits.filter((p) => {
      if (statusFilter === 'closed' && p.status !== 'closed') return false;
      if (statusFilter === 'pending' && p.status !== 'pending') return false;
      if (statusFilter === 'open' && p.status !== 'open_active') return false;
      if (statusFilter === 'blocked' && !isCityBlocked(p)) return false;
      if (!q) return true;
      return [
        p.permit_number,
        p.description,
        p.building,
        p.contractor,
        p.department,
        p.trade,
        p.notes,
        p.responsible_party,
        p.street_address,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [permits, query, statusFilter]);

  async function markClosed(permit: ProjectPermit) {
    await update.mutateAsync({
      id: permit.id,
      status: 'closed',
      closed_on: new Date().toISOString().slice(0, 10),
      notes: permit.notes
        ? `${permit.notes} · Closed in Proj OS ${new Date().toLocaleDateString()}`
        : `Closed in Proj OS ${new Date().toLocaleDateString()}`,
    });
  }

  function copyBrief() {
    void navigator.clipboard.writeText(brief).then(() => toast.success('Compliance brief copied'));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading permit register…
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-permits-tab">
      {/* Hero readiness */}
      <section className="relative overflow-hidden rounded-2xl border border-[#0D3B30]/20 bg-gradient-to-br from-[#0D3B30] via-[#134e3a] to-[#0f766e] p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
              <ShieldCheck className="h-3.5 w-3.5" /> Permit command center
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Closeout readiness</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Coordinate closure with the City — not just a spreadsheet. Open items, city confirmations,
              and responsible parties in one living register.
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-5xl font-bold tabular-nums leading-none">{readiness.percent}%</div>
              <div className="mt-1 text-sm font-medium text-emerald-100">{readiness.label}</div>
              <div className="mt-1 text-xs text-white/70">
                {readiness.counts.closed} closed · {readiness.counts.openActive} open · {readiness.counts.pending} pending city
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-[var(--apas-accent,#C4A35A)] transition-all duration-700"
            style={{ width: `${Math.min(100, readiness.percent)}%` }}
          />
        </div>
      </section>

      {/* KPI chips */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Closed', value: readiness.counts.closed, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Open · Active', value: readiness.counts.openActive, icon: ClipboardList, tone: 'text-amber-700 bg-amber-500/10' },
          { label: 'Pending city', value: readiness.counts.pending, icon: AlertTriangle, tone: 'text-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/10' },
          { label: 'City / agency wait', value: readiness.counts.blocked, icon: FileBadge2, tone: 'text-rose-600 bg-rose-500/10' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <span className={cn('grid h-10 w-10 place-items-center rounded-xl', kpi.tone)}>
                <kpi.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
                <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Action by owner */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[var(--apas-sapphire)]" />
              <h3 className="font-semibold">Chase list by owner</h3>
            </div>
            {owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">All permits closed — ready for the closeout package.</p>
            ) : (
              <ul className="space-y-2">
                {owners.map((b) => (
                  <li key={b.key} className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{b.owner}</strong>
                      <Badge variant="secondary">{b.count} open</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {b.permits.map((p) => p.permit_number).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Buildings + AI brief */}
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold">By building / area</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {buildings.map((b) => (
                  <button
                    key={b.building}
                    type="button"
                    onClick={() => setQuery(b.building)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      b.open > 0
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800',
                    )}
                  >
                    {b.building}
                    <span className="ml-1.5 opacity-70">{b.open}/{b.total} open</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--apas-sapphire)]/20 bg-[var(--apas-sapphire)]/[0.04] shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />
                  <h3 className="font-semibold">Monthly compliance brief</h3>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={copyBrief}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-border/60 bg-background/80 p-3 text-[11px] leading-relaxed text-foreground/90 font-sans">
                {brief}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters + register */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search permit #, building, contractor, notes…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open · Active</SelectItem>
            <SelectItem value="pending">Pending city</SelectItem>
            <SelectItem value="blocked">City / agency wait</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No permits match this filter.
            </CardContent>
          </Card>
        ) : (
          filtered.map((p) => (
            <article
              key={p.id}
              className={cn(
                'rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
                isCityBlocked(p) ? 'border-amber-500/40' : 'border-border/70',
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">{p.permit_number}</span>
                    <StatusBadge status={p.status} />
                    {isCityBlocked(p) && (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-900">
                        Needs city
                      </Badge>
                    )}
                    {p.trade && <Badge variant="secondary">{p.trade}</Badge>}
                  </div>
                  <h4 className="text-base font-semibold leading-snug">{p.description}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {p.building && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {p.building}
                      </span>
                    )}
                    {p.street_address && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.street_address}
                      </span>
                    )}
                    {p.department && <span>{p.department}</span>}
                    {p.contractor && <span>{p.contractor}</span>}
                    {p.responsible_party && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <UserRound className="h-3 w-3" /> {p.responsible_party}
                      </span>
                    )}
                  </div>
                  {p.notes && (
                    <p className="text-sm text-foreground/80 bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
                      {p.notes}
                    </p>
                  )}
                </div>
                {p.status !== 'closed' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={update.isPending}
                    onClick={() => void markClosed(p)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark closed
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
