import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];
type ChangeOrderInsert = Database['public']['Tables']['change_orders']['Insert'];

export interface ChangeOrder extends ChangeOrderRow {
  project?: {
    name: string;
    property?: {
      name: string;
    };
  };
}

export function useChangeOrders() {
  return useQuery({
    queryKey: ['change-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ChangeOrder[];
    },
  });
}

export function useChangeOrdersByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['change-orders', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ChangeOrderRow[];
    },
    enabled: !!projectId,
  });
}

export function usePendingChangeOrders() {
  return useQuery({
    queryKey: ['change-orders', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ChangeOrder[];
    },
  });
}

export function useChangeOrderStats() {
  return useQuery({
    queryKey: ['change-orders', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('status, amount');
      
      if (error) throw error;
      
      const pending = data.filter(co => co.status === 'pending');
      const approved = data.filter(co => co.status === 'approved');
      const rejected = data.filter(co => co.status === 'rejected');
      
      const pendingAmount = pending.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
      const approvedAmount = approved.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
      
      return {
        pendingCount: pending.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        pendingAmount,
        approvedAmount,
        total: data.length,
      };
    },
  });
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (changeOrder: Omit<ChangeOrderInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('change_orders')
        .insert({ ...changeOrder, requested_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Change order created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create change order: ${error.message}`);
    },
  });
}

export function useUpdateChangeOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Change order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update change order: ${error.message}`);
    },
  });
}

export function useApproveChangeOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('change_orders')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Change order approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve change order: ${error.message}`);
    },
  });
}

export function useRejectChangeOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Change order rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject change order: ${error.message}`);
    },
  });
}
