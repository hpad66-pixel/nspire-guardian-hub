import { useRolePermissions } from '@/hooks/useRoleDefinitions';

const ALL_MODULES = [
  'properties','people','work_orders','inspections','projects','issues',
  'documents','reports','settings','compliance_calendar','risk_register',
  'corrective_actions','corrective_loop','escalation_rules','executive_dashboard',
] as const;

const MODULE_LABELS: Record<string, string> = {
  properties: 'Properties', people: 'People', work_orders: 'Work Orders',
  inspections: 'Inspections', projects: 'Projects', issues: 'Issues',
  documents: 'Documents', reports: 'Reports', settings: 'Settings',
  compliance_calendar: 'Compliance Calendar', risk_register: 'Risk Register',
  corrective_actions: 'Corrective Actions', corrective_loop: 'Corrective Queue',
  escalation_rules: 'Escalation Rules', executive_dashboard: 'Executive Dashboard',
};

export function useRolePreview(roleKey: string) {
  const { data: permissions = [] } = useRolePermissions(roleKey);

  const allowed = (module: string, action: string) =>
    roleKey === 'admin' ||
    permissions.some(
      p => p.role_key === roleKey && p.module === module && p.action === action && p.allowed
    );

  const visibleModules = ALL_MODULES.filter(m => allowed(m, 'view'));

  const permissionMatrix = ALL_MODULES.map(module => ({
    module,
    label: MODULE_LABELS[module],
    view: allowed(module, 'view'),
    create: allowed(module, 'create'),
    update: allowed(module, 'update'),
    delete: allowed(module, 'delete'),
    approve: allowed(module, 'approve'),
    assign: allowed(module, 'assign'),
  }));

  return { visibleModules, permissionMatrix, MODULE_LABELS, ALL_MODULES };
}
