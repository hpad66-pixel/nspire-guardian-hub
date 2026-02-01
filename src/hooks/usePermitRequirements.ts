import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type PermitRequirement = Tables<'permit_requirements'>;
export type PermitRequirementInsert = TablesInsert<'permit_requirements'>;
export type PermitRequirementUpdate = TablesUpdate<'permit_requirements'>;

export function useRequirementsByPermit(permitId: string | null) {
  return useQuery({
    queryKey: ['permit-requirements', permitId],
    enabled: !!permitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_requirements')
        .select(`
          *,
          permit_deliverables(*)
        `)
        .eq('permit_id', permitId!)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingRequirements(days: number = 30) {
  return useQuery({
    queryKey: ['upcoming-requirements', days],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('permit_requirements')
        .select(`
          *,
          permits:permit_id(id, name, property_id, properties:property_id(id, name))
        `)
        .lte('next_due_date', futureDate.toISOString().split('T')[0])
        .gte('next_due_date', new Date().toISOString().split('T')[0])
        .neq('status', 'waived')
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useNonCompliantRequirements() {
  return useQuery({
    queryKey: ['non-compliant-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_requirements')
        .select(`
          *,
          permits:permit_id(id, name, property_id, properties:property_id(id, name))
        `)
        .eq('status', 'non_compliant')
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requirement: PermitRequirementInsert) => {
      const { data, error } = await supabase
        .from('permit_requirements')
        .insert(requirement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-requirements', data.permit_id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Requirement created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create requirement: ' + error.message);
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PermitRequirementUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('permit_requirements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-requirements', data.permit_id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['non-compliant-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Requirement updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update requirement: ' + error.message);
    },
  });
}

export function useCompleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nextDueDate }: { id: string; nextDueDate?: string }) => {
      const updates: PermitRequirementUpdate = {
        status: 'compliant',
        last_completed_date: new Date().toISOString().split('T')[0],
      };

      if (nextDueDate) {
        updates.next_due_date = nextDueDate;
      }

      const { data, error } = await supabase
        .from('permit_requirements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-requirements', data.permit_id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['non-compliant-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Requirement marked as compliant');
    },
    onError: (error) => {
      toast.error('Failed to complete requirement: ' + error.message);
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('permit_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['permit-stats'] });
      toast.success('Requirement deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete requirement: ' + error.message);
    },
  });
}
