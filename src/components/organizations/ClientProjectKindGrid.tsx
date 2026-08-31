import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, HardHat, Lightbulb, Sparkles } from 'lucide-react';
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

const STATUS_ON_DARK: Record<string, string> = {
  planning: 'bg-white/15 text-white border-white/25',
  active: 'bg-emerald-300/25 text-emerald-50 border-emerald-200/40',
  on_hold: 'bg-amber-300/25 text-amber-50 border-amber-200/40',
  completed: 'bg-white/10 text-white/80 border-white/20',
  closed: 'bg-white/10 text-white/80 border-white/20',
};

const STATUS_ON_ORANGE: Record<string, string> = {
  planning: 'bg-stone-900/15 text-stone-900 border-stone-900/20',
  active: 'bg-stone-900/20 text-stone-950 border-stone-900/25',
  on_hold: 'bg-amber-950/15 text-amber-950 border-amber-950/25',
  completed: 'bg-stone-900/10 text-stone-800 border-stone-900/15',
  closed: 'bg-stone-900/10 text-stone-800 border-stone-900/15',
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
          ? 'border-[rgba(8,39,31,0.35)] bg-[var(--apas-surface)] text-[var(--apas-white)] shadow-[0_8px_24px_rgba(4,25,20,0.22)]'
          : 'border-orange-700/30 bg-gradient-to-r from-[#E67E22] via-[#F59E0B] to-[#EA580C] text-stone-950 shadow-[0_8px_24px_rgba(194,65,12,0.2)]',
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
          isConsulting
            ? 'border-[var(--kind-consulting-gold)]/50 bg-black/20 text-[var(--kind-consulting-gold)]'
            : 'border-stone-900/20 bg-stone-950/10 text-stone-950',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-black tracking-wide uppercase">
            {isConsulting ? 'Consulting' : 'Construction'}
          </h3>
          <Sparkles
            className={cn(
              'h-3.5 w-3.5',
              isConsulting ? 'text-[var(--kind-consulting-gold)]' : 'text-stone-950/70',
            )}
          />
        </div>
        <p
          className={cn(
            'text-xs',
            isConsulting ? 'text-[rgba(251,248,241,0.72)]' : 'text-stone-900/70',
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
            : 'border-stone-900/20 bg-stone-950/10 text-stone-950',
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
    (kind === 'consulting' ? STATUS_ON_DARK : STATUS_ON_ORANGE)[project.status] ??
    (kind === 'consulting' ? STATUS_ON_DARK.planning : STATUS_ON_ORANGE.planning);
  const Icon = kind === 'consulting' ? Lightbulb : HardHat;

  return (
    <button
      type="button"
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-l-4 p-4 text-left transition-all',
        'hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        projectKindTileClass(kind),
        kind === 'consulting'
          ? 'focus-visible:ring-[var(--kind-consulting-gold)]'
          : 'focus-visible:ring-[var(--kind-construction)]',
      )}
      data-testid={`client-project-tile-${project.id}`}
      data-kind={kind}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40',
          kind === 'consulting' ? 'bg-[var(--kind-consulting-gold)]' : 'bg-white',
        )}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm',
            kind === 'consulting'
              ? 'border-[var(--kind-consulting-gold)]/40 bg-black/25 text-[var(--kind-consulting-gold)]'
              : 'border-stone-900/20 bg-stone-950/10 text-stone-950',
          )}
        >
          <Icon className="h-6 w-6 drop-shadow-sm" />
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
