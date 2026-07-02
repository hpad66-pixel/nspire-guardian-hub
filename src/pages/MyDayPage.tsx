import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sunrise, CheckSquare, Clock, FolderKanban, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMyDay, useCompleteActionItemById } from '@/hooks/useMyDay';
import { useActiveProjects } from '@/hooks/useProjects';
import { groupByDate, BUCKET_META, type BucketableItem } from '@/lib/actionItems/grouping';
import { PRIORITY_META, BUCKET_TONE, BUCKET_DOT } from '@/components/projects/actionItems/actionItemMeta';

export default function MyDayPage() {
  const navigate = useNavigate();
  const { mine, waiting, byProject, isLoading } = useMyDay();
  const { data: projects } = useActiveProjects();
  const complete = useCompleteActionItemById();

  const groups = useMemo(() => groupByDate(mine as unknown as BucketableItem[]) as unknown as Array<{ bucket: any; items: typeof mine }>, [mine]);
  const overdue = mine.filter((i) => { if (!i.due_date) return false; const t = new Date(); t.setHours(0,0,0,0); return new Date(i.due_date + 'T00:00:00') < t; }).length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[var(--apas-sapphire)]/10 flex items-center justify-center">
          <Sunrise className="h-5 w-5 text-[var(--apas-sapphire)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">My Day</h1>
          <p className="text-sm text-muted-foreground">
            {mine.length} on your plate{overdue > 0 ? ` · ${overdue} overdue` : ''} · {waiting.length} waiting on others
          </p>
        </div>
      </div>

      {/* ── What needs you ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-muted-foreground" />What needs you</h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : mine.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nothing assigned to you right now. 🎉</Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ bucket, items }) => (
              <div key={bucket}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn('h-2 w-2 rounded-full', BUCKET_DOT[bucket])} />
                  <span className={cn('text-xs font-semibold', BUCKET_TONE[bucket])}>{BUCKET_META[bucket].label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <Card className="divide-y overflow-hidden">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={false} onCheckedChange={() => complete.mutate(item.id)} aria-label="Complete" />
                      </div>
                      <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/projects/${item.project_id}`)}>
                        <div className="text-sm truncate">{item.title}</div>
                        {item.project?.name && <div className="text-xs text-muted-foreground truncate">{item.project.name}</div>}
                      </button>
                      {item.due_date && <span className={cn('text-xs whitespace-nowrap', BUCKET_TONE[bucket])}>{format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}</span>}
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Waiting on others ──────────────────────────────────────── */}
      {waiting.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Waiting on others</h2>
          <Card className="divide-y overflow-hidden">
            {waiting.map((item) => (
              <button key={item.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 text-left" onClick={() => navigate(`/projects/${item.project_id}`)}>
                <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{item.title}</div>
                  {item.project?.name && <div className="text-xs text-muted-foreground truncate">{item.project.name}</div>}
                </div>
                {item.due_date && <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}</span>}
              </button>
            ))}
          </Card>
        </section>
      )}

      {/* ── Your projects ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><FolderKanban className="h-4 w-4 text-muted-foreground" />Your projects</h2>
        {(projects ?? []).length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No active projects.</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(projects ?? []).map((p) => {
              const counts = byProject.get(p.id) ?? { open: 0, overdue: 0 };
              const isConsulting = (p as any).project_type === 'consulting';
              return (
                <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="text-left">
                  <Card className="p-4 hover:border-[var(--apas-sapphire)]/40 transition-colors h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {isConsulting && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">Consulting</span>}
                          <span className="text-xs text-muted-foreground capitalize">{p.status ?? '—'}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-muted-foreground">{counts.open} open</span>
                      {counts.overdue > 0 && <span className="inline-flex items-center gap-1 text-[var(--apas-rose)]"><AlertCircle className="h-3.5 w-3.5" />{counts.overdue} overdue</span>}
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
