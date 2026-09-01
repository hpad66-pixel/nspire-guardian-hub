/**
 * Property Ops Portal data hooks — membership-scoped to one property.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireTenantId } from '@/lib/tenant';
import type { OpsPortalModule, OpsPortalRole } from '@/lib/portal/opsPortal';
import { modulesForOpsRole } from '@/lib/portal/opsPortal';

export interface OpsPortalContext {
  property_id: string;
  property_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  ops_role: OpsPortalRole | string;
  modules: OpsPortalModule[];
  total_units: number;
}

export function useOpsPortalContext(propertyId?: string | null) {
  return useQuery<OpsPortalContext | null>({
    queryKey: ['ops-portal-context', propertyId ?? 'default'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_ops_portal_context' as any,
        propertyId ? { p_property_id: propertyId } : {},
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      const modules = Array.isArray((row as any).modules)
        ? ((row as any).modules as OpsPortalModule[])
        : Array.from(modulesForOpsRole((row as any).ops_role));
      return {
        property_id: (row as any).property_id,
        property_name: (row as any).property_name,
        address: (row as any).address ?? null,
        city: (row as any).city ?? null,
        state: (row as any).state ?? null,
        ops_role: (row as any).ops_role,
        modules,
        total_units: Number((row as any).total_units ?? 0),
      } satisfies OpsPortalContext;
    },
    staleTime: 30_000,
  });
}

export function useOpsPortalMembership() {
  return useQuery({
    queryKey: ['ops-portal-membership'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('portal_memberships' as any)
        .select('id, tenant_id, property_id, portal_kind, role, is_active')
        .eq('user_id', user.id)
        .eq('portal_kind', 'ops')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        tenant_id: string;
        property_id: string | null;
        portal_kind: 'ops';
        role: string | null;
        is_active: boolean;
      } | null;
    },
    staleTime: 60_000,
  });
}

export function useInviteOpsPortalUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      propertyId: string;
      role: OpsPortalRole;
    }) => {
      const tenant_id = await requireTenantId();
      if (!input.propertyId) throw new Error('Property is required for a Property Ops invite.');
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const { data, error } = await supabase
        .from('portal_invitations' as any)
        .insert({
          tenant_id,
          email: input.email.trim().toLowerCase(),
          property_id: input.propertyId,
          portal_kind: 'ops',
          role: input.role,
          token,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as { token: string; email: string; role: string; property_id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-invitations'] }),
  });
}

export function useOpsEnabledProperties() {
  return useQuery({
    queryKey: ['ops-enabled-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, city, state, ops_portal_enabled, ops_portal_modules, total_units, is_managed_property')
        .eq('ops_portal_enabled', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        address: string | null;
        city: string | null;
        state: string | null;
        ops_portal_enabled: boolean;
        ops_portal_modules: string[] | null;
        total_units: number | null;
        is_managed_property: boolean;
      }>;
    },
  });
}
