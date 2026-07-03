import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, RefreshCw, Send, Link2, Save, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import { useActionItemsByProject } from '@/hooks/useActionItems';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useProjectDictionary, glossaryForAI } from '@/hooks/useProjectDictionary';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useDistributionLists } from '@/hooks/useDistributionLists';
import { resolveDistribution } from '@/lib/distribution';
import { useClickUpStatus } from '@/hooks/useClickUp';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  meeting: ConsultingMeeting;
  team: ProjectTeamMember[];
}

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const day = (iso: string | null) => (iso ? new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso) : null);

const shell = (inner: string, title: string) =>
  `<div style="max-width:660px;margin:0 auto;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1714;line-height:1.6;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Meeting agenda</div>
    <h1 style="font-size:23px;margin:6px 0 16px;font-weight:700;">${title}</h1>${inner}
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eceae4;font-size:12px;color:#a8a49c;">Sent from Build OS · projos.ai</div>
  </div>`;

export function MeetingAgendaDialog({ open, onOpenChange, projectId, projectName, meeting, team }: Props) {
  const { data: items } = useActionItemsByProject(projectId);
  const { data: meetings, update } = useConsultingMeetings(projectId);
  const { data: dictionary } = useProjectDictionary(projectId);
  const listsApi = useDistributionLists({ projectId });
  const sendEmail = useSendEmail();
  const { data: clickup } = useClickUpStatus();

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [pushing, setPushing] = useState(false);

  const ownerName = (id: string | null) => {
    const m = team.find((t) => t.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || null;
  };

  const payload = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const soon = new Date(today.getTime() + 7 * 864e5);
    const open = (items ?? []).filter((i) => i.status !== 'done' && i.status !== 'cancelled');
    const overdue = open.filter((i) => { const d = day(i.due_date); return d && d < today; })
      .map((i) => ({ title: i.title, owner: i.assignee?.full_name || ownerName(i.assigned_to), daysLate: Math.floor((today.getTime() - day(i.due_date)!.getTime()) / 864e5) }))
      .sort((a, b) => b.daysLate - a.daysLate);
    const dueSoon = open.filter((i) => { const d = day(i.due_date); return d && d >= today && d <= soon; })
      .map((i) => ({ title: i.title, owner: i.assignee?.full_name || ownerName(i.assigned_to), due: i.due_date }));
    const updates = (items ?? [])
      .filter((i) => i.status === 'done' && i.completed_at && new Date(i.completed_at).getTime() >= Date.now() - 14 * 864e5)
      .map((i) => `${i.title} — completed`);
    const prior = (meetings ?? []).filter((m) => m.id !== meeting.id && m.minutes)
      .sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1))[0];
    return { projectName, glossary: glossaryForAI(dictionary), overdue, dueSoon, updates, priorMinutes: prior?.minutes ?? null };
  }, [items, meetings, dictionary, team, meeting, projectName]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-meeting-agenda', { body: payload });
      if (error) throw new Error(error.message || 'AI request failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft((data as any)?.html ?? '');
    } catch (e) {
      toast.error(`Couldn't build agenda: ${e instanceof Error ? e.message : 'try again'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) { setDraft(meeting.agenda || ''); setSelectedLists(new Set()); setEmails([]); if (!meeting.agenda) generate(); } }, [open]);

  const title = `${projectName} — agenda (${new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString()})`;
  const addEmail = () => { const e = emailInput.trim().toLowerCase(); if (!isEmail(e)) { toast.error('Enter a valid email.'); return; } if (!emails.includes(e)) setEmails([...emails, e]); setEmailInput(''); };

  const saveAgenda = () => update.mutate({ id: meeting.id, agenda: draft } as never, { onSuccess: () => toast.success('Agenda saved to the meeting') });

  const emailAgenda = async () => {
    if (selectedLists.size === 0 && emails.length === 0) { toast.error('Add a recipient or group.'); return; }
    try {
      const recips = await resolveDistribution({ listIds: [...selectedLists], extraEmails: emails });
      const to = [...new Set(recips.map((r) => r.email).filter(Boolean))];
      if (!to.length) { toast.error('No recipients with emails.'); return; }
      await sendEmail.mutateAsync({ recipients: to, subject: `Agenda: ${projectName}`, bodyHtml: shell(draft, title) });
    } catch (e) { toast.error(`Couldn't send: ${e instanceof Error ? e.message : 'try again'}`); }
  };

  const pushClickUp = async () => {
    setPushing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickup', {
        body: { action: 'create-note', projectId, title: `Agenda — ${new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString()}`, content: draft.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() },
      });
      if (error) throw new Error(error.message || 'ClickUp request failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Agenda pushed to ClickUp', (data as any)?.url ? { action: { label: 'Open', onClick: () => window.open((data as any).url, '_blank') } } : undefined);
    } catch (e) { toast.error(`Couldn't push: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setPushing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting agenda</DialogTitle>
          <DialogDescription>Built from open &amp; overdue items, recent updates, and last meeting's notes. Edit it, then save, email, or push to ClickUp.</DialogDescription>
        </DialogHeader>

        {loading && !draft ? (
          <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Building your agenda…</div>
        ) : (
          <div className="space-y-4">
            <ProRichTextEditor content={draft} onChange={setDraft} minHeight="280px" placeholder="Your meeting agenda…" />

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button size="sm" variant="ghost" onClick={generate} disabled={loading} className="gap-1.5">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Regenerate</Button>
              <Button size="sm" variant="outline" onClick={saveAgenda} disabled={!draft} className="gap-1.5"><Save className="h-4 w-4" />Save to meeting</Button>
              {clickup?.connected && <Button size="sm" variant="outline" onClick={pushClickUp} disabled={!draft || pushing} className="gap-1.5">{pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Push to ClickUp</Button>}
            </div>

            {/* Email */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email the agenda</div>
              {(listsApi.data ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(listsApi.data ?? []).map((l) => (
                    <label key={l.id} className="flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 cursor-pointer">
                      <Checkbox checked={selectedLists.has(l.id)} onCheckedChange={() => setSelectedLists((p) => { const n = new Set(p); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })} />
                      <Users className="h-3 w-3" />{l.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="name@company.com" className="h-9" />
                <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={addEmail}><Plus className="h-4 w-4" /></Button>
                <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={emailAgenda} disabled={sendEmail.isPending || !draft}>{sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</Button>
              </div>
              {emails.length > 0 && <div className="flex flex-wrap gap-1.5">{emails.map((e) => <Badge key={e} variant="secondary" className="gap-1">{e}<button onClick={() => setEmails(emails.filter((x) => x !== e))}><X className="h-3 w-3" /></button></Badge>)}</div>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
