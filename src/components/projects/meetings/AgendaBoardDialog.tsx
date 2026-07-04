import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Printer, Send, Link2, Plus, X, ListChecks, Users, ArrowUp, ArrowDown, Pencil, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingAgendaItems, type AgendaCategory, type AgendaItem } from '@/hooks/useMeetingAgendaItems';
import { useActionItemsByProject, useCreateActionItem } from '@/hooks/useActionItems';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useProjectDictionary, glossaryForAI } from '@/hooks/useProjectDictionary';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useDistributionLists } from '@/hooks/useDistributionLists';
import { resolveDistribution } from '@/lib/distribution';
import { useClickUpStatus } from '@/hooks/useClickUp';
import { buildAgendaHtml, type AgendaDocGroup } from '@/lib/meetings/agendaDocument';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  projectId: string; projectName: string; meeting: ConsultingMeeting; team: ProjectTeamMember[];
}

// Urgency chip shown on each card (topic is the section heading now).
const CHIP: Partial<Record<AgendaCategory, { label: string; cls: string }>> = {
  overdue:   { label: 'Overdue',   cls: 'bg-[var(--apas-rose)]/10 text-[var(--apas-rose)] border-[var(--apas-rose)]/20' },
  due:       { label: 'Due soon',  cls: 'bg-[var(--apas-amber)]/10 text-[var(--apas-amber)] border-[var(--apas-amber)]/20' },
  decision:  { label: 'Decision',  cls: 'bg-accent/10 text-accent-foreground border-accent/30' },
  next_step: { label: 'Next step', cls: 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)] border-[var(--apas-emerald)]/20' },
  objective: { label: 'Objective', cls: 'bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/20' },
  update:    { label: 'Update',    cls: 'bg-muted text-muted-foreground border-border' },
};
const FALLBACK_LABEL: Record<AgendaCategory, string> = {
  objective: 'Objectives', overdue: 'Overdue', due: 'Due soon', open: 'Open items',
  update: 'Updates', decision: 'Decisions', next_step: 'Next steps', discussion: 'Discussion',
};
const AI_CATS: AgendaCategory[] = ['objective', 'decision', 'next_step', 'discussion'];
const day = (iso: string | null) => (iso ? new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso) : null);
const topicOf = (it: AgendaItem) => it.topic?.trim() || FALLBACK_LABEL[it.category] || 'General';

interface Grp { topic: string; items: AgendaItem[] }

export function AgendaBoardDialog({ open, onOpenChange, projectId, projectName, meeting, team }: Props) {
  const agenda = useMeetingAgendaItems(meeting.id, projectId);
  const aiEnabled = useAiEnabled();
  const { data: actionItems } = useActionItemsByProject(projectId);
  const meetingsApi = useConsultingMeetings(projectId);
  const { data: meetings } = meetingsApi;
  const { data: dictionary } = useProjectDictionary(projectId);
  const createAction = useCreateActionItem(projectId);
  const sendEmail = useSendEmail();
  const listsApi = useDistributionLists({ projectId });
  const { data: clickup } = useClickUpStatus();

  const [building, setBuilding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);

  const items = agenda.data ?? [];
  const groups: Grp[] = useMemo(() => {
    const order: string[] = []; const map = new Map<string, AgendaItem[]>();
    for (const it of items) { const t = topicOf(it); if (!map.has(t)) { map.set(t, []); order.push(t); } map.get(t)!.push(it); }
    return order.map((t) => ({ topic: t, items: map.get(t)! }));
  }, [items]);
  const topicNames = groups.map((g) => g.topic);
  const ownerName = (id: string | null) => { const m = team.find((t) => t.user_id === id); return m?.profile?.full_name || m?.profile?.email || null; };

  // ── persistence helpers ────────────────────────────────────────────────────
  const persist = (gs: Grp[]) => {
    const rows: Array<{ id: string; sort_order: number; topic: string }> = [];
    let o = 0;
    for (const g of gs) for (const it of g.items) rows.push({ id: it.id, sort_order: o++, topic: g.topic });
    agenda.applyOrder.mutate(rows);
  };
  const cloneGroups = (): Grp[] => groups.map((g) => ({ topic: g.topic, items: [...g.items] }));
  const move = (topic: string, idx: number, dir: 'up' | 'down') => {
    const next = cloneGroups(); const g = next.find((x) => x.topic === topic); if (!g) return;
    const j = dir === 'up' ? idx - 1 : idx + 1; if (j < 0 || j >= g.items.length) return;
    [g.items[idx], g.items[j]] = [g.items[j], g.items[idx]]; persist(next);
  };
  const moveToTopic = (item: AgendaItem, target: string) => {
    if (target === topicOf(item)) return;
    const next = cloneGroups().map((g) => ({ topic: g.topic, items: g.items.filter((x) => x.id !== item.id) }));
    let tg = next.find((g) => g.topic === target);
    if (!tg) { tg = { topic: target, items: [] }; next.push(tg); }
    tg.items.push(item);
    persist(next.filter((g) => g.items.length));
  };
  const renameTopic = (oldT: string, newT: string) => {
    const t = newT.trim(); setRenaming(null);
    if (!t || t === oldT) return;
    persist(cloneGroups().map((g) => ({ topic: g.topic === oldT ? t : g.topic, items: g.items })));
  };
  const saveEdit = (id: string) => { const t = editText.trim(); setEditId(null); if (t) agenda.updateItem.mutate({ id, title: t }); };

  // ── build ───────────────────────────────────────────────────────────────
  const build = async () => {
    setBuilding(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const soon = new Date(today.getTime() + 7 * 864e5);
      const open = (actionItems ?? []).filter((i) => i.status !== 'done' && i.status !== 'cancelled');
      const cat = (i: any): AgendaCategory => { const d = day(i.due_date); if (d && d < today) return 'overdue'; if (d && d <= soon) return 'due'; return 'open'; };
      const actionBoxes = open
        .map((i) => ({ category: cat(i), title: i.title, description: i.description ?? null, owner_name: i.assignee?.full_name || ownerName(i.assigned_to), due_date: i.due_date, action_item_id: i.id }))
        .sort((a, b) => ((a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1));

      const updates = (actionItems ?? []).filter((i) => i.status === 'done' && i.completed_at && new Date(i.completed_at).getTime() >= Date.now() - 14 * 864e5).map((i) => `${i.title} — completed`);
      const prior = (meetings ?? []).filter((m) => m.id !== meeting.id && m.minutes).sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1))[0];
      const glossary = glossaryForAI(dictionary);

      let ai: any = { objectives: [], updates: [], decisions: [], nextSteps: [] };
      try {
        const { data, error } = await supabase.functions.invoke('generate-meeting-agenda', {
          body: {
            projectName, glossary,
            overdue: actionBoxes.filter((b) => b.category === 'overdue').map((b) => ({ title: b.title, owner: b.owner_name })),
            dueSoon: actionBoxes.filter((b) => b.category === 'due').map((b) => ({ title: b.title, owner: b.owner_name })),
            updates, priorMinutes: prior?.minutes ?? null,
          },
        });
        if (!error && !(data as any)?.error) ai = data;
      } catch { /* AI optional */ }

      const narrative = [
        ...(ai.objectives ?? []).map((t: string) => ({ category: 'objective' as AgendaCategory, title: t, description: null, owner_name: null, due_date: null, action_item_id: null })),
        ...(ai.updates ?? []).map((t: string) => ({ category: 'update' as AgendaCategory, title: t, description: null, owner_name: null, due_date: null, action_item_id: null })),
        ...(ai.decisions ?? []).map((t: string) => ({ category: 'decision' as AgendaCategory, title: t, description: null, owner_name: null, due_date: null, action_item_id: null })),
        ...(ai.nextSteps ?? []).map((t: string) => ({ category: 'next_step' as AgendaCategory, title: t, description: null, owner_name: null, due_date: null, action_item_id: null })),
      ];
      const flat = [...actionBoxes, ...narrative];

      // Topic-group + dictionary-clean the whole set with AI.
      let organized: Array<{ topic: string; items: Array<{ ref: number; title: string }> }> | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('generate-meeting-agenda', {
          body: { mode: 'organize', projectName, glossary, items: flat.map((b, ref) => ({ ref, title: b.title, owner: b.owner_name, category: b.category, overdue: b.category === 'overdue' })) },
        });
        if (!error && Array.isArray((data as any)?.groups) && (data as any).groups.length) organized = (data as any).groups;
      } catch { /* fall back to urgency grouping */ }

      let rows: Array<Partial<AgendaItem> & { title: string }>;
      if (organized) {
        rows = [];
        const used = new Set<number>();
        for (const g of organized) for (const it of g.items) {
          const b = flat[it.ref]; if (!b || used.has(it.ref)) continue; used.add(it.ref);
          rows.push({ ...b, title: it.title || b.title, topic: g.topic });
        }
        flat.forEach((b, ref) => { if (!used.has(ref)) rows.push({ ...b, topic: 'General' }); });
      } else {
        rows = flat.map((b) => ({ ...b, topic: FALLBACK_LABEL[b.category] }));
      }

      await agenda.replaceAll.mutateAsync(rows.map((r, i) => ({ ...r, sort_order: i })));
    } catch (e) {
      toast.error(`Couldn't build: ${e instanceof Error ? e.message : 'try again'}`);
    } finally { setBuilding(false); }
  };

  // ── document (branded) ────────────────────────────────────────────────────
  const docHtml = () => {
    const docGroups: AgendaDocGroup[] = groups.map((g) => ({
      topic: g.topic,
      items: g.items.map((it) => ({ title: it.title, description: it.description, ownerName: it.owner_name, due: it.due_date, category: it.category, discussed: it.discussed })),
    }));
    return buildAgendaHtml({ projectName, title: meeting.title, date: meeting.meeting_date, attendees: meeting.attendees, groups: docGroups, brandPrimary: 'APAS AI' });
  };

  const addEmail = () => { const e = emailInput.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error('Enter a valid email.'); return; } if (!emails.includes(e)) setEmails([...emails, e]); setEmailInput(''); };
  const emailAgenda = async () => {
    if (selectedLists.size === 0 && emails.length === 0) { toast.error('Add a recipient or group.'); return; }
    try {
      const recips = await resolveDistribution({ listIds: [...selectedLists], extraEmails: emails });
      const to = [...new Set(recips.map((r) => r.email).filter(Boolean))];
      if (!to.length) { toast.error('No recipients with emails.'); return; }
      await sendEmail.mutateAsync({ recipients: to, subject: `Agenda: ${projectName} — ${meeting.title}`, bodyHtml: docHtml() });
    } catch (e) { toast.error(`Couldn't send: ${e instanceof Error ? e.message : 'try again'}`); }
  };
  const printAgenda = () => { const w = window.open('', '_blank', 'width=760,height=920'); if (!w) return; w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Agenda — ${meeting.title}</title></head><body style="padding:32px;background:#fff;">${docHtml()}</body></html>`); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 300); };
  const pushClickUp = async () => {
    setPushing(true);
    try {
      const text = groups.map((g) => `## ${g.topic}\n${g.items.map((i) => `- ${i.title}${i.owner_name ? ` — ${i.owner_name}` : ''}${i.due_date ? ` (due ${i.due_date})` : ''}`).join('\n')}`).join('\n\n');
      const { data, error } = await supabase.functions.invoke('clickup', { body: { action: 'create-note', projectId, meetingId: meeting.id, title: `Agenda — ${meeting.title}`, content: text } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || 'ClickUp error');
      toast.success((data as any)?.updated ? 'Agenda task updated in ClickUp' : 'Agenda task created in ClickUp');
    } catch (e) { toast.error(`Couldn't push: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setPushing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-muted-foreground" />Agenda · {meeting.title}</DialogTitle>
          <DialogDescription>AI groups open, due, and overdue items by topic and applies your project dictionary. Reorder, edit, and regroup, then email a branded agenda or push it to ClickUp.</DialogDescription>
        </DialogHeader>

        {/* Meeting date + build */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Meeting date</label>
            <Input type="date" value={meeting.meeting_date?.slice(0, 10) ?? ''} onChange={(e) => e.target.value && meetingsApi.update.mutate({ id: meeting.id, meeting_date: e.target.value })} className="h-9 w-[160px]" />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={printAgenda} disabled={!items.length} className="gap-1.5"><Printer className="h-4 w-4" />Print</Button>
            {clickup?.connected && <Button size="sm" variant="outline" onClick={pushClickUp} disabled={!items.length || pushing} className="gap-1.5">{pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}ClickUp</Button>}
            {aiEnabled && <Button size="sm" onClick={build} disabled={building} className="gap-1.5">{building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{items.length ? 'Rebuild' : 'Build agenda'}</Button>}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No agenda yet. Hit <span className="font-medium text-foreground">Build agenda</span> — AI pulls in every open, due, and overdue item, groups them by topic, and cleans up names using your dictionary.</div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.topic}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {renaming === g.topic ? (
                    <div className="flex items-center gap-1">
                      <Input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameTopic(g.topic, renameText); if (e.key === 'Escape') setRenaming(null); }} className="h-7 w-52 text-xs font-bold uppercase tracking-widest" />
                      <button className="h-6 w-6 rounded flex items-center justify-center text-[var(--apas-emerald)]" onClick={() => renameTopic(g.topic, renameText)}><Check className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-bold uppercase tracking-widest text-foreground border-l-[3px] border-accent pl-2">{g.topic} <span className="text-muted-foreground font-normal">· {g.items.length}</span></div>
                      <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground" title="Rename topic" onClick={() => { setRenaming(g.topic); setRenameText(g.topic); }}><Pencil className="h-3 w-3" /></button>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  {g.items.map((it, idx) => {
                    const chip = CHIP[it.category];
                    return (
                      <div key={it.id} className={cn('flex items-start gap-2 rounded-lg border p-2.5 bg-card', it.discussed && 'opacity-55')}>
                        <Checkbox checked={it.discussed} onCheckedChange={(v) => agenda.toggle.mutate({ id: it.id, discussed: !!v })} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          {editId === it.id ? (
                            <div className="flex items-center gap-1">
                              <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditId(null); }} className="h-7 text-sm" />
                              <button className="h-6 w-6 rounded flex items-center justify-center text-[var(--apas-emerald)]" onClick={() => saveEdit(it.id)}><Check className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <div className={cn('text-sm font-medium flex items-center gap-1.5 flex-wrap', it.discussed && 'line-through')}>
                              {it.title}
                              {chip && <span className={cn('text-[10px] font-bold uppercase tracking-wide border rounded-full px-1.5 py-0.5', chip.cls)}>{chip.label}</span>}
                            </div>
                          )}
                          {it.description && editId !== it.id && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{it.description}</div>}
                          {(it.owner_name || it.due_date) && editId !== it.id && <div className="text-[11px] text-muted-foreground mt-0.5">{[it.owner_name, it.due_date ? `due ${new Date(it.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''].filter(Boolean).join(' · ')}</div>}
                        </div>
                        {/* controls */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground disabled:opacity-25" title="Move up" disabled={idx === 0} onClick={() => move(g.topic, idx, 'up')}><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground disabled:opacity-25" title="Move down" disabled={idx === g.items.length - 1} onClick={() => move(g.topic, idx, 'down')}><ArrowDown className="h-3.5 w-3.5" /></button>
                          <Select value={topicOf(it)} onValueChange={(v) => moveToTopic(it, v)}>
                            <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent [&>svg]:hidden justify-center text-muted-foreground/50 hover:text-foreground" title="Move to topic"><span className="text-base leading-none">⇄</span></SelectTrigger>
                            <SelectContent>{topicNames.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <button className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground" title="Edit" onClick={() => { setEditId(it.id); setEditText(it.title); }}><Pencil className="h-3.5 w-3.5" /></button>
                          {AI_CATS.includes(it.category) && !it.action_item_id && (
                            <button title="Make an action item" className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-[var(--apas-sapphire)]" onClick={() => createAction.mutate({ title: it.title, description: it.description ?? undefined })}><Plus className="h-3.5 w-3.5" /></button>
                          )}
                          <button className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive" title="Remove" onClick={() => agenda.remove.mutate(it.id)}><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add item */}
            <div className="flex items-center gap-2 border-t pt-3">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { agenda.addItem.mutate({ title: newItem.trim(), category: 'discussion', topic: newTopic || topicNames[0] || 'General', sort_order: 999 }); setNewItem(''); } }} placeholder="Add a discussion point…" className="h-9" />
              <Select value={newTopic || topicNames[0] || 'General'} onValueChange={setNewTopic}>
                <SelectTrigger className="h-9 w-[150px] shrink-0"><SelectValue placeholder="Topic" /></SelectTrigger>
                <SelectContent>{(topicNames.length ? topicNames : ['General']).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-9 shrink-0" disabled={!newItem.trim()} onClick={() => { agenda.addItem.mutate({ title: newItem.trim(), category: 'discussion', topic: newTopic || topicNames[0] || 'General', sort_order: 999 }); setNewItem(''); }}><Plus className="h-4 w-4" /></Button>
            </div>

            {/* Email */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email the agenda</div>
              {(listsApi.data ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(listsApi.data ?? []).map((l) => <label key={l.id} className="flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 cursor-pointer"><Checkbox checked={selectedLists.has(l.id)} onCheckedChange={() => setSelectedLists((p) => { const n = new Set(p); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })} /><Users className="h-3 w-3" />{l.name}</label>)}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="name@company.com" className="h-9" />
                <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={addEmail}><Plus className="h-4 w-4" /></Button>
                <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={emailAgenda} disabled={sendEmail.isPending}>{sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</Button>
              </div>
              {emails.length > 0 && <div className="flex flex-wrap gap-1.5">{emails.map((e) => <Badge key={e} variant="secondary" className="gap-1">{e}<button onClick={() => setEmails(emails.filter((x) => x !== e))}><X className="h-3 w-3" /></button></Badge>)}</div>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
