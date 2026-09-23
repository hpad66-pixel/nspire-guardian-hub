import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, CheckCircle2, FolderKanban, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { groupProjectsByKind } from '@/lib/projectKind';
import { isProjectLocked, isProtectedHistoricalProject } from '@/lib/projects/businessLifecycle';
import {
  groupProjectsByClientPortfolio,
  type ClientPortfolioProjectLike,
} from '@/lib/projects/clientPortfolio';

type ClientPortfolioProject = ClientPortfolioProjectLike & {
  id: string;
  name: string;
};

export function ClientPortfolioSection({
  projects,
  className,
}: {
  projects: ClientPortfolioProject[];
  className?: string;
}) {
  const navigate = useNavigate();
  const groups = groupProjectsByClientPortfolio(projects);

  if (groups.length === 0) return null;

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Client portfolio
            </p>
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">Open the client first</h2>
          <p className="text-sm text-muted-foreground">
            Each card groups construction and consulting work so R4, government, and private clients are one tap away.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 self-start sm:self-auto" asChild>
          <Link to="/organizations">
            All clients <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const kinds = groupProjectsByKind(group.projects);
          const activeCount = group.projects.filter((project) => !isProjectLocked(project)).length;
          const lockedCount = group.projects.filter((project) => isProjectLocked(project)).length;
          const protectedCount = group.projects.filter((project) => isProtectedHistoricalProject(project)).length;
          const target = group.clientId ? `/projects?clientId=${group.clientId}` : '/projects';
          const kindTarget = (kind: 'construction' | 'consulting') =>
            group.clientId ? `/projects?clientId=${group.clientId}&kind=${kind}` : `/projects?kind=${kind}`;

          return (
            <article
              key={group.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => navigate(target)} className="min-w-0 text-left">
                  <p className="truncate font-display text-lg font-bold leading-tight">{group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.projects.length} project{group.projects.length === 1 ? '' : 's'} | {activeCount} active | {lockedCount} locked
                  </p>
                </button>
                <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 text-xs" onClick={() => navigate(target)}>
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate(kindTarget('construction'))}
                  className="rounded-xl border border-[var(--kind-construction-accent)]/20 bg-[var(--kind-construction)]/70 p-3 text-left text-[var(--kind-construction-ink)] transition hover:-translate-y-0.5 hover:border-[var(--kind-construction-accent)]/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kind-construction-accent)]/35"
                  aria-label={`Open ${group.name} construction projects`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Construction</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-2xl font-black tabular-nums">{kinds.construction.length}</p>
                    <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(kindTarget('consulting'))}
                  className="rounded-xl border border-[var(--kind-consulting-accent)]/25 bg-[var(--kind-consulting)] p-3 text-left text-[var(--kind-consulting-ink)] transition hover:-translate-y-0.5 hover:border-[var(--kind-consulting-accent)]/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kind-consulting-accent)]/35"
                  aria-label={`Open ${group.name} consulting projects`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Consulting</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-2xl font-black tabular-nums">{kinds.consulting.length}</p>
                    <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                  </div>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {protectedCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-900">
                    <LockKeyhole className="h-3 w-3" />
                    {protectedCount} protected historical
                  </Badge>
                )}
                {lockedCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-slate-300 bg-slate-50 text-slate-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {lockedCount} locked
                  </Badge>
                )}
                {activeCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 text-primary">
                    <FolderKanban className="h-3 w-3" />
                    {activeCount} active
                  </Badge>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {group.projects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/35 px-3 py-2 text-left text-sm transition hover:border-primary/20 hover:bg-muted/55"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{project.name}</span>
                      <span className="block text-[11px] capitalize text-muted-foreground">{project.status ?? 'planning'}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
