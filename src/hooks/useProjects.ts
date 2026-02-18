import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserPermissions } from './usePermissions';
import { getAssignedPropertyIds } from './propertyAccess';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

export interface Project extends ProjectRow {
  property?: { name: string } | null;
  client?: { name: string } | null;
  milestones?: Array<{
    id: string;
    name: string;
    due_date: string;
    status: string;
  }>;
}

const PROJECT_SELECT = `
  *,
  property:properties(name),
  client:clients(name),
  milestones:project_milestones(id, name, due_date, status)
`;

const PROJECT_SELECT_DETAIL = `
  *,
  property:properties(name),
  client:clients(name),
  milestones:project_milestones(id, name, due_date, status, notes, completed_at)
`;

/** For non-admins: returns projects they can see (property-linked ones via membership,
 *  plus all client/standalone projects which are org-wide). */
async function buildNonAdminFilter(query: any) {
  const propertyIds = await getAssignedPropertyIds();
  // Include property projects they're assigned to OR any non-property project (client / standalone)
  if (propertyIds.length === 0) {
    // Only show non-property projects
    return query.is('property_id', null);
  }
  // property projects assigned OR no property_id (client projects)
  return query.or(`property_id.in.(${propertyIds.join(',')}),property_id.is.null`);
}

export function useProjects() {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = await buildNonAdminFilter(query);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useActiveProjects() {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'active', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .in('status', ['planning', 'active'])
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = await buildNonAdminFilter(query);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(projectId: string | null) {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', projectId, isAdmin],
    queryFn: async () => {
      if (!projectId) return null;

      let query = supabase
        .from('projects')
        .select(PROJECT_SELECT_DETAIL)
        .eq('id', projectId);

      if (!isAdmin) {
        query = await buildNonAdminFilter(query);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export function useProjectsByProperty(propertyId: string | null) {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'property', propertyId, isAdmin],
    queryFn: async () => {
      if (!propertyId) return [];
      if (!isAdmin) {
        const propertyIds = await getAssignedPropertyIds();
        if (!propertyIds.includes(propertyId)) return [] as Project[];
      }

      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!propertyId,
  });
}

export function useProjectStats() {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['projects', 'stats', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('status, budget, spent, property_id');

      if (!isAdmin) {
        query = await buildNonAdminFilter(query);
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
      const { error } = await supabase.from('projects').delete().eq('id', id);
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
