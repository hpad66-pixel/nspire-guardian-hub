import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Send, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useDistributionLists } from '@/hooks/useDistributionLists';
import { resolveDistribution } from '@/lib/distribution';
import { useClickUpStatus, usePushToClickUp } from '@/hooks/useClickUp';
import { buildMeetingRecapHtml, type RecapItem } from '@/lib/meetings/recapDocument';
import type { ActionItem } from '@/hooks/useActionItems';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  meeting: { title: string; meeting_date: string; attendees: string | null; transcript: string | null };
  minutesHtml: string;
  items: ActionItem[];
  team: ProjectTeamMember[];
}

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function MeetingRecapDialog({ open, onOpenChange, projectId, projectName, meeting, minutesHtml, items, team }: Props) {
  const listsApi = useDistributionLists({ projectId });
  const lists = listsApi.data;
  const sendEmail = useSendEmail();
  const { data: clickup } = useClickUpStatus();
  const pushClickUp = usePushToClickUp();

  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [groupName, setGroupName] = useState('');
  const [alsoClickUp, setAlsoClickUp] = useState(true);
  const [sending, setSending] = useState(false);

  const ownerName = (id: string | null) => {
    const m = team.find((t) => t.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || null;
  };

  const recapHtml = useMemo(() => {
    const recapItems: RecapItem[] = items.map((it) => ({
      title: it.title, description: it.description, ownerName: it.assignee?.full_name || ownerName(it.assigned_to),
      due: it.due_date, priority: it.priority,
    }));
    return buildMeetingRecapHtml({
      projectName, title: meeting.title, date: meeting.meeting_date, attendees: meeting.attendees,
      minutesHtml, items: recapItems, transcript: meeting.transcript,
    });
  }, [items, minutesHtml, meeting, projectName, team]);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!isEmail(e)) { toast.error('Enter a valid email.'); return; }
    if (!emails.includes(e)) setEmails([...emails, e]);
    setEmailInput('');
  };

  const toggleList = (id: string) => setSelectedLists((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const handleSend = async () => {
    if (selectedLists.size === 0 && emails.length === 0) { toast.error('Add at least one recipient or group.'); return; }
    setSending(true);
    try {
      const recipients = await resolveDistribution({ listIds: [...selectedLists], extraEmails: emails });
      const to = [...new Set(recipients.map((r) => r.email).filter(Boolean))];
      if (!to.length) { toast.error('Those groups have no members with emails.'); return; }

      await sendEmail.mutateAsync({
        recipients: to,
        subject: `Meeting recap: ${meeting.title}`,
        bodyHtml: recapHtml,
      });

      // Optionally save the typed emails as a reusable group. Members store the
      // address in `email_override` (not `email`); that's what resolveDistribution reads.
      if (groupName.trim() && emails.length) {
        try {
          const list = await listsApi.create.mutateAsync({ name: groupName.trim(), scope: 'project', projectId });
          const { error: memErr } = await supabase
            .from('distribution_list_members' as never)
            .insert(emails.map((e) => ({ list_id: (list as any).id, email_override: e })) as never);
          if (memErr) throw memErr;
          toast.success(`Saved group “${groupName.trim()}”`);
        } catch (e) {
          toast.error(`Recap sent, but couldn't save the group: ${e instanceof Error ? e.message : 'try again'}`);
        }
      }

      // Optionally push the action items to ClickUp.
      if (alsoClickUp && clickup?.connected) {
        for (const it of items) { try { await pushClickUp.mutateAsync(it.id); } catch { /* per-item */ } }
      }

      toast.success(`Recap sent to ${to.length} recipient${to.length === 1 ? '' : 's'}${alsoClickUp && clickup?.connected ? ' · pushed to ClickUp' : ''}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(`Couldn't send: ${e instanceof Error ? e.message : 'try again'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send meeting recap</DialogTitle>
          <DialogDescription>Emails the summary, action items, and transcript as a branded message. Pick people or a group.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Recipients */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5 mb-1.5"><Users className="h-3.5 w-3.5" />Groups</Label>
              {(lists ?? []).length > 0 ? (
                <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                  {(lists ?? []).map((l) => (
                    <label key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedLists.has(l.id)} onCheckedChange={() => toggleList(l.id)} />
                      {l.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2.5">No saved groups yet. Add emails below and give them a group name to reuse next time.</p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Individual emails</Label>
              <div className="flex gap-2">
                <Input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="name@company.com" className="h-9" />
                <Button type="button" size="sm" variant="outline" className="h-9 shrink-0" onClick={addEmail}><Plus className="h-4 w-4" /></Button>
              </div>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {emails.map((e) => (
                    <Badge key={e} variant="secondary" className="gap-1">{e}<button onClick={() => setEmails(emails.filter((x) => x !== e))}><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
              )}
              {emails.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Save these emails as a group (name it, e.g. “Fog IQ core team”)…" className="h-8 text-xs" />
                </div>
              )}
            </div>

            {clickup?.connected && (
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Also push action items to ClickUp</span>
                <Switch checked={alsoClickUp} onCheckedChange={setAlsoClickUp} />
              </label>
            )}

            <Button onClick={handleSend} disabled={sending} className="w-full gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send recap
            </Button>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-xs mb-1.5 block">Preview</Label>
            <div className="rounded-lg border bg-white p-4 max-h-[420px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: recapHtml }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
