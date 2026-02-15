import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Warranties
export function useWarranties(projectId: string | null) {
  return useQuery({
    queryKey: ['warranties', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_warranties')
        .select('*')
        .eq('project_id', projectId!)
        .order('end_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWarranty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; item_name: string; vendor?: string; start_date?: string; end_date?: string; duration_months?: number; coverage_details?: string; contact_info?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_warranties')
        .insert({ ...data, created_by: user.user?.id })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['warranties', d.project_id] }); toast.success('Warranty added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWarranty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from('project_warranties').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['warranties', d.project_id] }); toast.success('Warranty updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Closeout Checklist
export function useCloseoutItems(projectId: string | null) {
  return useQuery({
    queryKey: ['closeout-items', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_closeout_items')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCloseoutItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; title: string; category?: string; description?: string; due_date?: string }) => {
      const { data: row, error } = await supabase
        .from('project_closeout_items')
        .insert(data)
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['closeout-items', d.project_id] }); toast.success('Closeout item added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleCloseoutItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed, projectId }: { id: string; is_completed: boolean; projectId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('project_closeout_items').update({
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
        completed_by: is_completed ? user.user?.id : null,
      }).eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => { qc.invalidateQueries({ queryKey: ['closeout-items', projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Lessons Learned
export function useLessonsLearned(projectId: string | null) {
  return useQuery({
    queryKey: ['lessons-learned', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_lessons_learned')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; title: string; category?: string; what_happened?: string; impact?: string; lesson?: string; recommendation?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_lessons_learned')
        .insert({ ...data, submitted_by: user.user?.id })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['lessons-learned', d.project_id] }); toast.success('Lesson recorded'); },
    onError: (e: Error) => toast.error(e.message),
  });
}
