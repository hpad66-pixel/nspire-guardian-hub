import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SubmittalRow = Database['public']['Tables']['project_submittals']['Row'];

export function useSubmittalsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['submittals', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_submittals')
        .select('*')
        .eq('project_id', projectId!)
        .order('submittal_number', { ascending: false });
      if (error) throw error;
      return data as SubmittalRow[];
    },
  });
}

export function useCreateSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; title: string; description?: string; due_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_submittals')
        .insert({ ...data, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['submittals', d.project_id] });
      toast.success('Submittal created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubmittalRow> & { id: string }) => {
      const { data, error } = await supabase.from('project_submittals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as SubmittalRow;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['submittals', d.project_id] });
      toast.success('Submittal updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_submittals').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['submittals', projectId] });
      toast.success('Submittal deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
