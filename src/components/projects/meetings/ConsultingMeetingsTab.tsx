import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MessageSquareText, MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useActionItemsByProject } from '@/hooks/useActionItems';
import { ConsultingMeetingDetail } from './ConsultingMeetingDetail';

export function ConsultingMeetingsTab({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: meetings, isLoading, create, remove } = useConsultingMeetings(projectId);
  const { data: items } = useActionItemsByProject(projectId);
  const [openId, setOpenId] = useState<string | null>(null);

  const active = meetings?.find((m) => m.id === openId) ?? null;
  const itemCount = (mid: string) => (items ?? []).filter((i) => i.meeting_id === mid).length;

  const addMeeting = async () => {
    const m = await create.mutateAsync({ title: 'Meeting', meeting_date: new Date().toISOString().slice(0, 10) });
    setOpenId((m as ConsultingMeeting).id);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-muted-foreground" />Meetings &amp; minutes</h2>
          <p className="text-sm text-muted-foreground">Minutes + transcript. Turn the transcript into action items for that day.</p>
        </div>
        <Button onClick={addMeeting} disabled={create.isPending} className="gap-1.5"><Plus className="h-4 w-4" />New meeting</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : (meetings ?? []).length === 0 ? (
        <Card className="p-10 text-center">
          <MessageSquareText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No meetings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Log a meeting, drop in the transcript, and pull out the action items.</p>
          <Button onClick={addMeeting} disabled={create.isPending} className="gap-1.5"><Plus className="h-4 w-4" />New meeting</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y">
          {(meetings ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(m.id)}>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(m.meeting_date + 'T00:00:00'), 'EEE, MMM d, yyyy')}{m.attendees ? ` · ${m.attendees}` : ''}</div>
              </div>
              {itemCount(m.id) > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">{itemCount(m.id)} action{itemCount(m.id) === 1 ? '' : 's'}</span>}
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove.mutate(m.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ConsultingMeetingDetail open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} projectId={projectId} projectName={projectName} meeting={active} />
    </div>
  );
}
