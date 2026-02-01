import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Permit = Tables<'permits'>;
export type PermitInsert = TablesInsert<'permits'>;
export type PermitUpdate = TablesUpdate<'permits'>;

export function usePermits(propertyId?: string) {
  return useQuery({
    queryKey: ['permits', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('permits')
        .select(`
          *,
          properties:property_id(id, name),
          document:document_id(id, name, file_url)
        `)
        .order('expiry_date', { ascending: true });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePermit(id: string | null) {
  return useQuery({
    queryKey: ['permit', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permits')
        .select(`
          *,
          properties:property_id(id, name, address, city, state),
          document:document_id(id, name, file_url)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function usePermitStats() {
  return useQuery({
    queryKey: ['permit-stats'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: permits, error } = await supabase
        .from('permits')
        .select('id, status, expiry_date');

      if (error) throw error;

      const { data: requirements, error: reqError } = await supabase
        .from('permit_requirements')
        .select('id, status, next_due_date');

      if (reqError) throw reqError;

      const active = permits?.filter(p => p.status === 'active').length || 0;
      const expiringSoon = permits?.filter(p => {
        if (!p.expiry_date) return false;
        const expiry = new Date(p.expiry_date);
        return p.status === 'active' && expiry <= thirtyDaysFromNow && expiry >= now;
      }).length || 0;

      const dueThisMonth = requirements?.filter(r => {
        if (!r.next_due_date) return false;
        const due = new Date(r.next_due_date);
        return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
      }).length || 0;

      const nonCompliant = requirements?.filter(r => r.status === 'non_compliant').length || 0;

      return {
        active,
        expiringSoon,
        dueThisMonth,
        nonCompliant,
        total: permits?.length || 0,
      };
    },
  });
}

export function useExpiringPermits(days: number = 30) {
  return useQuery({
    queryKey: ['expiring-permits', days],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('permits')
        .select(`
          *,
          properties:property_id(id, name)
        `)
        .eq('status', 'active')
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePermit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (permit: Omit<PermitInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('permits')
        .insert({ ...permit, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Permit created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create permit: ' + error.message);
    },
  });
}

export function useUpdatePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PermitUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('permits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      queryClient.invalidateQueries({ queryKey: ['permit', data.id] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Permit updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update permit: ' + error.message);
    },
  });
}

export function useDeletePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('permits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Permit deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete permit: ' + error.message);
    },
  });
}
