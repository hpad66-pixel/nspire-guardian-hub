import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type InspectionRow = Database['public']['Tables']['inspections']['Row'];
type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];

export interface Inspection extends InspectionRow {
  property?: {
    name: string;
  };
  unit?: {
    unit_number: string;
  };
  defects?: Array<{
    id: string;
    severity: string;
    item_name: string;
  }>;
}

export function useInspections() {
  return useQuery({
    queryKey: ['inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defects(id, severity, item_name)
        `)
        .order('inspection_date', { ascending: false });
      
      if (error) throw error;
      return data as Inspection[];
    },
  });
}

export function useInspectionsByProperty(propertyId: string) {
  return useQuery({
    queryKey: ['inspections', 'property', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defects(id, severity, item_name)
        `)
        .eq('property_id', propertyId)
        .order('inspection_date', { ascending: false });
      
      if (error) throw error;
      return data as Inspection[];
    },
    enabled: !!propertyId,
  });
}

export function useInspectionsByArea(area: 'outside' | 'inside' | 'unit') {
  return useQuery({
    queryKey: ['inspections', 'area', area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number),
          defects(id, severity, item_name)
        `)
        .eq('area', area)
        .order('inspection_date', { ascending: false });
      
      if (error) throw error;
      return data as Inspection[];
    },
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inspection: Omit<InspectionInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('inspections')
        .insert({ ...inspection, inspector_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create inspection: ${error.message}`);
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InspectionRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inspection: ${error.message}`);
    },
  });
}
