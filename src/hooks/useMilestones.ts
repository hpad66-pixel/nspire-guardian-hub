import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type MilestoneRow = Database['public']['Tables']['project_milestones']['Row'];
type MilestoneInsert = Database['public']['Tables']['project_milestones']['Insert'];

export interface Milestone extends MilestoneRow {
  project?: {
    name: string;
    property?: {
      name: string;
    };
  };
}

export function useMilestones() {
  return useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useMilestonesByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['milestones', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as MilestoneRow[];
    },
    enabled: !!projectId,
  });
}

export function useUpcomingMilestones(daysAhead: number = 7) {
  return useQuery({
    queryKey: ['milestones', 'upcoming', daysAhead],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from('project_milestones')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .neq('status', 'completed')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (milestone: Omit<MilestoneInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert(milestone)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Milestone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilestoneRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Milestone updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });
}

export function useCompleteMilestone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Milestone completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete milestone: ${error.message}`);
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Milestone deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });
}
