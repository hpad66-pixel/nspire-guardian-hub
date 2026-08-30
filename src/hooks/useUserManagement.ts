import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { isPlatformSuperAdmin } from '@/lib/auth/platformAdmin';

type AppRole = Database['public']['Enums']['app_role'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];

export interface UserWithRole extends ProfileRow {
  roles: UserRoleRow[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRole[] = profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.user_id),
      }));

      return usersWithRoles;
    },
  });
}

export function useAssignableWorkspaceRoles() {
  return useQuery({
    queryKey: ['assignable-workspace-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('assignable_workspace_roles');
      if (error) throw error;
      return (data || []) as AppRole[];
    },
  });
}

export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCurrentUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['current-user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) return null;
      if (isPlatformSuperAdmin(freshUser)) return 'admin';

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', freshUser.id);

      if (error) throw error;

      const { data: propertyRoles, error: propertyRolesError } = await supabase
        .from('property_team_members')
        .select('role')
        .eq('user_id', freshUser.id)
        .eq('status', 'active');

      if (propertyRolesError) throw propertyRolesError;
      
      // Return the highest priority role
      const rolePriority: Record<AppRole, number> = {
        admin: 9,
        owner: 8,
        manager: 7,
        inspector: 6,
        administrator: 5,
        superintendent: 4,
        clerk: 3,
        project_manager: 2,
        subcontractor: 2,
        viewer: 1,
        user: 1,
      };

      const roles = [...data.map(r => r.role), ...(propertyRoles || []).map(r => r.role)];
      const sortedRoles = roles.sort((a, b) => (rolePriority[b] || 0) - (rolePriority[a] || 0));
      
      return sortedRoles[0] || 'user';
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/** Workspace administration is deliberately separate from property roles. */
export function useIsWorkspaceAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-workspace-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return data?.role === 'admin';
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useAddUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase.rpc('assign_workspace_user_role', {
        p_target_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role added successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('User already has this role');
      } else {
        toast.error(`Failed to add role: ${error.message}`);
      }
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('remove_workspace_user_role', {
        p_target_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });
}

export function useSetWorkspaceUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: 'active' | 'deactivated';
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-workspace-user', {
        body: { action: 'set_status', userId, status, reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-status-history'] });
      toast.success(variables.status === 'active' ? 'User reactivated' : 'User deactivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, fullName, email }: { userId: string; fullName?: string; email?: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          email: email,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}
