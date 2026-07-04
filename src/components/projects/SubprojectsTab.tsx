import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FolderTree, Plus, ChevronRight, Link2, Loader2, DollarSign, Layers, LayoutGrid, GanttChartSquare, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubprojects } from '@/hooks/useProjectTree';
import { useUpdateProject, type Project } from '@/hooks/useProjects';
import { useMyDay } from '@/hooks/useMyDay';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProgramTimeline } from '@/components/projects/ProgramTimeline';
import { projectKind } from '@/lib/projectKind';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { cn } from '@/lib/utils';

interface Brief { summary: string; topRisks: any[]; recommendations: string[] }

const money = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n).toLocaleString()}`;
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  planning: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  on_hold: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-muted text-muted-foreground border-border',
  closed: 'bg-muted text-muted-foreground border-border',
};

export function SubprojectsTab({ projectId, project }: { projectId: string; project: Project }) {
  const navigate = useNavigate();
  const { children, tree, ownBudget, ownBilled, rolledBudget, rolledBilled } = useSubprojects(projectId);
  const updateProject = useUpdateProject();
  const myDay = useMyDay();
  const aiEnabled = useAiEnabled();
  const [addOpen, setAddOpen] = useState(false);
  const [attachId, setAttachId] = useState('');
  const [view, setView] = useState<'board' | 'timeline'>('board');
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const subtree = tree.subtree(projectId).filter((p) => p.id !== projectId);

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const projects = subtree.map((p) => {
        const counts = myDay.byProject.get(p.id) ?? { open: 0, overdue: 0 };
        return { name: p.name, kind: projectKind(p), status: p.status, revisedBudget: ownBudget(p.id), billed: ownBilled(p.id), openItems: counts.open, overdueItems: counts.overdue, flags: counts.overdue ? [`${counts.overdue} overdue`] : [] };
      });
      const { data, error } = await supabase.functions.invoke('portfolio-briefing', {
        body: { portfolio: { totals: { projects: subtree.length, contractValue: rolledBudget(projectId), billed: rolledBilled(projectId), overdueItems: projects.reduce((s, p) => s + p.overdueItems, 0) }, projects }, people: [] },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || 'Brief failed');
      setBrief(data as Brief);
    } catch (e) { toast.error(`Couldn't generate brief: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setBriefLoading(false); }
  };

  const setDependency = (childId: string, dep: string) => {
    updateProject.mutate({ id: childId, depends_on_project_id: dep === 'none' ? null : dep } as any);
  };

  const own = ownBudget(projectId);
  const rolled = rolledBudget(projectId);
  const rolledBill = rolledBilled(projectId);
  const childrenBudget = rolled - own;

  // Eligible to attach: not self, not already a child, not a descendant (cycle),
  // and same client/property family so we don't cross engagements.
  const attachable = useMemo(() => {
    const descIds = new Set(tree.descendants(projectId).map((d) => d.id));
    return tree.byId.size
      ? [...tree.byId.values()].filter((p) => {
          if (p.id === projectId || descIds.has(p.id)) return false;
          if (p.parent_project_id === projectId) return false;
          return true;
        })
      : [];
  }, [tree, projectId]);

  const attach = () => {
    if (!attachId) return;
    updateProject.mutate({ id: attachId, parent_project_id: projectId } as any, { onSuccess: () => setAttachId('') });
  };

  return (
    <div className="space-y-5">
      {/* Rolled-up summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Layers} label="Subprojects" value={String(children.length)} />
        <SummaryCard icon={DollarSign} label="Program budget" value={money(rolled)} sub="incl. subprojects" />
        <SummaryCard icon={DollarSign} label="This project" value={money(own)} sub="own budget" />
        <SummaryCard icon={DollarSign} label="Rolled-up billed" value={money(rolledBill)} sub={rolled > 0 ? `${Math.round((rolledBill / rolled) * 100)}% of program` : undefined} />
      </div>

      {children.length > 0 && childrenBudget > 0 && (
        <p className="text-xs text-muted-foreground">
          {money(own)} own + {money(childrenBudget)} across {children.length} subproject{children.length !== 1 ? 's' : ''} = <span className="font-medium text-foreground">{money(rolled)}</span> program budget.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Add subproject</Button>
        {attachable.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={attachId} onValueChange={setAttachId}>
              <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Attach an existing project…" /></SelectTrigger>
              <SelectContent>
                {attachable.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!attachId || updateProject.isPending} onClick={attach} className="gap-1.5">
              {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Attach
            </Button>
          </div>
        )}
        {children.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {aiEnabled && (
              <Button size="sm" variant="outline" onClick={generateBrief} disabled={briefLoading} className="gap-1.5">
                {briefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}AI program brief
              </Button>
            )}
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} className="border rounded-lg p-0.5 bg-muted/30 h-9">
              <ToggleGroupItem value="board" className="h-7 px-2.5 text-xs gap-1"><LayoutGrid className="h-3.5 w-3.5" />Board</ToggleGroupItem>
              <ToggleGroupItem value="timeline" className="h-7 px-2.5 text-xs gap-1"><GanttChartSquare className="h-3.5 w-3.5" />Timeline</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      {/* AI program brief */}
      {brief && (
        <div className="rounded-xl border bg-gradient-to-br from-[var(--apas-sapphire)]/[0.05] to-transparent p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />Program brief</div>
          {brief.summary && <p className="text-sm leading-relaxed text-foreground/90">{brief.summary}</p>}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {brief.topRisks?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Top risks</div>
                <ul className="space-y-1.5">{brief.topRisks.map((t: any, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-1.5"><span className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', t.severity === 'high' ? 'bg-[var(--apas-rose)]' : t.severity === 'medium' ? 'bg-[var(--apas-amber)]' : 'bg-muted-foreground')} /><span><span className="font-medium">{t.project ? `${t.project}: ` : ''}{t.title}</span>{t.action ? <span className="text-muted-foreground"> — {t.action}</span> : null}</span></li>
                ))}</ul>
              </div>
            )}
            {brief.recommendations?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Recommended</div>
                <ul className="space-y-1.5">{brief.recommendations.map((rec, i) => <li key={i} className="text-sm flex items-start gap-1.5"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--apas-sapphire)]" />{rec}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Children */}
      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <FolderTree className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No subprojects yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Break a large program into subprojects — each with its own scope, schedule, and budget — and they roll up here. e.g. a Stormwater program with Retention Pond and Catch Basin subprojects.
          </p>
        </div>
      ) : view === 'timeline' ? (
        <div className="space-y-4">
          <ProgramTimeline rootId={projectId} tree={tree as any} />
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold mb-2">Sequencing <span className="font-normal text-muted-foreground">· which subproject starts after which</span></div>
            <div className="space-y-1.5">
              {children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="w-40 truncate font-medium">{child.name}</span>
                  <span className="text-xs text-muted-foreground">starts after</span>
                  <Select value={(child as any).depends_on_project_id ?? 'none'} onValueChange={(v) => setDependency(child.id, v)}>
                    <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nothing (independent)</SelectItem>
                      {children.filter((c) => c.id !== child.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => {
            const b = ownBudget(child.id);
            const s = ownBilled(child.id);
            const rb = rolledBudget(child.id);
            const grandkids = tree.children(child.id).length;
            const pct = b > 0 ? Math.round((s / b) * 100) : 0;
            return (
              <button key={child.id} onClick={() => navigate(`/projects/${child.id}`)}
                className="group text-left rounded-xl border p-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate group-hover:underline">{child.name}</div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {projectKind(child)}{grandkids > 0 ? ` · ${grandkids} sub` : ''}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2"><Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[child.status ?? ''] ?? '')}>{child.status ?? 'planning'}</Badge></div>
                {b > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{money(s)} billed</span><span>{money(grandkids > 0 ? rb : b)}{grandkids > 0 ? ' rolled' : ''}</span>
                    </div>
                    <Progress value={Math.min(100, pct)} className="h-1.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {addOpen && <ProjectDialog open={addOpen} onOpenChange={setAddOpen} parentProject={project as any} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
