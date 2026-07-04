import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Plus, Loader2, CheckSquare, MessageSquare, Send, X, Trash2, BookMarked, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useActionItemsByProject, useCreateActionItem, useUpdateActionItem, useDeleteActionItem, type ActionItem } from '@/hooks/useActionItems';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { ActionItemDetailDialog } from '@/components/projects/actionItems/ActionItemDetailDialog';
import { MeetingRecapDialog } from './MeetingRecapDialog';
import { ProjectDictionaryDialog } from '@/components/projects/ProjectDictionaryDialog';
import { AgendaBoardDialog } from './AgendaBoardDialog';
import { useProjectDictionary, glossaryForAI } from '@/hooks/useProjectDictionary';
import { PRIORITY_META } from '@/components/projects/actionItems/actionItemMeta';
import { useClickUpStatus, usePushToClickUp } from '@/hooks/useClickUp';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  meeting: ConsultingMeeting | null;
}

export function ConsultingMeetingDetail({ open, onOpenChange, projectId, projectName, meeting }: Props) {
  const { update } = useConsultingMeetings(projectId);
  const { data: allItems } = useActionItemsByProject(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const { data: team } = useProjectTeamMembers(projectId);
  const createItem = useCreateActionItem(projectId);
  const updateItem = useUpdateActionItem(projectId);
  const deleteItem = useDeleteActionItem(projectId);
  const { data: clickup } = useClickUpStatus();
  const pushClickUp = usePushToClickUp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [attendees, setAttendees] = useState('');
  const [minutes, setMinutes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const aiEnabled = useAiEnabled();
  const [newItem, setNewItem] = useState('');
  const [selected, setSelected] = useState<ActionItem | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const { data: dictionary } = useProjectDictionary(projectId);

  // Seed local fields only when the dialog opens or a DIFFERENT meeting is
  // shown — NOT on every refetch. Otherwise saving one field triggers a refetch
  // that resets the others mid-edit (the "can't change the date" bug).
  useEffect(() => {
    if (!meeting) return;
    setTitle(meeting.title ?? '');
    setDate(meeting.meeting_date ?? '');
    setAttendees(meeting.attendees ?? '');
    setMinutes(meeting.minutes ?? '');
    setTranscript(meeting.transcript ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.id, open]);

  const linkedItems = useMemo(
    () => (allItems ?? []).filter((i) => i.meeting_id === meeting?.id),
    [allItems, meeting],
  );

  if (!meeting) return null;
  const save = (patch: Record<string, unknown>) => update.mutate({ id: meeting.id, ...patch });

  const addItem = async (payload: { title: string; description?: string; priority?: ActionItem['priority']; assigned_to?: string | null; due_date?: string | null }) => {
    const created: any = await createItem.mutateAsync({
      ...payload,
      meeting_id: meeting.id,
      due_date: payload.due_date ?? meeting.meeting_date,
    });
    if (clickup?.connected && clickup.autoPush && created?.id) pushClickUp.mutate(created.id);
    return created;
  };

  const handleExtract = async () => {
    if (!transcript.trim()) { toast.error('Paste the transcript or notes first.'); return; }
    setExtracting(true);
    try {
      // Persist the transcript first so it isn't lost.
      save({ transcript });
      const { data, error } = await supabase.functions.invoke('extract-action-items', {
        body: {
          text: transcript,
          projectName,
          meetingDate: meeting.meeting_date,
          teamMembers: (team ?? []).map((m) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || '' })).filter((m) => m.name),
          glossary: glossaryForAI(dictionary),
        },
      });
      if (error) throw error;
      const draftMinutes: string = (data?.minutes as string) || '';
      const items: Array<{ title: string; description?: string; priority?: ActionItem['priority']; assignee_id?: string | null; due_date?: string | null }> = data?.items ?? [];

      // Fill the minutes editor with the AI summary, and persist it.
      if (draftMinutes) { setMinutes(draftMinutes); save({ minutes: draftMinutes }); }

      await Promise.all(items.map((it) => addItem({ title: it.title, description: it.description, priority: it.priority, assigned_to: it.assignee_id ?? null, due_date: it.due_date ?? null })));

      const assigned = items.filter((i) => i.assignee_id).length;
      const parts: string[] = [];
      if (draftMinutes) parts.push('minutes drafted');
      if (items.length) parts.push(`${items.length} action item${items.length === 1 ? '' : 's'}${assigned ? ` (${assigned} assigned)` : ''}`);
      if (parts.length) toast.success(parts.join(' · '));
      else toast.message('Nothing to summarize or extract from that text.');
    } catch (e) {
      toast.error(`Couldn't extract: ${e instanceof Error ? e.message : 'try again'}`);
    } finally {
      setExtracting(false);
    }
  };

  const toggleDone = (item: ActionItem) =>
    updateItem.mutate({ id: item.id, status: item.status === 'done' ? 'todo' : 'done', previous_assigned_to: item.assigned_to } as never);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[820px] max-h-[92vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-2 pr-8">
            <DialogTitle>Meeting</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAgendaOpen(true)}><CalendarClock className="h-4 w-4" />Agenda</Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRecapOpen(true)}><Send className="h-4 w-4" />Send recap</Button>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5 md:col-span-1">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== meeting.title && save({ title })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => { if (date && date !== meeting.meeting_date) update.mutate({ id: meeting.id, meeting_date: date } as never, { onSuccess: () => toast.success('Meeting date updated') }); }} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Attendees</Label>
                <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} onBlur={() => attendees !== (meeting.attendees ?? '') && save({ attendees })} placeholder="Names, comma-separated" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Minutes</Label>
              <ProRichTextEditor content={minutes} onChange={setMinutes} minHeight="180px" placeholder="Write the meeting minutes…" />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled={minutes === (meeting.minutes ?? '')} onClick={() => save({ minutes })}>Save minutes</Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Transcript</Label>
              <Textarea rows={5} value={transcript} onChange={(e) => setTranscript(e.target.value)} onBlur={() => transcript !== (meeting.transcript ?? '') && save({ transcript })} placeholder="Paste or dump the meeting transcript here…" />
              <div className="flex justify-between items-center">
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setDictOpen(true)}>
                  <BookMarked className="h-4 w-4" />Vocabulary{(dictionary ?? []).length ? ` (${(dictionary ?? []).length})` : ''}
                </Button>
                {aiEnabled && (
                  <Button size="sm" onClick={handleExtract} disabled={extracting || !transcript.trim()} className="gap-1.5">
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {extracting ? 'Summarizing…' : 'Summarize & extract'}
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-muted-foreground" />Action items from this meeting</div>
                <div className="flex items-center gap-2">
                  {confirmClear ? (
                    <>
                      <span className="text-xs text-muted-foreground">Delete all {linkedItems.length}?</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { linkedItems.forEach((i) => deleteItem.mutate(i.id)); setConfirmClear(false); }}>Delete</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirmClear(false)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">{linkedItems.length}</span>
                      {linkedItems.length > 0 && (
                        <button className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1" onClick={() => setConfirmClear(true)}>
                          <Trash2 className="h-3 w-3" />Clear all
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border divide-y mb-2">
                {linkedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-4">None yet. Extract from the transcript, or add one below.</p>
                ) : linkedItems.map((item) => {
                  const done = item.status === 'done' || item.status === 'cancelled';
                  return (
                    <div key={item.id} className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(item)}>
                      <div onClick={(e) => e.stopPropagation()}><Checkbox checked={done} onCheckedChange={() => toggleDone(item)} /></div>
                      <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                      <span className={cn('text-sm flex-1 truncate', done && 'line-through text-muted-foreground')}>{item.title}</span>
                      {(item.comment_count ?? 0) > 0 && <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{item.comment_count}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem.mutate(item.id); }}
                        className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete action item"
                        aria-label="Delete action item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addItem({ title: newItem.trim() }); setNewItem(''); } }} placeholder="Add an action item and press Enter…" className="h-9" />
                <Button size="sm" variant="outline" disabled={!newItem.trim()} onClick={() => { addItem({ title: newItem.trim() }); setNewItem(''); }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ActionItemDetailDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} projectId={projectId} item={selected} scopes={scopes ?? []} team={team ?? []} projectName={projectName} />

      <ProjectDictionaryDialog open={dictOpen} onOpenChange={setDictOpen} projectId={projectId} projectName={projectName} />

      <AgendaBoardDialog open={agendaOpen} onOpenChange={setAgendaOpen} projectId={projectId} projectName={projectName} meeting={meeting} team={team ?? []} />

      <MeetingRecapDialog
        open={recapOpen}
        onOpenChange={setRecapOpen}
        projectId={projectId}
        projectName={projectName}
        meeting={{ title: meeting.title, meeting_date: meeting.meeting_date, attendees: meeting.attendees, transcript }}
        minutesHtml={minutes || meeting.minutes || ''}
        items={linkedItems}
        team={team ?? []}
      />
    </>
  );
}
