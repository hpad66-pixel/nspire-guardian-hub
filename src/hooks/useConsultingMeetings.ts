import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsultingMeeting {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  attendees: string | null;
  minutes: string | null;
  transcript: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingInput = Partial<Pick<ConsultingMeeting, 'title' | 'meeting_date' | 'attendees' | 'minutes' | 'transcript'>>;

const table = () => supabase.from('consulting_meetings' as never) as any;

export function useConsultingMeetings(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['consulting-meetings', projectId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as ConsultingMeeting[];
      const { data, error } = await table().select('*').eq('project_id', projectId).order('meeting_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsultingMeeting[];
    },
    enabled: !!projectId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['consulting-meetings', projectId] });

  const create = useMutation({
    mutationFn: async (input: MeetingInput) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await table().insert({
        project_id: projectId,
        title: input.title ?? 'Meeting',
        meeting_date: input.meeting_date ?? new Date().toISOString().slice(0, 10),
        attendees: input.attendees ?? null,
        minutes: input.minutes ?? null,
        transcript: input.transcript ?? null,
        created_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      return data as ConsultingMeeting;
    },
    onSuccess: () => { invalidate(); toast.success('Meeting added'); },
    onError: (e: Error) => toast.error(`Couldn't add meeting: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MeetingInput & { id: string }) => {
      const { error } = await table().update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Couldn't save meeting: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Meeting deleted'); },
    onError: (e: Error) => toast.error(`Couldn't delete meeting: ${e.message}`),
  });

  return { ...list, create, update, remove };
}
