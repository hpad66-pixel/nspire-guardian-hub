import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tenant {
  id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lease_start: string;
  lease_end: string | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  status: string;
  move_in_date: string | null;
  move_out_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  unit?: {
    id: string;
    unit_number: string;
    property?: {
      id: string;
      name: string;
    };
  };
}

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          unit:units(
            id,
            unit_number,
            property:properties(id, name)
          )
        `)
        .order('last_name');
      
      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useTenantsByUnit(unitId: string) {
  return useQuery({
    queryKey: ['tenants', 'unit', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!unitId,
  });
}

export function useTenantStats() {
  return useQuery({
    queryKey: ['tenants', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('status');
      
      if (error) throw error;

      const active = data.filter(t => t.status === 'active').length;
      const noticeGiven = data.filter(t => t.status === 'notice_given').length;
      const movedOut = data.filter(t => t.status === 'moved_out').length;
      
      return {
        total: data.length,
        active,
        noticeGiven,
        movedOut,
      };
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'unit'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tenants')
        .insert({ ...tenant, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add tenant: ${error.message}`);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove tenant: ${error.message}`);
    },
  });
}
