import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import type { Lifecycle, Visibility } from './seed';

export type FeatureFlagResult = {
  enabled: boolean;
  lifecycle: Lifecycle | 'UNKNOWN';
  visibility: Visibility | 'unknown';
  reason?: string;
  isLoading: boolean;
};

type RegistryRow = {
  slug: string;
  lifecycle: Lifecycle;
  visibility: Visibility;
};

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchRegistry(): Promise<Map<string, RegistryRow>> {
  const { data, error } = await supabase
    .from('feature_registry' as never)
    .select('slug, lifecycle, visibility');

  if (error) throw error;

  const rows = (data ?? []) as RegistryRow[];
  const map = new Map<string, RegistryRow>();
  for (const row of rows) map.set(row.slug, row);
  return map;
}

export function useFeatureRegistry() {
  return useQuery({
    queryKey: ['feature-registry'],
    queryFn: fetchRegistry,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
  });
}

function decide(
  row: RegistryRow | undefined,
  role: string | null | undefined,
  slug: string,
): Omit<FeatureFlagResult, 'isLoading'> {
  if (!row) {
    if (import.meta.env.DEV) {
      console.warn(`[useFeatureFlag] Unknown slug "${slug}" — defaulting to disabled.`);
    }
    return { enabled: false, lifecycle: 'UNKNOWN', visibility: 'unknown', reason: 'not-in-registry' };
  }

  const isAdmin = role === 'admin';
  const isPayingTenant = role === 'owner' || role === 'manager' || role === 'administrator';

  switch (row.lifecycle) {
    case 'LIVE':
      return { enabled: true, lifecycle: row.lifecycle, visibility: row.visibility };
    case 'PREVIEW':
      if (isAdmin || isPayingTenant) {
        return { enabled: true, lifecycle: row.lifecycle, visibility: row.visibility };
      }
      return { enabled: false, lifecycle: row.lifecycle, visibility: row.visibility, reason: 'preview-restricted' };
    case 'LAB':
      if (isAdmin) {
        return { enabled: true, lifecycle: row.lifecycle, visibility: row.visibility };
      }
      return { enabled: false, lifecycle: row.lifecycle, visibility: row.visibility, reason: 'lab-admin-only' };
    case 'ARCHIVED':
    case 'DEPRECATED':
      return {
        enabled: false,
        lifecycle: row.lifecycle,
        visibility: row.visibility,
        reason: row.lifecycle === 'ARCHIVED' ? 'archived' : 'deprecated',
      };
  }
}

/**
 * Returns `{ enabled, lifecycle, visibility, reason }` for a single feature
 * slug. Unknown slugs default to `enabled: false` with a dev-only warning.
 *
 * Role rules:
 *   - LIVE        → everyone
 *   - PREVIEW     → admins + paying tenants (owner/manager/administrator)
 *   - LAB         → admins only
 *   - ARCHIVED    → no one
 *   - DEPRECATED  → no one
 */
export function useFeatureFlag(slug: string): FeatureFlagResult {
  const registry = useFeatureRegistry();
  const { data: role, isLoading: roleLoading } = useCurrentUserRole();

  const isLoading = registry.isLoading || roleLoading;
  if (isLoading) {
    return { enabled: false, lifecycle: 'UNKNOWN', visibility: 'unknown', isLoading: true };
  }

  const row = registry.data?.get(slug);
  return { ...decide(row, role, slug), isLoading: false };
}
