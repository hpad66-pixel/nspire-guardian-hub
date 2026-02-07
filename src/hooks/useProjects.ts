import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserPermissions } from './usePermissions';
import { getAssignedPropertyIds } from './propertyAccess';
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
  const { isAdmin, isOwner } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', isAdmin, isOwner],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin && !isOwner) {
        const propertyIds = await getAssignedPropertyIds();
        if (propertyIds.length === 0) return [] as Project[];
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useActiveProjects() {
  const { isAdmin, isOwner } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'active', isAdmin, isOwner],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status)
        `)
        .in('status', ['planning', 'active'])
        .order('created_at', { ascending: false });

      if (!isAdmin && !isOwner) {
        const propertyIds = await getAssignedPropertyIds();
        if (propertyIds.length === 0) return [] as Project[];
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(projectId: string | null) {
  const { isAdmin, isOwner } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', projectId, isAdmin, isOwner],
    queryFn: async () => {
      if (!projectId) return null;

      let query = supabase
        .from('projects')
        .select(`
          *,
          property:properties(name),
          milestones:project_milestones(id, name, due_date, status, notes, completed_at)
        `)
        .eq('id', projectId);

      if (!isAdmin && !isOwner) {
        const propertyIds = await getAssignedPropertyIds();
        if (propertyIds.length === 0) return null;
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query.single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export function useProjectsByProperty(propertyId: string | null) {
  const { isAdmin, isOwner } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'property', propertyId, isAdmin, isOwner],
    queryFn: async () => {
      if (!propertyId) return [];
      if (!isAdmin && !isOwner) {
        const propertyIds = await getAssignedPropertyIds();
        if (!propertyIds.includes(propertyId)) return [] as Project[];
      }

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
  const { isAdmin, isOwner } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'stats', isAdmin, isOwner],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('status, budget, spent, property_id');

      if (!isAdmin && !isOwner) {
        const propertyIds = await getAssignedPropertyIds();
        if (propertyIds.length === 0) {
          return { active: 0, planning: 0, onHold: 0, completed: 0, totalBudget: 0, totalSpent: 0, total: 0 };
        }
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      
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
