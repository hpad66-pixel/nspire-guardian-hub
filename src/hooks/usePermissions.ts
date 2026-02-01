import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from './useUserManagement';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export type ModuleType = 
  | 'properties'
  | 'people'
  | 'work_orders'
  | 'inspections'
  | 'projects'
  | 'issues'
  | 'documents'
  | 'reports'
  | 'settings';

export type ActionType = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'assign';

// Hook to check current user's permissions
export function useUserPermissions() {
  const { data: currentRole, isLoading: roleLoading } = useCurrentUserRole();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', currentRole],
    queryFn: async () => {
      if (!currentRole) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_key', currentRole);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentRole,
  });

  const hasPermission = (module: ModuleType, action: ActionType): boolean => {
    // Admin has all permissions
    if (currentRole === 'admin') return true;

    return (permissions || []).some(
      p => p.module === module && p.action === action && p.allowed
    );
  };

  const canView = (module: ModuleType) => hasPermission(module, 'view');
  const canCreate = (module: ModuleType) => hasPermission(module, 'create');
  const canUpdate = (module: ModuleType) => hasPermission(module, 'update');
  const canDelete = (module: ModuleType) => hasPermission(module, 'delete');
  const canApprove = (module: ModuleType) => hasPermission(module, 'approve');
  const canAssign = (module: ModuleType) => hasPermission(module, 'assign');

  return {
    isLoading: roleLoading || permissionsLoading,
    currentRole,
    permissions,
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canApprove,
    canAssign,
    isAdmin: currentRole === 'admin',
    isManager: currentRole === 'manager' || currentRole === 'admin',
  };
}

// Hook to check if user can manage a specific property's team
export function useCanManagePropertyTeam(propertyId: string | null) {
  const { isAdmin, isManager } = useUserPermissions();

  const { data: isPropertyManager } = useQuery({
    queryKey: ['can-manage-property-team', propertyId],
    queryFn: async () => {
      if (!propertyId) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user is assigned to this property as manager
      const { data, error } = await supabase
        .from('property_team_members')
        .select('id')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .eq('role', 'manager')
        .eq('status', 'active')
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!propertyId && !isAdmin && !isManager,
  });

  return isAdmin || isManager || isPropertyManager;
}

// Utility function to check role hierarchy
export function getRoleHierarchyLevel(role: AppRole): number {
  const hierarchy: Record<AppRole, number> = {
    admin: 100,
    manager: 80,
    project_manager: 70,
    superintendent: 60,
    inspector: 50,
    owner: 40,
    subcontractor: 30,
    viewer: 10,
    user: 1,
  };

  return hierarchy[role] || 0;
}

// Check if one role can manage another
export function canRoleManage(managerRole: AppRole, targetRole: AppRole): boolean {
  return getRoleHierarchyLevel(managerRole) > getRoleHierarchyLevel(targetRole);
}

// Get all roles that a user can assign based on their role
export function getAssignableRoles(userRole: AppRole): AppRole[] {
  const allRoles: AppRole[] = [
    'admin', 'manager', 'project_manager', 'superintendent',
    'inspector', 'owner', 'subcontractor', 'viewer', 'user'
  ];

  if (userRole === 'admin') return allRoles;

  return allRoles.filter(role => canRoleManage(userRole, role));
}
