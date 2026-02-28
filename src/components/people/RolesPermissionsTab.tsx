import { useState } from 'react';
import { Shield, Lock, Check, X, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  useRoleDefinitions, 
  useRolePermissions, 
  useRoleMemberCounts,
  useSetRolePermission,
  MODULES,
  ACTIONS,
} from '@/hooks/useRoleDefinitions';
import { useUserPermissions } from '@/hooks/usePermissions';

const MODULE_LABELS: Record<string, string> = {
  properties: 'Properties',
  people: 'People',
  work_orders: 'Work Orders',
  inspections: 'Inspections',
  projects: 'Projects',
  issues: 'Issues',
  documents: 'Documents',
  reports: 'Reports',
  settings: 'Settings',
  compliance_calendar: 'Compliance Calendar',
  risk_register: 'Risk Register',
  corrective_actions: 'Corrective Actions',
  corrective_loop: 'Corrective Queue',
  escalation_rules: 'Escalation Rules',
  executive_dashboard: 'Executive Dashboard',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  assign: 'Assign',
};

export function RolesPermissionsTab() {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  
  const { data: roles, isLoading: rolesLoading } = useRoleDefinitions();
  const { data: permissions } = useRolePermissions();
  const { data: memberCounts } = useRoleMemberCounts();
  const setPermission = useSetRolePermission();
  const { isAdmin } = useUserPermissions();

  const toggleRole = (roleKey: string) => {
    setExpandedRole(expandedRole === roleKey ? null : roleKey);
  };

  const hasPermission = (roleKey: string, module: string, action: string): boolean => {
    if (roleKey === 'admin') return true;
    return (permissions || []).some(
      p => p.role_key === roleKey && p.module === module && p.action === action && p.allowed
    );
  };

  const handlePermissionChange = (roleKey: string, module: string, action: string, checked: boolean) => {
    setPermission.mutate({ role_key: roleKey, module, action, allowed: checked });
  };

  if (rolesLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Configure access permissions for each role
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {roles?.map(role => (
          <Card key={role.role_key} className="overflow-hidden">
            <Collapsible open={expandedRole === role.role_key}>
              <CollapsibleTrigger asChild>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRole(role.role_key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {role.display_name}
                          {role.is_system_role && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              System
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {role.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {memberCounts?.[role.role_key] || 0} members
                      </div>
                      {expandedRole === role.role_key ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {role.role_key === 'admin' ? (
                    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-sm">
                        Administrators have full access to all modules and actions.
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">Module</th>
                            {ACTIONS.map(action => (
                              <th key={action} className="text-center py-2 px-2 font-medium">
                                {ACTION_LABELS[action]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.map(module => (
                            <tr key={module} className="border-b last:border-0">
                              <td className="py-2 px-3 font-medium">
                                {MODULE_LABELS[module]}
                              </td>
                              {ACTIONS.map(action => (
                                <td key={action} className="text-center py-2 px-2">
                                  <Checkbox
                                    checked={hasPermission(role.role_key, module, action)}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(role.role_key, module, action, !!checked)
                                    }
                                    disabled={!isAdmin || role.is_system_role}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {!isAdmin && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Only administrators can modify role permissions.
        </div>
      )}
    </div>
  );
}
