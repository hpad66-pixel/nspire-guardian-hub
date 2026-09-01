import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectPermit } from '@/hooks/useProjectPermits';
import {
  PERMIT_STATUS_LABEL,
  daysOpen,
  groupPermitsByPipelineBoard,
  isCityBlocked,
  nextPipelineAction,
  type ProjectPermitStatus,
} from '@/lib/permits/projectPermitStats';
import { cn } from '@/lib/utils';

const COLUMN_TONE: Record<string, string> = {
  open_active: 'border-amber-500/30 bg-amber-500/[0.06]',
  pending: 'border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/[0.06]',
  closed: 'border-emerald-500/30 bg-emerald-500/[0.06]',
  other: 'border-border bg-muted/30',
};

const COLUMN_HEAD: Record<string, string> = {
  open_active: 'text-amber-800',
  pending: 'text-[var(--apas-sapphire)]',
  closed: 'text-emerald-700',
  other: 'text-muted-foreground',
};

/**
 * Construction-level open-permits board — Open → Pending city → Closed.
 * Same status advances as the register list; built for at-a-glance chase.
 */
export function ProjectPermitsBoard({
  permits,
  onAdvance,
  busy,
}: {
  permits: ProjectPermit[];
  onAdvance: (permit: ProjectPermit, next: ProjectPermitStatus) => void;
  busy?: boolean;
}) {
  const columns = groupPermitsByPipelineBoard(permits);

  return (
    <div className="space-y-3" data-testid="project-permits-board">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Open permits board</h3>
          <p className="text-xs text-muted-foreground">
            Construction view — advance each card Open → City → Closed.
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((col) => (
          <section
            key={col.key}
            className={cn('rounded-2xl border p-3 shadow-sm', COLUMN_TONE[col.key] ?? COLUMN_TONE.other)}
          >
            <header className="mb-3 flex items-start justify-between gap-2 px-1">
              <div>
                <h4 className={cn('text-sm font-bold', COLUMN_HEAD[col.key])}>{col.label}</h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{col.description}</p>
              </div>
              <Badge variant="secondary" className="tabular-nums shrink-0">
                {col.permits.length}
              </Badge>
            </header>
            <div className="space-y-2.5 max-h-[34rem] overflow-y-auto pr-0.5">
              {col.permits.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background/60 px-3 py-8 text-center text-xs text-muted-foreground">
                  {col.key === 'closed' ? 'No closed permits yet' : 'Nothing in this lane'}
                </div>
              ) : (
                col.permits.map((p) => {
                  const advance = nextPipelineAction(p.status);
                  const age = daysOpen(p);
                  return (
                    <article
                      key={p.id}
                      className={cn(
                        'rounded-xl border bg-card p-3 shadow-sm',
                        isCityBlocked(p) && 'border-amber-500/45',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold">{p.permit_number}</span>
                        {isCityBlocked(p) && (
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-900">
                            Needs city
                          </Badge>
                        )}
                        {age != null && age > 30 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Clock3 className="h-3 w-3" />
                            {age}d
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold leading-snug">{p.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
                        {p.responsible_party && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <UserRound className="h-3 w-3" /> {p.responsible_party}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <p className="mt-2 line-clamp-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] text-foreground/80">
                          {p.notes}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {advance && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-[#0D3B30] text-white hover:bg-[#0D3B30]/90"
                            disabled={busy}
                            onClick={() => onAdvance(p, advance.next)}
                          >
                            <ArrowRight className="mr-1 h-3.5 w-3.5" />
                            {advance.actionLabel}
                          </Button>
                        )}
                        {p.status !== 'closed' && p.status !== 'pending' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busy}
                            onClick={() => onAdvance(p, 'closed')}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Closed
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {PERMIT_STATUS_LABEL[p.status] ?? p.status}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
