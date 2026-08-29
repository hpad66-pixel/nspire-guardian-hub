import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PropertyRole = Exclude<Database['public']['Enums']['app_role'], 'admin'>;
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'assign';

export interface UserPropertyAssignment {
  property_id: string;
  property_name: string;
  role: PropertyRole;
  status: string;
  assignment_id: string;
}

export interface PropertyAccessMatrixRow {
  module: string;
  module_label: string;
  description: string;
  sort_order: number;
  action: PermissionAction;
  allowed: boolean;
  source: 'role_default' | 'user_override';
}

export function useUserPropertyAssignments(userId: string | null) {
  return useQuery({
    queryKey: ['enterprise-property-assignments', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_property_assignments' as never, {
        p_target_user_id: userId,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as UserPropertyAssignment[];
    },
  });
}

export function usePropertyAccessMatrix(userId: string | null, propertyId: string | null) {
  return useQuery({
    queryKey: ['enterprise-property-access-matrix', userId, propertyId],
    enabled: Boolean(userId && propertyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_property_access_matrix' as never, {
        p_target_user_id: userId,
        p_property_id: propertyId,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as PropertyAccessMatrixRow[];
    },
  });
}

export function useSetPropertyUserAccess(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, role }: { propertyId: string; role: PropertyRole }) => {
      if (!userId) throw new Error('No user selected');
      const { error } = await supabase.rpc('set_property_user_access' as never, {
        p_target_user_id: userId,
        p_property_id: propertyId,
        p_role: role,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-property-assignments', userId] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-property-access-matrix', userId] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
  });
}

export function useRemovePropertyUserAccess(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!userId) throw new Error('No user selected');
      const { error } = await supabase.rpc('remove_property_user_access' as never, {
        p_target_user_id: userId,
        p_property_id: propertyId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-property-assignments', userId] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-property-access-matrix', userId] });
    },
  });
}

export function useSetPropertyPermissionOverride(userId: string | null, propertyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module, action, allowed }: {
      module: string;
      action: PermissionAction;
      allowed: boolean | null;
    }) => {
      if (!userId || !propertyId) throw new Error('No property assignment selected');
      const { error } = await supabase.rpc('set_property_permission_override' as never, {
        p_target_user_id: userId,
        p_property_id: propertyId,
        p_module: module,
        p_action: action,
        p_allowed: allowed,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enterprise-property-access-matrix', userId, propertyId],
      });
    },
  });
}

