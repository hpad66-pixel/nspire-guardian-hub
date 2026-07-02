import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Plus, Loader2, CheckSquare, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useActionItemsByProject, useCreateActionItem, useUpdateActionItem, type ActionItem } from '@/hooks/useActionItems';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { ActionItemDetailDialog } from '@/components/projects/actionItems/ActionItemDetailDialog';
import { PRIORITY_META } from '@/components/projects/actionItems/actionItemMeta';

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

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [attendees, setAttendees] = useState('');
  const [minutes, setMinutes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [selected, setSelected] = useState<ActionItem | null>(null);

  useEffect(() => {
    if (!meeting) return;
    setTitle(meeting.title ?? '');
    setDate(meeting.meeting_date ?? '');
    setAttendees(meeting.attendees ?? '');
    setMinutes(meeting.minutes ?? '');
    setTranscript(meeting.transcript ?? '');
  }, [meeting, open]);

  const linkedItems = useMemo(
    () => (allItems ?? []).filter((i) => i.meeting_id === meeting?.id),
    [allItems, meeting],
  );

  if (!meeting) return null;
  const save = (patch: Record<string, unknown>) => update.mutate({ id: meeting.id, ...patch });

  const addItem = (payload: { title: string; description?: string; priority?: ActionItem['priority'] }) =>
    createItem.mutateAsync({ ...payload, meeting_id: meeting.id, due_date: meeting.meeting_date });

  const handleExtract = async () => {
    if (!transcript.trim()) { toast.error('Paste the transcript or notes first.'); return; }
    setExtracting(true);
    try {
      // Persist the transcript first so it isn't lost.
      save({ transcript });
      const { data, error } = await supabase.functions.invoke('extract-action-items', {
        body: { text: transcript, projectName },
      });
      if (error) throw error;
      const items: Array<{ title: string; description?: string; priority?: ActionItem['priority'] }> = data?.items ?? [];
      if (!items.length) { toast.message('No action items found in that text.'); return; }
      for (const it of items) await addItem({ title: it.title, description: it.description, priority: it.priority });
      toast.success(`Added ${items.length} action item${items.length === 1 ? '' : 's'}`);
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
          <DialogHeader><DialogTitle>Meeting</DialogTitle></DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5 md:col-span-1">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== meeting.title && save({ title })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => date !== meeting.meeting_date && save({ meeting_date: date })} />
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
              <div className="flex justify-end">
                <Button size="sm" onClick={handleExtract} disabled={extracting || !transcript.trim()} className="gap-1.5">
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Extract action items
                </Button>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-muted-foreground" />Action items from this meeting</div>
                <span className="text-xs text-muted-foreground">{linkedItems.length}</span>
              </div>

              <div className="rounded-lg border divide-y mb-2">
                {linkedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-4">None yet. Extract from the transcript, or add one below.</p>
                ) : linkedItems.map((item) => {
                  const done = item.status === 'done' || item.status === 'cancelled';
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(item)}>
                      <div onClick={(e) => e.stopPropagation()}><Checkbox checked={done} onCheckedChange={() => toggleDone(item)} /></div>
                      <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_META[item.priority].dot)} />
                      <span className={cn('text-sm flex-1 truncate', done && 'line-through text-muted-foreground')}>{item.title}</span>
                      {(item.comment_count ?? 0) > 0 && <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{item.comment_count}</span>}
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

      <ActionItemDetailDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} projectId={projectId} item={selected} scopes={scopes ?? []} team={team ?? []} />
    </>
  );
}
