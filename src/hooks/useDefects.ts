import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { calculateDeadline } from '@/data/nspire-catalog';

type DefectRow = Database['public']['Tables']['defects']['Row'];
type DefectInsert = Database['public']['Tables']['defects']['Insert'];
type SeverityLevel = Database['public']['Enums']['severity_level'];

export interface Defect extends DefectRow {
  inspection?: {
    property_id: string;
    unit_id: string | null;
    area: string;
    property?: {
      name: string;
    };
    unit?: {
      unit_number: string;
    };
  };
}

export function useDefects() {
  return useQuery({
    queryKey: ['defects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('defects')
        .select(`
          *,
          inspection:inspections(
            property_id,
            unit_id,
            area,
            property:properties(name),
            unit:units(unit_number)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Defect[];
    },
  });
}

export function useDefectsByInspection(inspectionId: string | null) {
  return useQuery({
    queryKey: ['defects', 'inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return [];
      const { data, error } = await supabase
        .from('defects')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DefectRow[];
    },
    enabled: !!inspectionId,
  });
}

export function useDefectsBySeverity(severity: SeverityLevel) {
  return useQuery({
    queryKey: ['defects', 'severity', severity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('defects')
        .select(`
          *,
          inspection:inspections(
            property_id,
            unit_id,
            area,
            property:properties(name),
            unit:units(unit_number)
          )
        `)
        .eq('severity', severity)
        .is('repaired_at', null)
        .order('repair_deadline', { ascending: true });
      
      if (error) throw error;
      return data as Defect[];
    },
  });
}

export function useOpenDefects() {
  return useQuery({
    queryKey: ['defects', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('defects')
        .select(`
          *,
          inspection:inspections(
            property_id,
            unit_id,
            area,
            property:properties(name),
            unit:units(unit_number)
          )
        `)
        .is('repaired_at', null)
        .order('repair_deadline', { ascending: true });
      
      if (error) throw error;
      return data as Defect[];
    },
  });
}

export function useDefectStats() {
  return useQuery({
    queryKey: ['defects', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('defects')
        .select('severity, repaired_at, repair_verified');
      
      if (error) throw error;
      
      const open = data.filter(d => !d.repaired_at);
      const severe = open.filter(d => d.severity === 'severe').length;
      const moderate = open.filter(d => d.severity === 'moderate').length;
      const low = open.filter(d => d.severity === 'low').length;
      const resolved = data.filter(d => d.repaired_at).length;
      const verified = data.filter(d => d.repair_verified).length;
      
      return { severe, moderate, low, resolved, verified, total: data.length };
    },
  });
}

export function useCreateDefect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (defect: Omit<DefectInsert, 'id' | 'created_at' | 'updated_at' | 'repair_deadline'> & { severity: SeverityLevel }) => {
      const deadline = calculateDeadline(defect.severity);
      
      const { data, error } = await supabase
        .from('defects')
        .insert({
          ...defect,
          repair_deadline: deadline.toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Defect recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record defect: ${error.message}`);
    },
  });
}

export function useUpdateDefect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DefectRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('defects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      toast.success('Defect updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update defect: ${error.message}`);
    },
  });
}

export function useMarkDefectRepaired() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, proofPhotos }: { id: string; proofPhotos?: string[] }) => {
      const updates: Partial<DefectRow> = {
        repaired_at: new Date().toISOString(),
      };
      
      if (proofPhotos) {
        updates.photo_urls = proofPhotos;
      }
      
      const { data, error } = await supabase
        .from('defects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Defect marked as repaired');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark defect as repaired: ${error.message}`);
    },
  });
}

export function useVerifyRepair() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('defects')
        .update({ repair_verified: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      toast.success('Repair verified successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to verify repair: ${error.message}`);
    },
  });
}
