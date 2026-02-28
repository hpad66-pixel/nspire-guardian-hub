import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoleDefinition {
  id: string;
  role_key: string;
  display_name: string;
  description: string | null;
  priority: number;
  is_system_role: boolean;
  permissions: Record<string, string[]>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_key: string;
  module: string;
  action: string;
  allowed: boolean;
  created_at: string;
}

// Available modules and actions
export const MODULES = [
  'properties',
  'people',
  'work_orders',
  'inspections',
  'projects',
  'issues',
  'documents',
  'reports',
  'settings',
  'compliance_calendar',
  'risk_register',
  'corrective_actions',
  'corrective_loop',
  'escalation_rules',
  'executive_dashboard',
] as const;

export const ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'assign',
] as const;

export type ModuleType = typeof MODULES[number];
export type ActionType = typeof ACTIONS[number];

// Fetch all role definitions
export function useRoleDefinitions() {
  return useQuery({
    queryKey: ['role-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_definitions')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as RoleDefinition[];
    },
  });
}

// Fetch a single role definition
export function useRoleDefinition(roleKey: string | null) {
  return useQuery({
    queryKey: ['role-definition', roleKey],
    queryFn: async () => {
      if (!roleKey) return null;

      const { data, error } = await supabase
        .from('role_definitions')
        .select('*')
        .eq('role_key', roleKey)
        .single();

      if (error) throw error;
      return data as RoleDefinition;
    },
    enabled: !!roleKey,
  });
}

// Fetch role permissions
export function useRolePermissions(roleKey?: string) {
  return useQuery({
    queryKey: ['role-permissions', roleKey],
    queryFn: async () => {
      let query = supabase
        .from('role_permissions')
        .select('*')
        .order('module', { ascending: true });

      if (roleKey) {
        query = query.eq('role_key', roleKey);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

// Get role member counts
export function useRoleMemberCounts() {
  return useQuery({
    queryKey: ['role-member-counts'],
    queryFn: async () => {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role');

      if (error) throw error;

      const counts: Record<string, number> = {};
      (userRoles || []).forEach(ur => {
        counts[ur.role] = (counts[ur.role] || 0) + 1;
      });

      return counts;
    },
  });
}

// Update role definition
export function useUpdateRoleDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleKey, ...data }: {
      roleKey: string;
      display_name?: string;
      description?: string;
      priority?: number;
      permissions?: Record<string, string[]>;
    }) => {
      const { data: result, error } = await supabase
        .from('role_definitions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('role_key', roleKey)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['role-definition'] });
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

// Create custom role
export function useCreateRoleDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      role_key: string;
      display_name: string;
      description?: string;
      priority?: number;
      permissions?: Record<string, string[]>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: result, error } = await supabase
        .from('role_definitions')
        .insert({
          ...data,
          is_system_role: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-definitions'] });
      toast.success('Role created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

// Delete custom role (only non-system roles)
export function useDeleteRoleDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleKey: string) => {
      // First delete permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_key', roleKey);

      // Then delete the role
      const { error } = await supabase
        .from('role_definitions')
        .delete()
        .eq('role_key', roleKey)
        .eq('is_system_role', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Role deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });
}

// Set role permission
export function useSetRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role_key, module, action, allowed }: {
      role_key: string;
      module: string;
      action: string;
      allowed: boolean;
    }) => {
      if (allowed) {
        // Upsert the permission
        const { error } = await supabase
          .from('role_permissions')
          .upsert(
            { role_key, module, action, allowed },
            { onConflict: 'role_key,module,action' }
          );

        if (error) throw error;
      } else {
        // Delete the permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_key', role_key)
          .eq('module', module)
          .eq('action', action);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });
}

// Utility: Check if a role has a specific permission
export function hasPermission(
  permissions: RolePermission[],
  roleKey: string,
  module: string,
  action: string
): boolean {
  // Admin has all permissions
  if (roleKey === 'admin') return true;

  return permissions.some(
    p => p.role_key === roleKey && p.module === module && p.action === action && p.allowed
  );
}

// Utility: Get all permissions for a role as a matrix
export function getRolePermissionMatrix(
  permissions: RolePermission[],
  roleKey: string
): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};

  permissions
    .filter(p => p.role_key === roleKey && p.allowed)
    .forEach(p => {
      if (!matrix[p.module]) {
        matrix[p.module] = [];
      }
      matrix[p.module].push(p.action);
    });

  return matrix;
}
