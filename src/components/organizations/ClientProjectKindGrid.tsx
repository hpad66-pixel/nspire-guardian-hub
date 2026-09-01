import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, HardHat, Lightbulb } from 'lucide-react';
import { ProjectKindBadge } from '@/components/projects/ProjectKindBadge';
import { useAllApprovedProposalTotals } from '@/hooks/useAllApprovedProposalTotals';
import type { Project } from '@/hooks/useProjects';
import {
  groupProjectsByKind,
  projectKind,
  projectKindTileClass,
  type ProjectKind,
} from '@/lib/projectKind';
import { resolveProjectTileAmounts } from '@/lib/projectTileAmounts';
import { cn } from '@/lib/utils';

/** Status chips on blue (consulting) tiles — light on dark. */
const STATUS_ON_BLUE: Record<string, string> = {
  planning: 'bg-white/15 text-white border-white/25',
  active: 'bg-emerald-300/25 text-emerald-50 border-emerald-200/40',
  on_hold: 'bg-amber-300/25 text-amber-50 border-amber-200/40',
  completed: 'bg-white/10 text-white/80 border-white/20',
  closed: 'bg-white/10 text-white/80 border-white/20',
};

/** Status chips on ivory (construction) tiles — dark on light. */
const STATUS_ON_IVORY: Record<string, string> = {
  planning: 'bg-[var(--kind-construction-ink)]/8 text-[var(--kind-construction-ink)] border-[var(--kind-construction-ink)]/15',
  active: 'bg-[var(--kind-consulting)]/12 text-[var(--kind-consulting)] border-[var(--kind-consulting)]/25',
  on_hold: 'bg-amber-900/10 text-amber-950 border-amber-900/20',
  completed: 'bg-[var(--kind-construction-ink)]/6 text-[var(--kind-construction-ink)]/80 border-[var(--kind-construction-ink)]/12',
  closed: 'bg-[var(--kind-construction-ink)]/6 text-[var(--kind-construction-ink)]/80 border-[var(--kind-construction-ink)]/12',
};

function formatCurrency(amount: number) {
  if (!amount) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function KindSectionHeader({
  kind,
  count,
}: {
  kind: ProjectKind;
  count: number;
}) {
  const isConsulting = kind === 'consulting';
  const Icon = isConsulting ? Lightbulb : HardHat;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3',
        isConsulting
          ? 'border-[rgba(30,69,112,0.35)] bg-[var(--kind-consulting)] text-[var(--kind-consulting-ink)] shadow-[0_8px_22px_rgba(30,69,112,0.14)]'
          : 'border-[var(--kind-construction-border)] bg-[var(--kind-construction)] text-[var(--kind-construction-ink)] shadow-[0_8px_22px_rgba(26,23,20,0.05)]',
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
          isConsulting
            ? 'border-white/25 bg-white/10 text-[var(--kind-consulting-accent)]'
            : 'border-[var(--kind-construction-accent)]/35 bg-white/60 text-[var(--kind-construction-accent)]',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-black tracking-wide uppercase">
            {isConsulting ? 'Consulting' : 'Construction'}
          </h3>
        </div>
        <p
          className={cn(
            'text-xs',
            isConsulting ? 'text-[rgba(251,248,241,0.72)]' : 'text-[rgba(26,23,20,0.62)]',
          )}
        >
          {isConsulting
            ? 'Proposals → client invoices · fee-based engagements'
            : 'Pay apps · commitments · budget · field delivery'}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full border px-2.5 py-1 text-xs font-black tabular-nums',
          isConsulting
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-[var(--kind-construction-ink)]/15 bg-[var(--kind-construction-ink)]/5 text-[var(--kind-construction-ink)]',
        )}
      >
        {count}
      </span>
    </div>
  );
}

function ClientProjectTile({
  project,
  consultingTotals,
}: {
  project: Project;
  consultingTotals: Map<string, { approvedFee: number; invoiced: number }>;
}) {
  const navigate = useNavigate();
  const kind = projectKind(project);
  const amounts = resolveProjectTileAmounts({
    project,
    consulting: consultingTotals.get(project.id),
  });
  const amountLabel = kind === 'consulting' ? 'Approved fees' : 'Budget';
  const amount = formatCurrency(amounts.budget);
  const statusClass =
    (kind === 'consulting' ? STATUS_ON_BLUE : STATUS_ON_IVORY)[project.status] ??
    (kind === 'consulting' ? STATUS_ON_BLUE.planning : STATUS_ON_IVORY.planning);
  const Icon = kind === 'consulting' ? Lightbulb : HardHat;

  return (
    <button
      type="button"
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-l-4 p-4 text-left transition-all',
        'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        projectKindTileClass(kind),
        kind === 'consulting'
          ? 'focus-visible:ring-[var(--kind-consulting)]'
          : 'focus-visible:ring-[var(--kind-construction-accent)]',
      )}
      data-testid={`client-project-tile-${project.id}`}
      data-kind={kind}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30',
          kind === 'consulting' ? 'bg-[var(--kind-consulting-accent)]' : 'bg-[var(--kind-construction-accent)]',
        )}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm',
            kind === 'consulting'
              ? 'border-white/25 bg-white/10 text-[var(--kind-consulting-accent)]'
              : 'border-[var(--kind-construction-accent)]/30 bg-white/70 text-[var(--kind-construction-accent)]',
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate font-semibold leading-tight tracking-tight">{project.name}</h4>
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize',
                statusClass,
              )}
            >
              {project.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1.5">
            <ProjectKindBadge project={project} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{project.property?.name ?? 'Standalone'}</span>
          </p>
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-2 border-t border-current/10 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {amountLabel}
          </p>
          <p className="text-sm font-bold tabular-nums">{amount ?? '—'}</p>
        </div>
        {project.target_end_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(project.target_end_date), 'MMM d, yyyy')}
          </span>
        )}
      </div>
    </button>
  );
}

export function ClientProjectKindGrid({ projects }: { projects: Project[] }) {
  const { consultingTotals } = useAllApprovedProposalTotals();
  const { construction, consulting } = groupProjectsByKind(projects);

  const rows: Array<{ kind: ProjectKind; items: Project[] }> = [
    { kind: 'construction', items: construction },
    { kind: 'consulting', items: consulting },
  ].filter((row) => row.items.length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-8" data-testid="client-project-kind-grid">
      {rows.map(({ kind, items }) => (
        <section key={kind} className="space-y-3" data-testid={`client-project-kind-row-${kind}`}>
          <KindSectionHeader kind={kind} count={items.length} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((project) => (
              <ClientProjectTile
                key={project.id}
                project={project}
                consultingTotals={consultingTotals}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
