import { useState } from 'react';
import { toDateOnly } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MessageSquareText, MoreHorizontal, Trash2, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useConsultingMeetings, type ConsultingMeeting } from '@/hooks/useConsultingMeetings';
import { useActionItemsByProject } from '@/hooks/useActionItems';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { ConsultingMeetingDetail } from './ConsultingMeetingDetail';
import { AgendaBoardDialog } from './AgendaBoardDialog';

export function ConsultingMeetingsTab({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: meetings, isLoading, create, remove } = useConsultingMeetings(projectId);
  const { data: items } = useActionItemsByProject(projectId);
  const { data: team } = useProjectTeamMembers(projectId);
  const [view, setView] = useState<'meetings' | 'agendas'>('meetings');
  const [openId, setOpenId] = useState<string | null>(null);
  const [agendaId, setAgendaId] = useState<string | null>(null);

  const active = meetings?.find((m) => m.id === openId) ?? null;
  const activeAgenda = meetings?.find((m) => m.id === agendaId) ?? null;
  const itemCount = (mid: string) => (items ?? []).filter((i) => i.meeting_id === mid).length;
  const isAgendas = view === 'agendas';

  const addMeeting = async () => {
    const m = await create.mutateAsync({ title: 'Meeting', meeting_date: toDateOnly(new Date()) });
    if (isAgendas) setAgendaId((m as ConsultingMeeting).id); else setOpenId((m as ConsultingMeeting).id);
  };

  const openRow = (id: string) => (isAgendas ? setAgendaId(id) : setOpenId(id));

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-muted-foreground" />Meetings &amp; agenda</h2>
          <p className="text-sm text-muted-foreground">{isAgendas ? 'Build a trackable agenda from open items before each meeting.' : 'Minutes + transcript. Turn the transcript into action items.'}</p>
        </div>
        <Button onClick={addMeeting} disabled={create.isPending} className="gap-1.5"><Plus className="h-4 w-4" />New meeting</Button>
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
        {(['meetings', 'agendas'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn('px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5',
              view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {v === 'meetings' ? <MessageSquareText className="h-3.5 w-3.5" /> : <ListChecks className="h-3.5 w-3.5" />}
            {v === 'meetings' ? 'Meetings' : 'Agendas'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : (meetings ?? []).length === 0 ? (
        <Card className="p-10 text-center">
          {isAgendas ? <ListChecks className="h-8 w-8 mx-auto text-muted-foreground mb-3" /> : <MessageSquareText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />}
          <p className="font-medium">No meetings yet</p>
          <p className="text-sm text-muted-foreground mb-4">{isAgendas ? 'Create a meeting, then build its agenda from your open items.' : 'Log a meeting, drop in the transcript, and pull out the action items.'}</p>
          <Button onClick={addMeeting} disabled={create.isPending} className="gap-1.5"><Plus className="h-4 w-4" />New meeting</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y">
          {(meetings ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => openRow(m.id)}>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(m.meeting_date + 'T00:00:00'), 'EEE, MMM d, yyyy')}{m.attendees ? ` · ${m.attendees}` : ''}</div>
              </div>
              {isAgendas
                ? <span className="text-xs text-[var(--apas-sapphire)] whitespace-nowrap inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />Agenda</span>
                : itemCount(m.id) > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">{itemCount(m.id)} action{itemCount(m.id) === 1 ? '' : 's'}</span>}
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
      {activeAgenda && <AgendaBoardDialog open={!!agendaId} onOpenChange={(v) => !v && setAgendaId(null)} projectId={projectId} projectName={projectName} meeting={activeAgenda} team={team ?? []} />}
    </div>
  );
}
