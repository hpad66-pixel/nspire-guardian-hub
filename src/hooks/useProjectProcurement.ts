import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePurchaseOrders(projectId: string | null) {
  return useQuery({
    queryKey: ['purchase-orders', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; vendor_name: string; description?: string; total?: number; order_date?: string; expected_delivery?: string; line_items?: unknown[] }) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData: Record<string, unknown> = { ...data, created_by: user.user?.id };
      const { data: row, error } = await supabase
        .from('project_purchase_orders')
        .insert(insertData as never)
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['purchase-orders', d.project_id] }); toast.success('Purchase order created'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from('project_purchase_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['purchase-orders', d.project_id] }); toast.success('Purchase order updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_purchase_orders').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => { qc.invalidateQueries({ queryKey: ['purchase-orders', projectId] }); toast.success('Purchase order deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProcurementStats(projectId: string | null) {
  return useQuery({
    queryKey: ['procurement-stats', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('status, total')
        .eq('project_id', projectId!);
      if (error) throw error;
      const totalSpent = (data || []).filter(po => po.status === 'approved' || po.status === 'delivered').reduce((sum, po) => sum + (Number(po.total) || 0), 0);
      const pending = (data || []).filter(po => po.status === 'pending' || po.status === 'draft').length;
      return { totalPOs: data?.length || 0, totalSpent, pending };
    },
  });
}
