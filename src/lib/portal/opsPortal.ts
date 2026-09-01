/**
 * Property Ops Portal — roles, modules, and path helpers.
 * External licensed portal for Glorieta Gardens (and future managed properties).
 * Construction / consulting stay APAS-internal only.
 */

export type OpsPortalRole = 'ops_tech' | 'ops_pm' | 'ops_owner';

export type OpsPortalModule =
  | 'maintenance'
  | 'nspire'
  | 'stores'
  | 'voice'
  | 'costs'
  | 'executive';

export const OPS_ROLE_LABELS: Record<OpsPortalRole, string> = {
  ops_tech: 'Maintenance Tech',
  ops_pm: 'Property Manager',
  ops_owner: 'Owner / Executive',
};

export const OPS_ROLE_MODULES: Record<OpsPortalRole, OpsPortalModule[]> = {
  ops_tech: ['maintenance'],
  ops_pm: ['maintenance', 'nspire', 'stores', 'voice', 'costs'],
  ops_owner: ['maintenance', 'nspire', 'stores', 'voice', 'costs', 'executive'],
};

export function modulesForOpsRole(role: string | null | undefined): Set<OpsPortalModule> {
  if (role === 'ops_pm' || role === 'ops_owner' || role === 'ops_tech') {
    return new Set(OPS_ROLE_MODULES[role]);
  }
  // Main-admin / super-admin preview: full PM surface without executive by default
  return new Set(OPS_ROLE_MODULES.ops_pm);
}

export function opsHasModule(
  role: string | null | undefined,
  module: OpsPortalModule,
  modules?: string[] | null,
): boolean {
  if (modules && modules.length > 0) {
    return modules.includes(module);
  }
  return modulesForOpsRole(role).has(module);
}

export function opsPortalPath(propertyId: string | null | undefined, suffix = ''): string {
  if (!propertyId) return '/ops-portal';
  const clean = suffix.startsWith('/') ? suffix : suffix ? `/${suffix}` : '';
  return `/ops-portal/properties/${propertyId}${clean}`;
}

export function isOpsOwnerRole(role: string | null | undefined): boolean {
  return role === 'ops_owner';
}

export function isOpsPmOrOwner(role: string | null | undefined): boolean {
  return role === 'ops_pm' || role === 'ops_owner';
}
