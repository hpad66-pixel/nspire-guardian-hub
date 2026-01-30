import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

export interface Project extends ProjectRow {
  property?: {
    name: string;
  };
  milestones?: Array<{
    id: string;
    name: string;
    due_date: string;
    status: string;
  }>;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useActiveProjects() {
  return useQuery({
    queryKey: ['projects', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status)
        `)
        .in('status', ['planning', 'active'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status, notes, completed_at)
        `)
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export function useProjectsByProperty(propertyId: string | null) {
  return useQuery({
    queryKey: ['projects', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!propertyId,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['projects', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('status, budget, spent');
      
      if (error) throw error;
      
      const active = data.filter(p => p.status === 'active').length;
      const planning = data.filter(p => p.status === 'planning').length;
      const onHold = data.filter(p => p.status === 'on_hold').length;
      const completed = data.filter(p => p.status === 'completed' || p.status === 'closed').length;
      const totalBudget = data.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      const totalSpent = data.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
      
      return { active, planning, onHold, completed, totalBudget, totalSpent, total: data.length };
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: Omit<ProjectInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
}
