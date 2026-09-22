import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  LockKeyhole,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { assessProjectLifecycle } from '@/lib/projects/businessLifecycle';

type LifecyclePanelProject = Parameters<typeof assessProjectLifecycle>[0];

export function ProjectLifecyclePanel({
  project,
  teamCount,
  className,
}: {
  project: LifecyclePanelProject;
  teamCount: number;
  className?: string;
}) {
  const lifecycle = assessProjectLifecycle(project);
  const KindIcon = lifecycle.kind === 'consulting' ? Briefcase : Building2;
  const lockClass = {
    protected: 'border-amber-300 bg-amber-50 text-amber-950',
    locked: 'border-slate-300 bg-slate-50 text-slate-700',
    open: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  }[lifecycle.lockTone];

  return (
    <section className={cn('rounded-2xl border border-border/70 bg-card p-4 shadow-sm', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 text-primary">
              <KindIcon className="h-3 w-3" />
              {lifecycle.packageLabel}
            </Badge>
            <Badge variant="outline" className={cn('gap-1', lockClass)}>
              {lifecycle.lockTone === 'open' ? <CheckCircle2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
              {lifecycle.lockLabel}
            </Badge>
          </div>
          <h2 className="mt-3 font-display text-xl font-bold tracking-tight">{lifecycle.stageLabel}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {lifecycle.nextAction}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <Link to={lifecycle.nextActionHref}>
            Continue lifecycle <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Money control
          </div>
          <p className="mt-2 text-sm font-semibold">{lifecycle.moneyLabel}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Team readiness
          </div>
          <p className="mt-2 text-sm font-semibold">
            {teamCount > 0 ? `${teamCount} team member${teamCount === 1 ? '' : 's'} attached` : lifecycle.teamLabel}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            Schedule control
          </div>
          <p className="mt-2 text-sm font-semibold">{lifecycle.scheduleLabel}</p>
        </div>
      </div>

      {lifecycle.warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-amber-950">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">Lifecycle guardrails</p>
              <ul className="mt-1 space-y-1 text-xs leading-relaxed">
                {lifecycle.warnings.map((warning) => (
                  <li key={warning}>- {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {lifecycle.protectedHistorical && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            This project remains available for reporting and audit, but future lifecycle templates must not rewrite
            finalized pay apps, change orders, vendor balances, retainage, or closeout records.
          </p>
        </div>
      )}
    </section>
  );
}
