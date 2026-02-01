import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type PermitDeliverable = Tables<'permit_deliverables'>;
export type PermitDeliverableInsert = TablesInsert<'permit_deliverables'>;
export type PermitDeliverableUpdate = TablesUpdate<'permit_deliverables'>;

export function useDeliverablesByRequirement(requirementId: string | null) {
  return useQuery({
    queryKey: ['permit-deliverables', requirementId],
    enabled: !!requirementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .select(`
          *,
          document:document_id(id, name, file_url)
        `)
        .eq('requirement_id', requirementId!)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useOverdueDeliverables() {
  return useQuery({
    queryKey: ['overdue-deliverables'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('permit_deliverables')
        .select(`
          *,
          permit_requirements:requirement_id(
            id, 
            title,
            permits:permit_id(id, name, property_id, properties:property_id(id, name))
          )
        `)
        .lt('due_date', today)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliverable: PermitDeliverableInsert) => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .insert(deliverable)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables', data.requirement_id] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-deliverables'] });
      toast.success('Deliverable created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create deliverable: ' + error.message);
    },
  });
}

export function useSubmitDeliverable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, documentId }: { id: string; documentId?: string }) => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
          document_id: documentId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables', data.requirement_id] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-deliverables'] });
      toast.success('Deliverable submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit deliverable: ' + error.message);
    },
  });
}

export function useApproveDeliverable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables', data.requirement_id] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      toast.success('Deliverable approved');
    },
    onError: (error) => {
      toast.error('Failed to approve deliverable: ' + error.message);
    },
  });
}

export function useRejectDeliverable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables', data.requirement_id] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      toast.success('Deliverable rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject deliverable: ' + error.message);
    },
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PermitDeliverableUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('permit_deliverables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables', data.requirement_id] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-deliverables'] });
      toast.success('Deliverable updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update deliverable: ' + error.message);
    },
  });
}

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('permit_deliverables')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['permit-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-deliverables'] });
      toast.success('Deliverable deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete deliverable: ' + error.message);
    },
  });
}
