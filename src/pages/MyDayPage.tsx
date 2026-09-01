import { useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Sunrise,
  CheckSquare,
  Clock,
  FolderKanban,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Target,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMyDay, useCompleteActionItemById } from '@/hooks/useMyDay';
import { useActiveProjects } from '@/hooks/useProjects';
import { useMyProfile } from '@/hooks/useMyProfile';
import { groupByDate, BUCKET_META, type BucketableItem } from '@/lib/actionItems/grouping';
import { PRIORITY_META, BUCKET_TONE, BUCKET_DOT } from '@/components/projects/actionItems/actionItemMeta';
import { ProjectKindBadge } from '@/components/projects/ProjectKindBadge';
import { projectKind, projectKindTileClass, groupProjectsByKind } from '@/lib/projectKind';
import { myDayHeroCopy } from '@/lib/myDay/focus';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function MyDayPage() {
  const navigate = useNavigate();
  const {
    mine,
    waiting,
    byProject,
    isLoading,
    focusItems,
    overdue,
    dueToday,
    doneToday,
  } = useMyDay();
  const { data: projects } = useActiveProjects();
  const { data: profile } = useMyProfile();
  const complete = useCompleteActionItemById();
  const focusRef = useRef<HTMLElement | null>(null);

  const groups = useMemo(
    () => groupByDate(mine as unknown as BucketableItem[]) as unknown as Array<{ bucket: any; items: typeof mine }>,
    [mine],
  );

  const hero = useMemo(
    () =>
      myDayHeroCopy({
        mineCount: mine.length,
        overdueCount: overdue,
        todayCount: dueToday,
        waitingCount: waiting.length,
        doneTodayCount: doneToday,
        fullName: profile?.full_name ?? null,
      }),
    [mine.length, overdue, dueToday, waiting.length, doneToday, profile?.full_name],
  );

  const projectGroups = useMemo(
    () => groupProjectsByKind(projects ?? []),
    [projects],
  );

  const handleCta = useCallback(() => {
    if (!hero.ctaTarget) return;
    if (hero.ctaTarget === 'focus') scrollToId('my-day-focus');
    else if (hero.ctaTarget === 'needs-you') scrollToId('my-day-needs-you');
    else if (hero.ctaTarget === 'waiting') scrollToId('my-day-waiting');
  }, [hero.ctaTarget]);

  const heroToneClass =
    hero.tone === 'overdue'
      ? 'from-[var(--apas-rose)]/12 via-card to-card border-[var(--apas-rose)]/25'
      : hero.tone === 'clear'
        ? 'from-[var(--apas-emerald)]/10 via-card to-card border-[var(--apas-emerald)]/20'
        : 'from-[var(--apas-sapphire)]/10 via-card to-card border-[var(--apas-sapphire)]/20';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* ── Hero: invite to act ─────────────────────────────────────── */}
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 md:p-6 shadow-sm',
          heroToneClass,
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                hero.tone === 'overdue'
                  ? 'bg-[var(--apas-rose)]/15'
                  : hero.tone === 'clear'
                    ? 'bg-[var(--apas-emerald)]/15'
                    : 'bg-[var(--apas-sapphire)]/15',
              )}
            >
              {hero.tone === 'clear' ? (
                <Sparkles className="h-6 w-6 text-[var(--apas-emerald)]" />
              ) : hero.tone === 'overdue' ? (
                <AlertCircle className="h-6 w-6 text-[var(--apas-rose)]" />
              ) : (
                <Sunrise className="h-6 w-6 text-[var(--apas-sapphire)]" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight font-display">
                {hero.headline}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">{hero.subline}</p>
              {doneToday > 0 && mine.length > 0 && (
                <p className="text-xs text-[var(--apas-emerald)] mt-2 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {doneToday} cleared today
                </p>
              )}
            </div>
          </div>
          {hero.ctaLabel && (
            <Button
              size="lg"
              onClick={handleCta}
              className={cn(
                'shrink-0 gap-2 shadow-sm',
                hero.tone === 'overdue' &&
                  'bg-[var(--apas-rose)] hover:bg-[var(--apas-rose)]/90 text-white',
              )}
            >
              {hero.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      {/* ── Metric cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => scrollToId('my-day-needs-you')}
          className="text-left group"
        >
          <Card
            className={cn(
              'p-4 h-full border transition-all group-hover:shadow-md group-hover:border-[var(--apas-sapphire)]/40',
              overdue > 0 && 'border-[var(--apas-rose)]/30 bg-[var(--apas-rose)]/[0.03]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  On your plate
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">{mine.length}</span>
                  <span className="text-sm text-muted-foreground">open</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overdue > 0 && (
                    <Badge variant="outline" className="border-[var(--apas-rose)]/40 text-[var(--apas-rose)] bg-[var(--apas-rose)]/5">
                      {overdue} overdue
                    </Badge>
                  )}
                  {dueToday > 0 && (
                    <Badge variant="outline" className="border-[var(--apas-amber)]/40 text-[var(--apas-amber)] bg-[var(--apas-amber)]/5">
                      {dueToday} due today
                    </Badge>
                  )}
                  {mine.length === 0 && (
                    <span className="text-xs text-[var(--apas-emerald)]">You're clear</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => scrollToId('my-day-waiting')}
          className="text-left group"
          disabled={waiting.length === 0}
        >
          <Card className="p-4 h-full border transition-all group-hover:shadow-md group-hover:border-[var(--apas-sapphire)]/40 disabled:opacity-70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Waiting on others
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">{waiting.length}</span>
                  <span className="text-sm text-muted-foreground">delegated</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {waiting.length > 0
                    ? 'Follow up when someone stalls — your asks stay visible here.'
                    : 'Nothing out with the team right now.'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Card>
        </button>
      </div>

      {/* ── Focus strip ────────────────────────────────────────────── */}
      {!isLoading && focusItems.length > 0 && (
        <section id="my-day-focus" ref={focusRef} className="space-y-3 scroll-mt-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--apas-amber)]" />
              Address these first
            </h2>
            <span className="text-xs text-muted-foreground">Top {focusItems.length} by urgency</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {focusItems.map((item, idx) => {
              const isOverdue =
                !!item.due_date &&
                new Date(item.due_date + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <Card
                  key={item.id}
                  className={cn(
                    'p-4 flex flex-col gap-3 border shadow-sm',
                    isOverdue && 'border-[var(--apas-rose)]/35 bg-[var(--apas-rose)]/[0.03]',
                    idx === 0 && !isOverdue && 'border-[var(--apas-sapphire)]/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] uppercase tracking-wide',
                        isOverdue
                          ? 'border-[var(--apas-rose)]/40 text-[var(--apas-rose)]'
                          : 'border-[var(--apas-sapphire)]/30 text-[var(--apas-sapphire)]',
                      )}
                    >
                      {isOverdue ? 'Overdue' : `#${idx + 1} focus`}
                    </Badge>
                    <span className={cn('h-2 w-2 rounded-full mt-1', PRIORITY_META[item.priority].dot)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm leading-snug line-clamp-2">{item.title}</div>
                    {item.project?.name && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{item.project.name}</div>
                    )}
                    {item.due_date && (
                      <div
                        className={cn(
                          'text-xs mt-1.5',
                          isOverdue ? 'text-[var(--apas-rose)] font-medium' : 'text-muted-foreground',
                        )}
                      >
                        Due {format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}
                        {' · '}
                        {PRIORITY_META[item.priority].label}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => navigate(`/projects/${item.project_id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => complete.mutate(item.id)}
                      disabled={complete.isPending}
                    >
                      Done
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── What needs you ─────────────────────────────────────────── */}
      <section id="my-day-needs-you" className="space-y-3 scroll-mt-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          What needs you
        </h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : mine.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-[var(--apas-emerald)] mx-auto" />
            <p className="text-sm font-medium">Nothing assigned to you right now</p>
            <p className="text-xs text-muted-foreground">New asks land here first — enjoy the clear plate.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ bucket, items }) => (
              <div key={bucket}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn('h-2 w-2 rounded-full', BUCKET_DOT[bucket])} />
                  <span className={cn('text-xs font-semibold', BUCKET_TONE[bucket])}>
                    {BUCKET_META[bucket].label}
                  </span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <Card className="divide-y overflow-hidden">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => complete.mutate(item.id)}
                          aria-label="Complete"
                        />
                      </div>
                      <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => navigate(`/projects/${item.project_id}`)}
                      >
                        <div className="text-sm truncate">{item.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.project?.name && (
                            <span className="text-xs text-muted-foreground truncate">{item.project.name}</span>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {PRIORITY_META[item.priority].label}
                          </span>
                        </div>
                      </button>
                      {item.due_date && (
                        <span className={cn('text-xs whitespace-nowrap', BUCKET_TONE[bucket])}>
                          {format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}
                        </span>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Waiting on others ──────────────────────────────────────── */}
      <section id="my-day-waiting" className="space-y-2 scroll-mt-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Waiting on others
        </h2>
        {waiting.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No open asks sitting with someone else.
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden">
            {waiting.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 text-left"
                onClick={() => navigate(`/projects/${item.project_id}`)}
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{item.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.assignee?.full_name || item.assignee?.email || 'Teammate'}
                    {item.project?.name ? ` · ${item.project.name}` : ''}
                  </div>
                </div>
                {item.due_date && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </Card>
        )}
      </section>

      {/* ── Your projects ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          Your projects
        </h2>
        {(projects ?? []).length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No active projects.</Card>
        ) : (
          <div className="space-y-5">
            {(
              [
                { key: 'construction', label: 'Construction', list: projectGroups.construction },
                { key: 'consulting', label: 'Consulting', list: projectGroups.consulting },
              ] as const
            ).map(({ key, label, list }) =>
              list.length === 0 ? null : (
                <div key={key} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((p) => {
                      const counts = byProject.get(p.id) ?? { open: 0, overdue: 0, needsYou: 0 };
                      return (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="text-left">
                          <Card
                            className={cn(
                              'p-4 transition-colors h-full border-l-4 hover:shadow-md',
                              projectKindTileClass(projectKind(p)),
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <ProjectKindBadge project={p} />
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {p.status ?? '—'}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                              <span className="text-muted-foreground">{counts.open} open</span>
                              {counts.needsYou > 0 && (
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Target className="h-3.5 w-3.5" />
                                  {counts.needsYou} need you
                                </span>
                              )}
                              {counts.overdue > 0 && (
                                <span className="inline-flex items-center gap-1 text-[var(--apas-rose)]">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {counts.overdue} overdue
                                </span>
                              )}
                            </div>
                          </Card>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
