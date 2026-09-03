import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: AppRole;
  added_by: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ProjectTeamAccess {
  canView: boolean;
  canManage: boolean;
}

export interface ProjectMentionCandidate {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_source: 'Project team' | 'Client team' | 'Property team' | 'Account admin';
  role: string;
  is_project_member: boolean;
}

export function useProjectTeamMembers(projectId: string | null) {
  return useQuery({
    queryKey: ['project-team', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      // Fetch members
      const { data: members, error } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Fetch profiles separately to avoid FK name issues
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      return members.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      })) as ProjectTeamMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddProjectTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId, role }: { projectId: string; userId: string; role: AppRole }) => {
      const { data, error } = await supabase.rpc('upsert_project_team_member', {
        p_project_id: projectId,
        p_user_id: userId,
        p_role: role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-mention-candidates', projectId] });
      toast.success('Team member added to project');
    },
    onError: (err: Error) => {
      if (err.message.includes('duplicate') || err.message.includes('unique')) {
        toast.error('User is already on this project');
      } else {
        toast.error(`Failed to add member: ${err.message}`);
      }
    },
  });
}

export function useRemoveProjectTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase.rpc('remove_project_team_member', {
        p_project_id: projectId,
        p_user_id: userId,
      });
      if (error) throw error;
      return projectId;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-mention-candidates', projectId] });
      toast.success('Member removed from project');
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove member: ${err.message}`);
    },
  });
}

export function useUpdateProjectTeamMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId, role }: { projectId: string; userId: string; role: AppRole }) => {
      const { data, error } = await supabase.rpc('upsert_project_team_member', {
        p_project_id: projectId,
        p_user_id: userId,
        p_role: role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-mention-candidates', projectId] });
      toast.success('Role updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update role: ${err.message}`);
    },
  });
}

export function useProjectTeamAccess(projectId: string | null) {
  return useQuery({
    queryKey: ['project-team-access', projectId],
    queryFn: async (): Promise<ProjectTeamAccess> => {
      if (!projectId) return { canView: false, canManage: false };
      const { data, error } = await supabase.rpc('get_project_team_access', {
        p_project_id: projectId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { canView: Boolean(row?.can_view), canManage: Boolean(row?.can_manage) };
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useProjectMentionCandidates(projectId: string | null, search: string | null) {
  return useQuery({
    queryKey: ['project-mention-candidates', projectId, search],
    queryFn: async () => {
      if (!projectId) return [] as ProjectMentionCandidate[];
      const { data, error } = await supabase.rpc('get_project_mention_candidates', {
        p_project_id: projectId,
        p_search: search ?? '',
        p_limit: 30,
      });
      if (error) throw error;
      return (data ?? []) as ProjectMentionCandidate[];
    },
    enabled: Boolean(projectId) && search !== null,
    staleTime: 15_000,
  });
}
