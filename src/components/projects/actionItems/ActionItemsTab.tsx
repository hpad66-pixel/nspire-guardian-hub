import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckSquare, MessageSquare, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useActionItemsByProject, useCreateActionItem, useUpdateActionItem, type ActionItem,
} from '@/hooks/useActionItems';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { groupByDate, BUCKET_META } from '@/lib/actionItems/grouping';
import { ActionItemDetailDialog } from './ActionItemDetailDialog';
import { PRIORITY_META, BUCKET_TONE, BUCKET_DOT } from './actionItemMeta';

const ALL = '__all__';
const UNASSIGNED_KEY = '__unassigned__';

export function ActionItemsTab({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const { data: items, isLoading } = useActionItemsByProject(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const { data: team } = useProjectTeamMembers(projectId);
  const create = useCreateActionItem(projectId);
  const update = useUpdateActionItem(projectId);

  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState(ALL);
  const [scopeFilter, setScopeFilter] = useState(ALL);
  const [showDone, setShowDone] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [selected, setSelected] = useState<ActionItem | null>(null);

  const scopeName = (id: string | null) => scopes?.find((s) => s.id === id)?.title ?? null;
  const ownerName = (id: string | null) => {
    const m = (team ?? []).find((t) => t.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || null;
  };

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (!showDone) list = list.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
    if (owner !== ALL) list = list.filter((i) => i.assigned_to === (owner === UNASSIGNED_KEY ? null : owner));
    if (scopeFilter !== ALL) list = list.filter((i) => i.scope_id === (scopeFilter === UNASSIGNED_KEY ? null : scopeFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [items, showDone, owner, scopeFilter, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const openCount = (items ?? []).filter((i) => i.status !== 'done' && i.status !== 'cancelled').length;

  const quickAdd = async () => {
    if (!quickTitle.trim() || create.isPending) return;
    try {
      await create.mutateAsync({ title: quickTitle.trim() });
      setQuickTitle('');
    } catch { /* toast surfaced by the hook; keep the text so it isn't lost */ }
  };

  const toggleDone = (item: ActionItem) =>
    update.mutate({ id: item.id, status: item.status === 'done' ? 'todo' : 'done', previous_assigned_to: item.assigned_to } as never);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CheckSquare className="h-5 w-5 text-muted-foreground" />Action items</h2>
          <p className="text-sm text-muted-foreground">{openCount} open · grouped by when they're due</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action items…" className="pl-8 h-9" />
        </div>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            <SelectItem value={UNASSIGNED_KEY}>Unassigned</SelectItem>
            {(team ?? []).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || 'Team member'}</SelectItem>)}
          </SelectContent>
        </Select>
        {(scopes ?? []).length > 0 && (
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All scopes</SelectItem>
              <SelectItem value={UNASSIGNED_KEY}>No scope</SelectItem>
              {(scopes ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <Checkbox checked={showDone} onCheckedChange={(v) => setShowDone(!!v)} />Show done
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }} placeholder="Add an action item and press Enter…" className="h-9" />
        <Button onClick={quickAdd} disabled={!quickTitle.trim() || create.isPending} className="gap-1.5"><Plus className="h-4 w-4" />Add</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : groups.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nothing here</p>
          <p className="text-sm text-muted-foreground">Add an action item above, or clear your filters.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(({ bucket, items: groupItems }) => (
            <div key={bucket}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('h-2 w-2 rounded-full', BUCKET_DOT[bucket])} />
                <span className={cn('text-sm font-semibold', BUCKET_TONE[bucket])}>{BUCKET_META[bucket].label}</span>
                <span className="text-xs text-muted-foreground">{groupItems.length}</span>
              </div>
              <Card className="overflow-hidden divide-y">
                {groupItems.map((item) => {
                  const done = item.status === 'done' || item.status === 'cancelled';
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(item)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={done} onCheckedChange={() => toggleDone(item)} />
                      </div>
                      <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} title={PRIORITY_META[item.priority].label} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-sm truncate', done && 'line-through text-muted-foreground')}>{item.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.scope_id && scopeName(item.scope_id) && <span className="px-1.5 py-0.5 rounded bg-muted">{scopeName(item.scope_id)}</span>}
                          {(item.comment_count ?? 0) > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{item.comment_count}</span>}
                        </div>
                      </div>
                      {ownerName(item.assigned_to) && <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{ownerName(item.assigned_to)}</span>}
                      {item.due_date && <span className={cn('text-xs whitespace-nowrap', BUCKET_TONE[bucket])}>{format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}</span>}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      <ActionItemDetailDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} projectId={projectId} item={selected} scopes={scopes ?? []} team={team ?? []} projectName={projectName} />
    </div>
  );
}
