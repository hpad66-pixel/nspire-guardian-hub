import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformWorkspace {
  id: string;
  name: string;
  plan: string;
  status: string;
  monthly_fee: number;
  seat_limit: number;
  seats_used: number;
  client_company: string | null;
  client_contact_name: string | null;
  billing_contact_email: string | null;
  billing_cycle: string;
  next_billing_date: string | null;
  notes: string | null;
  created_at: string;
  active_user_count: number;
  modules: Record<string, boolean> | null;
}

export function useAllWorkspaces() {
  return useQuery({
    queryKey: ['platform-all-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_workspaces_for_platform_admin');
      if (error) throw error;
      return (data ?? []) as unknown as PlatformWorkspace[];
    },
    staleTime: 60_000,
  });
}

export function usePlatformStats() {
  const { data: workspaces = [] } = useAllWorkspaces();
  return {
    totalClients: workspaces.length,
    monthlyARR: workspaces.reduce((s, w) => s + (w.monthly_fee || 0), 0),
    totalSeats: workspaces.reduce((s, w) => s + (w.seat_limit || 0), 0),
    totalActiveUsers: workspaces.reduce((s, w) => s + (w.active_user_count || 0), 0),
  };
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlatformWorkspace> & { id: string }) => {
      const { error } = await supabase.from('workspaces').update(data as any).eq('id', id);
      if (error) throw error;
      await supabase.from('platform_audit_log').insert({
        action: 'workspace_updated',
        target_workspace_id: id,
        details: data as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-all-workspaces'] });
      toast.success('Workspace updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTogglePlatformModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, field, value }: {
      workspaceId: string;
      field: string;
      value: boolean;
    }) => {
      const { error } = await supabase
        .from('workspace_modules')
        .upsert({ workspace_id: workspaceId, [field]: value } as any, { onConflict: 'workspace_id' });
      if (error) throw error;
      await supabase.from('platform_audit_log').insert({
        action: `platform_module_${value ? 'enabled' : 'disabled'}`,
        target_workspace_id: workspaceId,
        details: { field, value } as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-all-workspaces'] });
      toast.success('Module gate updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePlatformAuditLog() {
  return useQuery({
    queryKey: ['platform-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
