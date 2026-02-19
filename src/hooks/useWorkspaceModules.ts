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

export interface WorkspaceModuleRow {
  id: string;
  workspace_id: string;
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
  return data as WorkspaceModuleRow | null;
}

async function upsertWorkspaceModules(
  workspaceId: string,
  patch: Partial<Omit<WorkspaceModuleRow, 'id' | 'workspace_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('workspace_modules')
    .upsert({ workspace_id: workspaceId, ...patch }, { onConflict: 'workspace_id' });

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
