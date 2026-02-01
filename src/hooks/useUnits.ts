import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type UnitRow = Database['public']['Tables']['units']['Row'];
type UnitInsert = Database['public']['Tables']['units']['Insert'];

export interface Unit extends UnitRow {
  property?: {
    name: string;
  };
}

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          property:properties(name)
        `)
        .order('unit_number', { ascending: true });
      
      if (error) throw error;
      return data as Unit[];
    },
  });
}

export function useUnitsByProperty(propertyId: string | null) {
  return useQuery({
    queryKey: ['units', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('property_id', propertyId)
        .order('unit_number', { ascending: true });
      
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!propertyId,
  });
}

export function useUnit(unitId: string | null) {
  return useQuery({
    queryKey: ['units', unitId],
    queryFn: async () => {
      if (!unitId) return null;
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('id', unitId)
        .single();
      
      if (error) throw error;
      return data as Unit;
    },
    enabled: !!unitId,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unit: Omit<UnitInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create unit: ${error.message}`);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnitRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update unit: ${error.message}`);
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete unit: ${error.message}`);
    },
  });
}

export function useBulkCreateUnits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (units: Omit<UnitInsert, 'id' | 'created_at' | 'updated_at'>[]) => {
      // Insert in batches of 100 to avoid request size limits
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < units.length; i += batchSize) {
        const batch = units.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('units')
          .insert(batch)
          .select();
        
        if (error) throw error;
        results.push(...(data || []));
      }
      
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(`Successfully imported ${data.length} units`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import units: ${error.message}`);
    },
  });
}

export function useUnitStats() {
  return useQuery({
    queryKey: ['units', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('status');
      
      if (error) throw error;
      
      const total = data.length;
      const occupied = data.filter(u => u.status === 'occupied').length;
      const vacant = data.filter(u => u.status === 'vacant').length;
      const maintenance = data.filter(u => u.status === 'maintenance').length;
      
      return {
        total,
        occupied,
        vacant,
        maintenance,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    },
  });
}
