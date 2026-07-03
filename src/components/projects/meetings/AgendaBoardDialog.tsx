import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Printer, Send, Link2, Plus, X, ListChecks, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingAgendaItems, type AgendaCategory } from '@/hooks/useMeetingAgendaItems';
import { useActionItemsByProject, useCreateActionItem } from '@/hooks/useActionItems';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useProjectDictionary, glossaryForAI } from '@/hooks/useProjectDictionary';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useDistributionLists } from '@/hooks/useDistributionLists';
import { resolveDistribution } from '@/lib/distribution';
import { useClickUpStatus } from '@/hooks/useClickUp';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  projectId: string; projectName: string; meeting: ConsultingMeeting; team: ProjectTeamMember[];
}

const CAT: Record<AgendaCategory, { label: string; hdr: string; box: string }> = {
  objective:  { label: 'Objectives',                 hdr: 'text-[var(--apas-sapphire)]', box: 'border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/5' },
  overdue:    { label: 'Overdue — needs attention',  hdr: 'text-[var(--apas-rose)]',     box: 'border-[var(--apas-rose)]/30 bg-[var(--apas-rose)]/5' },
  due:        { label: 'Due soon',                   hdr: 'text-[var(--apas-amber)]',    box: 'border-[var(--apas-amber)]/30 bg-[var(--apas-amber)]/5' },
  open:       { label: 'Open items',                 hdr: 'text-foreground',             box: 'border-border bg-card' },
  update:     { label: 'Updates since last meeting', hdr: 'text-muted-foreground',       box: 'border-border bg-muted/30' },
  decision:   { label: 'Decisions needed',           hdr: 'text-[var(--apas-gold,#C4A35A)]', box: 'border-[var(--accent)]/40 bg-accent/5' },
  next_step:  { label: 'Next steps',                 hdr: 'text-[var(--apas-emerald)]',  box: 'border-[var(--apas-emerald)]/30 bg-[var(--apas-emerald)]/5' },
  discussion: { label: 'Discussion',                 hdr: 'text-muted-foreground',       box: 'border-border bg-card' },
};
const ORDER: AgendaCategory[] = ['objective', 'overdue', 'due', 'open', 'update', 'decision', 'next_step', 'discussion'];
const AI_CATS: AgendaCategory[] = ['objective', 'decision', 'next_step', 'discussion'];
const day = (iso: string | null) => (iso ? new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso) : null);

export function AgendaBoardDialog({ open, onOpenChange, projectId, projectName, meeting, team }: Props) {
  const agenda = useMeetingAgendaItems(meeting.id, projectId);
  const { data: actionItems } = useActionItemsByProject(projectId);
  const { data: meetings } = useConsultingMeetings(projectId);
  const { data: dictionary } = useProjectDictionary(projectId);
  const createAction = useCreateActionItem(projectId);
  const sendEmail = useSendEmail();
  const listsApi = useDistributionLists({ projectId });
  const { data: clickup } = useClickUpStatus();

  const [building, setBuilding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);

  const items = agenda.data ?? [];
  const grouped = useMemo(() => ORDER.map((c) => ({ cat: c, items: items.filter((i) => i.category === c) })).filter((g) => g.items.length), [items]);
  const ownerName = (id: string | null) => { const m = team.find((t) => t.user_id === id); return m?.profile?.full_name || m?.profile?.email || null; };

  const build = async () => {
    setBuilding(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const soon = new Date(today.getTime() + 7 * 864e5);
      const open = (actionItems ?? []).filter((i) => i.status !== 'done' && i.status !== 'cancelled');
      const cat = (i: any): AgendaCategory => { const d = day(i.due_date); if (d && d < today) return 'overdue'; if (d && d <= soon) return 'due'; return 'open'; };
      const actionBoxes = open
        .map((i) => ({ category: cat(i), title: i.title, description: i.description, owner_name: i.assignee?.full_name || ownerName(i.assigned_to), due_date: i.due_date, action_item_id: i.id }))
        .sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1);

      const updates = (actionItems ?? []).filter((i) => i.status === 'done' && i.completed_at && new Date(i.completed_at).getTime() >= Date.now() - 14 * 864e5).map((i) => `${i.title} — completed`);
      const prior = (meetings ?? []).filter((m) => m.id !== meeting.id && m.minutes).sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1))[0];

      let ai: any = { objectives: [], updates: [], decisions: [], nextSteps: [] };
      try {
        const { data, error } = await supabase.functions.invoke('generate-meeting-agenda', {
          body: {
            projectName, glossary: glossaryForAI(dictionary),
            overdue: actionBoxes.filter((b) => b.category === 'overdue').map((b) => ({ title: b.title, owner: b.owner_name })),
            dueSoon: actionBoxes.filter((b) => b.category === 'due').map((b) => ({ title: b.title, owner: b.owner_name })),
            updates, priorMinutes: prior?.minutes ?? null,
          },
        });
        if (!error && !(data as any)?.error) ai = data;
      } catch { /* AI optional */ }

      const aiBoxes = [
        ...(ai.objectives ?? []).map((t: string) => ({ category: 'objective' as AgendaCategory, title: t })),
        ...(ai.updates ?? []).map((t: string) => ({ category: 'update' as AgendaCategory, title: t })),
        ...(ai.decisions ?? []).map((t: string) => ({ category: 'decision' as AgendaCategory, title: t })),
        ...(ai.nextSteps ?? []).map((t: string) => ({ category: 'next_step' as AgendaCategory, title: t })),
      ];

      await agenda.replaceAll.mutateAsync([...aiBoxes.filter((b) => b.category === 'objective'), ...actionBoxes, ...aiBoxes.filter((b) => b.category !== 'objective')]);
    } catch (e) {
      toast.error(`Couldn't build: ${e instanceof Error ? e.message : 'try again'}`);
    } finally { setBuilding(false); }
  };

  const docHtml = () => {
    const secs = grouped.map((g) => `<h3 style="font-size:14px;margin:18px 0 6px;color:#1A1714;">${CAT[g.cat].label}</h3>` +
      g.items.map((it) => `<div style="border:1px solid #eceae4;border-radius:8px;padding:8px 12px;margin-bottom:6px;">
        <div style="font-weight:500;font-size:14px;">${it.title}</div>
        ${it.owner_name || it.due_date ? `<div style="font-size:12px;color:#878581;">${[it.owner_name ? `Owner: ${it.owner_name}` : '', it.due_date ? `Due ${it.due_date}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
      </div>`).join('')).join('');
    return `<div style="max-width:660px;margin:0 auto;font-family:'DM Sans',Arial,sans-serif;color:#1A1714;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Meeting agenda · ${projectName}</div>
      <h1 style="font-size:22px;margin:6px 0 12px;">${meeting.title} — ${new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString()}</h1>${secs}</div>`;
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
  const printAgenda = () => { const w = window.open('', '_blank', 'width=720,height=900'); if (!w) return; w.document.write(`<!doctype html><html><body style="padding:28px;background:#FDFCF9;">${docHtml()}</body></html>`); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 300); };
  const pushClickUp = async () => {
    setPushing(true);
    try {
      const text = grouped.map((g) => `## ${CAT[g.cat].label}\n${g.items.map((i) => `- ${i.title}${i.owner_name ? ` (${i.owner_name})` : ''}`).join('\n')}`).join('\n\n');
      const { data, error } = await supabase.functions.invoke('clickup', { body: { action: 'create-note', projectId, title: `Agenda — ${meeting.title}`, content: text } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || 'ClickUp error');
      toast.success('Agenda pushed to ClickUp');
    } catch (e) { toast.error(`Couldn't push: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setPushing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-muted-foreground" />Agenda · {meeting.title}</DialogTitle>
          <DialogDescription>Trackable agenda for {new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString()}. Build it from open items, check them off as you go, email or push to ClickUp.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button size="sm" onClick={build} disabled={building} className="gap-1.5">{building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{items.length ? 'Rebuild agenda' : 'Build agenda'}</Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={printAgenda} disabled={!items.length} className="gap-1.5"><Printer className="h-4 w-4" />Print</Button>
            {clickup?.connected && <Button size="sm" variant="outline" onClick={pushClickUp} disabled={!items.length || pushing} className="gap-1.5">{pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}ClickUp</Button>}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No agenda yet. Hit <span className="font-medium text-foreground">Build agenda</span> to pull in overdue, due, and open items automatically.</div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.cat}>
                <div className={cn('text-xs font-bold uppercase tracking-widest mb-1.5', CAT[g.cat].hdr)}>{CAT[g.cat].label} <span className="text-muted-foreground font-normal">· {g.items.length}</span></div>
                <div className="space-y-1.5">
                  {g.items.map((it) => (
                    <div key={it.id} className={cn('flex items-start gap-2.5 rounded-lg border p-2.5', CAT[g.cat].box, it.discussed && 'opacity-55')}>
                      <Checkbox checked={it.discussed} onCheckedChange={(v) => agenda.toggle.mutate({ id: it.id, discussed: !!v })} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-sm font-medium', it.discussed && 'line-through')}>{it.title}</div>
                        {it.description && <div className="text-xs text-muted-foreground line-clamp-2">{it.description}</div>}
                        {(it.owner_name || it.due_date) && <div className="text-[11px] text-muted-foreground mt-0.5">{[it.owner_name, it.due_date ? `due ${new Date(it.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''].filter(Boolean).join(' · ')}</div>}
                      </div>
                      {AI_CATS.includes(it.category) && !it.action_item_id && (
                        <button title="Make an action item" className="shrink-0 text-[11px] text-muted-foreground hover:text-[var(--apas-sapphire)] inline-flex items-center gap-0.5" onClick={() => createAction.mutate({ title: it.title, description: it.description ?? undefined })}><Plus className="h-3 w-3" />action</button>
                      )}
                      <button className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground/60 hover:text-destructive" title="Remove" onClick={() => agenda.remove.mutate(it.id)}><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 border-t pt-3">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { agenda.addItem.mutate({ title: newItem.trim(), category: 'discussion' }); setNewItem(''); } }} placeholder="Add a discussion point…" className="h-9" />
              <Button size="sm" variant="outline" disabled={!newItem.trim()} onClick={() => { agenda.addItem.mutate({ title: newItem.trim(), category: 'discussion' }); setNewItem(''); }}><Plus className="h-4 w-4" /></Button>
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
