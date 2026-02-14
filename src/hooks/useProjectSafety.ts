import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSafetyIncidents(projectId: string | null) {
  return useQuery({
    queryKey: ['safety-incidents', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_safety_incidents')
        .select('*')
        .eq('project_id', projectId!)
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSafetyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; title: string; incident_type?: string; severity?: string; description?: string; location?: string; incident_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_safety_incidents')
        .insert({ ...data, created_by: user.user?.id })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['safety-incidents', d.project_id] }); toast.success('Incident reported'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSafetyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from('project_safety_incidents').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['safety-incidents', d.project_id] }); toast.success('Incident updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToolboxTalks(projectId: string | null) {
  return useQuery({
    queryKey: ['toolbox-talks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_toolbox_talks')
        .select('*')
        .eq('project_id', projectId!)
        .order('talk_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateToolboxTalk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; topic: string; presenter?: string; description?: string; talk_date?: string; duration_minutes?: number; attendees?: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_toolbox_talks')
        .insert({ ...data, created_by: user.user?.id })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['toolbox-talks', d.project_id] }); toast.success('Toolbox talk added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}
