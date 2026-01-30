import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderRow = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];

export interface WorkOrder extends WorkOrderRow {
  property?: {
    name: string;
  };
  unit?: {
    unit_number: string;
  };
  defect?: {
    item_name: string;
    defect_condition: string;
    severity: string;
  };
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defect:defects(item_name, defect_condition, severity)
        `)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as WorkOrder[];
    },
  });
}

export function useOpenWorkOrders() {
  return useQuery({
    queryKey: ['work-orders', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defect:defects(item_name, defect_condition, severity)
        `)
        .neq('status', 'verified')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as WorkOrder[];
    },
  });
}

export function useEmergencyWorkOrders() {
  return useQuery({
    queryKey: ['work-orders', 'emergency'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defect:defects(item_name, defect_condition, severity)
        `)
        .eq('priority', 'emergency')
        .neq('status', 'verified')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as WorkOrder[];
    },
  });
}

export function useWorkOrdersByProperty(propertyId: string | null) {
  return useQuery({
    queryKey: ['work-orders', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defect:defects(item_name, defect_condition, severity)
        `)
        .eq('property_id', propertyId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as WorkOrder[];
    },
    enabled: !!propertyId,
  });
}

export function useWorkOrderStats() {
  return useQuery({
    queryKey: ['work-orders', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status, priority, due_date');
      
      if (error) throw error;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pending = data.filter(wo => wo.status === 'pending').length;
      const inProgress = data.filter(wo => wo.status === 'in_progress').length;
      const completed = data.filter(wo => wo.status === 'completed').length;
      const verified = data.filter(wo => wo.status === 'verified').length;
      const emergency = data.filter(wo => wo.priority === 'emergency' && wo.status !== 'verified').length;
      const overdue = data.filter(wo => {
        const dueDate = new Date(wo.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && wo.status !== 'verified' && wo.status !== 'completed';
      }).length;
      
      return { pending, inProgress, completed, verified, emergency, overdue, total: data.length };
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workOrder: Omit<WorkOrderInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('work_orders')
        .insert(workOrder)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create work order: ${error.message}`);
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkOrderRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update work order: ${error.message}`);
    },
  });
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update({ assigned_to: assigneeId, status: 'assigned' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign work order: ${error.message}`);
    },
  });
}

export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, proofPhotos }: { id: string; proofPhotos?: string[] }) => {
      const updates: Partial<WorkOrderRow> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      
      if (proofPhotos) {
        updates.proof_photos = proofPhotos;
      }
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order marked as completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete work order: ${error.message}`);
    },
  });
}

export function useVerifyWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update({ status: 'verified' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order verified successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to verify work order: ${error.message}`);
    },
  });
}
