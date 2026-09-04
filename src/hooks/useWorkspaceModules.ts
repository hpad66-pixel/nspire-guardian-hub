/**
 * useWorkspaceModules
 * -------------------
 * Reads and writes workspace_modules rows.
 * The "effective" value for a module is:
 *   platform_<module> AND workspace_<module>
 * Super admin (app role 'admin') can flip both.
 * Workspace admin can only flip the workspace-level override.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildPackageModulePatch, buildPackagePropertyFlags } from '@/lib/packages';

export interface WorkspaceModuleRow {
  id: string;
  workspace_id: string;
  package: string | null;
  // sellable-suite flags (workspace-admin)
  construction_enabled: boolean;
  consulting_enabled: boolean;
  environmental_enabled: boolean;
  property_mgmt_enabled: boolean;
  cockpit_enabled: boolean;
  reports_enabled: boolean;
  ai_enabled: boolean;
  contractor_readiness_enabled: boolean;
  apas_crm_integration_enabled: boolean;
  // workspace-admin flags
  credential_wallet_enabled: boolean;
  training_hub_enabled: boolean;
  safety_module_enabled: boolean;
  equipment_tracker_enabled: boolean;
  client_portal_enabled: boolean;
  email_inbox_enabled: boolean;
  qr_scanning_enabled: boolean;
  occupancy_enabled: boolean;
  // platform (super-admin) gates
  platform_construction: boolean;
  platform_consulting: boolean;
  platform_environmental: boolean;
  platform_property_mgmt: boolean;
  platform_cockpit: boolean;
  platform_reports: boolean;
  platform_ai: boolean;
  platform_contractor_readiness: boolean;
  platform_apas_crm_integration: boolean;
  platform_credential_wallet: boolean;
  platform_training_hub: boolean;
  platform_safety_module: boolean;
  platform_equipment_tracker: boolean;
  platform_client_portal: boolean;
  platform_email_inbox: boolean;
  platform_qr_scanning: boolean;
  platform_occupancy: boolean;
}

const QUERY_KEY = ['workspace_modules'];

async function fetchWorkspaceModules(): Promise<WorkspaceModuleRow | null> {
  const { data, error } = await supabase
    .from('workspace_modules')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as WorkspaceModuleRow | null;
}

async function upsertWorkspaceModules(
  workspaceId: string,
  patch: Partial<Omit<WorkspaceModuleRow, 'id' | 'workspace_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('workspace_modules')
    .upsert({ workspace_id: workspaceId, ...patch } as never, { onConflict: 'workspace_id' });

  if (error) throw error;
}

export function useWorkspaceModules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchWorkspaceModules,
    staleTime: 30_000,
  });
}

export function useToggleWorkspaceModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      field,
      value,
    }: {
      workspaceId: string;
      field: keyof Omit<WorkspaceModuleRow, 'id' | 'workspace_id'>;
      value: boolean;
    }) => {
      await upsertWorkspaceModules(workspaceId, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      console.error('Failed to toggle workspace module:', err);
      toast.error('Failed to update module setting');
    },
  });
}

// Apply a package preset: turn every workspace-backed module ON iff the package
// includes it, open matching platform gates (so nothing stays "Not in plan"),
// and record the package name.
export function useApplyPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, packageKey }: { workspaceId: string; packageKey: string }) => {
      const patch = buildPackageModulePatch(packageKey);
      await upsertWorkspaceModules(workspaceId, patch as Partial<Omit<WorkspaceModuleRow, 'id' | 'workspace_id'>>);

      // nspire / daily-grounds / projects are read from the PROPERTIES table, not
      // workspace_modules — set them there too so the package name is truthful.
      const propFlags = buildPackagePropertyFlags(packageKey);
      const { error: propErr } = await supabase.from('properties')
        .update(propFlags)
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (propErr) throw propErr;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(
        vars.packageKey === 'enterprise'
          ? 'Enterprise applied — all modules unlocked'
          : 'Package applied',
      );
    },
    onError: (err) => {
      console.error('Failed to apply package:', err);
      toast.error('Failed to apply package');
    },
  });
}
