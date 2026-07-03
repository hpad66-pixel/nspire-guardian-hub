import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, ListTree, MoreHorizontal, Pencil, Trash2, ListChecks, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useProjectScopes, summarizeScopes, type ProjectScope } from '@/hooks/useProjectScopes';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { ScopeDialog } from './ScopeDialog';
import { ConsultingUpdateDialog } from './ConsultingUpdateDialog';
import { SCOPE_STATUS_META, money } from './scopeMeta';
import { cn } from '@/lib/utils';

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function ScopesTab({ projectId, projectName = '', clientName }: { projectId: string; projectName?: string; clientName?: string | null }) {
  const { data: scopes, isLoading, remove } = useProjectScopes(projectId);
  const { data: team } = useProjectTeamMembers(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectScope | null>(null);
  const [deleting, setDeleting] = useState<ProjectScope | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  const summary = useMemo(() => summarizeScopes(scopes), [scopes]);
  const ownerName = (id: string | null) => {
    if (!id) return null;
    const m = (team ?? []).find((t) => t.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || 'Team member';
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s: ProjectScope) => { setEditing(s); setDialogOpen(true); };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><ListTree className="h-5 w-5 text-muted-foreground" />Scopes</h2>
          <p className="text-sm text-muted-foreground">Workstreams and deliverables. Each carries a fee and % complete.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUpdateOpen(true)} disabled={(scopes ?? []).length === 0} className="gap-1.5"><Sparkles className="h-4 w-4" />Client update</Button>
          <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" />Add scope</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Scopes" value={String(summary.count)} />
        <Metric label="Total fee" value={money(summary.totalFee)} />
        <Metric label="Complete" value={`${summary.pctComplete}%`} sub={`${money(summary.earned)} earned`} />
        <Metric label="Unbilled" value={money(summary.unbilled)} sub={`${money(summary.billed)} billed`} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading scopes…</div>
      ) : (scopes ?? []).length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No scopes yet</p>
          <p className="text-sm text-muted-foreground mb-4">Break the engagement into workstreams to track progress and bill against completion.</p>
          <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" />Add your first scope</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="font-medium px-4 py-2.5">Scope</th>
                  <th className="font-medium px-3 py-2.5">Owner</th>
                  <th className="font-medium px-3 py-2.5">Status</th>
                  <th className="font-medium px-3 py-2.5 whitespace-nowrap">Due</th>
                  <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Fee</th>
                  <th className="font-medium px-3 py-2.5 w-[140px]">Progress</th>
                  <th className="px-2 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(scopes ?? []).map((s) => {
                  const meta = SCOPE_STATUS_META[s.status] ?? SCOPE_STATUS_META.not_started;
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{s.title}</div>
                        {s.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">{s.description}</div>}
                      </td>
                      <td className="px-3 py-3 align-top text-muted-foreground whitespace-nowrap">{ownerName(s.owner_id) ?? '—'}</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-3 align-top text-muted-foreground whitespace-nowrap">{s.due_date ? format(new Date(s.due_date), 'MMM d') : '—'}</td>
                      <td className="px-3 py-3 align-top text-right whitespace-nowrap">{money(Number(s.fee_amount))}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Progress value={Number(s.pct_complete)} className="h-1.5 flex-1" />
                          <span className="text-xs tabular-nums w-8 text-right">{Math.round(Number(s.pct_complete))}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ScopeDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} scope={editing} />
      <ConsultingUpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} projectId={projectId} projectName={projectName} clientName={clientName} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scope?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” will be removed. Action items linked to it stay, but lose the link.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) remove.mutate(deleting.id); setDeleting(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
