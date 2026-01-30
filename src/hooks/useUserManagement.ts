import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

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
  return useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Return the highest priority role
      const rolePriority: Record<AppRole, number> = {
        admin: 5,
        manager: 4,
        project_manager: 4,
        superintendent: 3,
        inspector: 3,
        subcontractor: 2,
        owner: 2,
        viewer: 1,
        user: 1,
      };

      const roles = data.map(r => r.role);
      const sortedRoles = roles.sort((a, b) => (rolePriority[b] || 0) - (rolePriority[a] || 0));
      
      return sortedRoles[0] || 'user';
    },
  });
}

export function useAddUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

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
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

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
