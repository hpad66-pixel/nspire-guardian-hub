import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface MeetingAttendee {
  name: string;
  role?: string;
  company?: string;
}

export interface ProjectMeeting {
  id: string;
  project_id: string;
  meeting_date: string;
  meeting_time?: string;
  meeting_type: string;
  location?: string;
  title: string;
  attendees: MeetingAttendee[];
  raw_notes?: string;
  polished_notes?: string;
  polished_notes_html?: string;
  status: 'draft' | 'reviewed' | 'finalized';
  reviewed_by?: string;
  reviewed_at?: string;
  finalized_by?: string;
  finalized_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useProjectMeetings(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['project-meetings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_meetings')
        .select('*')
        .eq('project_id', projectId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      return ((data || []) as unknown[]).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        return {
          ...row,
          attendees: (row.attendees as MeetingAttendee[]) || [],
        } as ProjectMeeting;
      });
    },
    enabled: !!projectId,
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: Omit<ProjectMeeting, 'id' | 'created_at' | 'updated_at'>) => {
      const payload = { ...meeting, attendees: meeting.attendees as unknown as Json, created_by: user?.id };
      const { data, error } = await supabase
        .from('project_meetings')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-meetings', projectId] });
      toast.success('Meeting created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, attendees, ...updates }: Partial<ProjectMeeting> & { id: string }) => {
      const payload = { ...updates, ...(attendees !== undefined ? { attendees: attendees as unknown as Json } : {}) };
      const { data, error } = await supabase
        .from('project_meetings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-meetings', projectId] });
      toast.success('Meeting updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-meetings', projectId] });
      toast.success('Meeting deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const finalizeMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('project_meetings')
        .update({ status: 'finalized', finalized_by: user?.id, finalized_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-meetings', projectId] });
      toast.success('Meeting finalized');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    meetings,
    isLoading,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    finalizeMeeting,
  };
}
