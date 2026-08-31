/**
 * Owner portal — Permit / compliance closeout view.
 * Client-visible project_permits only; readiness score + chase narrative.
 */
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useClientPortalProject, useOwnerPortalHref } from '@/components/portal/ClientPortalProjectContext';
import { useProjectPermits } from '@/hooks/useProjectPermits';
import {
  PERMIT_STATUS_LABEL,
  buildPermitComplianceBrief,
  groupByBuilding,
  isCityBlocked,
  permitReadiness,
} from '@/lib/permits/projectPermitStats';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  closed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  open_active: 'bg-amber-100 text-amber-900 border-amber-200',
  pending: 'bg-sky-100 text-sky-900 border-sky-200',
  expired: 'bg-rose-100 text-rose-800 border-rose-200',
  on_hold: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function OwnerPermitsPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId, projects } = useClientPortalProject();
  const projectName = projects.find((p) => p.id === projectId)?.name ?? 'Your project';
  const { data: permits = [], isLoading } = useProjectPermits(projectId, { clientVisibleOnly: true });
  const readiness = permitReadiness(permits);
  const buildings = groupByBuilding(permits);
  const open = permits.filter((p) => p.status !== 'closed');
  const brief = buildPermitComplianceBrief(permits, { projectName });

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6" data-testid="owner-permits-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to={href()} className="text-sm text-muted-foreground hover:underline">← Portal overview</Link>
          <h1 className="mt-2 font-display text-4xl font-medium text-[#082b23]">Permit compliance</h1>
          <p className="mt-1 text-muted-foreground">
            Live closeout status for {projectName}. APAS coordinates closure with the City — not just documentation.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Owner-visible register
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading compliance status…
        </div>
      ) : permits.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Permit compliance for this project will appear here once the register is published.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border border-[#0D3B30]/15 bg-gradient-to-br from-[#0D3B30] to-[#0f766e] p-6 text-white shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/90">Closeout readiness</p>
                <h2 className="mt-1 text-3xl font-bold">{readiness.label}</h2>
                <p className="mt-2 max-w-xl text-sm text-white/80">
                  {readiness.counts.closed} of {readiness.counts.total} permits closed.
                  {readiness.counts.pending > 0
                    ? ` ${readiness.counts.pending} waiting on City confirmation.`
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold tabular-nums">{readiness.percent}%</div>
                <div className="text-sm text-emerald-100">complete</div>
              </div>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-black/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-[#C4A35A]"
                style={{ width: `${Math.min(100, readiness.percent)}%` }}
              />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Closed', value: readiness.counts.closed, icon: CheckCircle2, className: 'text-emerald-700' },
              { label: 'Open · Active', value: readiness.counts.openActive, icon: ClipboardList, className: 'text-amber-700' },
              { label: 'Needs City', value: readiness.counts.blocked, icon: AlertTriangle, className: 'text-sky-700' },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-slate-200/80 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <kpi.icon className={cn('h-5 w-5', kpi.className)} />
                  <div>
                    <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {buildings.map((b) => (
              <span
                key={b.building}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                  b.open > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800',
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                {b.building}
                <span className="opacity-70">{b.open} open</span>
              </span>
            ))}
          </div>

          <Card className="border-sky-200/80 bg-sky-50/40 shadow-sm">
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-sky-900">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-semibold">This month&apos;s compliance story</h3>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{brief}</pre>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#082b23]">
              {open.length > 0 ? 'Open items requiring attention' : 'All permits closed'}
            </h3>
            {(open.length > 0 ? open : permits.slice(0, 6)).map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold">{p.permit_number}</span>
                  <Badge variant="outline" className={cn('font-semibold', STATUS_STYLE[p.status])}>
                    {PERMIT_STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                  {isCityBlocked(p) && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                      City confirmation
                    </Badge>
                  )}
                </div>
                <h4 className="mt-1.5 font-semibold text-[#082b23]">{p.description}</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {[p.building, p.street_address, p.department, p.contractor, p.responsible_party]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {p.notes && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{p.notes}</p>}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
