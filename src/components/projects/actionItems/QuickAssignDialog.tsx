import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckSquare2, Loader2, Trello as TrelloIcon, AlertCircle } from 'lucide-react';
import { useCreateActionItem, type ActionItem } from '@/hooks/useActionItems';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { useProjectContacts } from '@/hooks/useProjectPeople';
import { usePushToTrello, useTrelloStatus } from '@/hooks/useTrello';
import { TeamWatcherPicker } from './TeamWatcherPicker';

const UNASSIGNED = '__unassigned__';
const contactKey = (id: string) => `contact:${id}`;
const userKey = (id: string) => `user:${id}`;

export function QuickAssignDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
}) {
  const create = useCreateActionItem(projectId);
  const { data: team = [] } = useProjectTeamMembers(projectId);
  const { data: contacts = [] } = useProjectContacts(projectId);
  const { data: trello } = useTrelloStatus();
  const pushTrello = usePushToTrello();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState(UNASSIGNED);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<ActionItem['priority']>('medium');
  const [sendToTrello, setSendToTrello] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(''); setDescription(''); setOwner(UNASSIGNED); setWatcherIds([]); setDueDate(''); setPriority('medium');
    setSendToTrello(Boolean(trello?.connected && trello.autoPush));
  }, [open, trello?.connected, trello?.autoPush]);

  const selectedContact = useMemo(() => {
    if (!owner.startsWith('contact:')) return null;
    return contacts.find((c) => c.contactId === owner.slice('contact:'.length)) ?? null;
  }, [owner, contacts]);

  const submit = async () => {
    if (!title.trim()) return;
    const assignedUserId = owner.startsWith('user:') ? owner.slice('user:'.length) : null;
    const assignedContactId = owner.startsWith('contact:') ? owner.slice('contact:'.length) : null;
    const created = await create.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to: assignedUserId,
      assigned_contact_id: assignedContactId,
      watcher_ids: watcherIds,
      due_date: dueDate || null,
      priority,
      suppress_trello_auto_push: true,
    });
    if (sendToTrello && trello?.connected && created?.id) {
      try { await pushTrello.mutateAsync(created.id); }
      catch { /* task is already safely created; Trello hook surfaces its error */ }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckSquare2 className="h-5 w-5 text-[var(--apas-sapphire)]" />Assign project instruction</DialogTitle>
          <DialogDescription>
            Assign to internal team or project CRM contacts. Everyone with an email gets a branded action card — portal access is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="instruction-title">Instruction</Label>
            <Input id="instruction-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="instruction-detail">Details</Label>
            <Textarea id="instruction-detail" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Context, expected result, links, or constraints…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Accountable owner</Label>
              <Select value={owner} onValueChange={(value) => { setOwner(value); if (value.startsWith('user:')) setWatcherIds((ids) => ids.filter((id) => id !== value.slice('user:'.length))); }}>
                <SelectTrigger><SelectValue placeholder="Choose owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {team.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Internal team</SelectLabel>
                      {team.map((member) => (
                        <SelectItem key={member.user_id} value={userKey(member.user_id)}>
                          {member.profile?.full_name || member.profile?.email || 'Team member'}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {contacts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Project contacts (CRM)</SelectLabel>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.contactId} value={contactKey(contact.contactId)} disabled={!contact.email}>
                          {contact.name}{contact.email ? ` · ${contact.email}` : ' · no email'}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {selectedContact && (
                <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{selectedContact.name}</span>
                      <Badge variant="secondary" className="text-[10px]">No portal access</Badge>
                    </div>
                    <p className="mt-0.5">That’s fine — they’ll still get a branded email card with due date and a secure link to update this action.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as ActionItem['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>CC / followers (internal)</Label>
              <TeamWatcherPicker team={team} value={watcherIds} onChange={setWatcherIds} excludeUserId={owner.startsWith('user:') ? owner.slice('user:'.length) : null} />
            </div>
          </div>

          {trello?.connected && (
            <div className="flex items-center justify-between rounded-lg border border-[#0C66E4]/20 bg-[#0C66E4]/5 p-3 gap-4">
              <div className="flex items-start gap-2">
                <TrelloIcon className="h-4 w-4 text-[#0C66E4] mt-0.5" />
                <div><p className="text-sm font-medium">Send to Trello</p><p className="text-xs text-muted-foreground">Creates a card and adds matched owner/followers for Trello mobile alerts.</p></div>
              </div>
              <Switch checked={sendToTrello} onCheckedChange={setSendToTrello} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending || pushTrello.isPending}>
            {(create.isPending || pushTrello.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Assign &amp; email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
