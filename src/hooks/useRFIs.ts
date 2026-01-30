import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type RFIRow = Database['public']['Tables']['project_rfis']['Row'];
type RFIInsert = Database['public']['Tables']['project_rfis']['Insert'];
type RFIStatus = Database['public']['Enums']['rfi_status'];

export interface RFI extends RFIRow {}

export function useRFIsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project-rfis', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_rfis')
        .select('*')
        .eq('project_id', projectId)
        .order('rfi_number', { ascending: false });
      
      if (error) throw error;
      return data as RFI[];
    },
    enabled: !!projectId,
  });
}

export function useRFI(id: string | null) {
  return useQuery({
    queryKey: ['project-rfis', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('project_rfis')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as RFI;
    },
    enabled: !!id,
  });
}

export function useRFIStats(projectId: string | null) {
  return useQuery({
    queryKey: ['project-rfis', 'stats', projectId],
    queryFn: async () => {
      if (!projectId) return { open: 0, pending: 0, answered: 0, closed: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('project_rfis')
        .select('status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      return {
        open: data.filter(r => r.status === 'open').length,
        pending: data.filter(r => r.status === 'pending').length,
        answered: data.filter(r => r.status === 'answered').length,
        closed: data.filter(r => r.status === 'closed').length,
        total: data.length,
      };
    },
    enabled: !!projectId,
  });
}

export function useCreateRFI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rfi: Omit<RFIInsert, 'id' | 'created_at' | 'updated_at' | 'rfi_number'>) => {
      const { data, error } = await supabase
        .from('project_rfis')
        .insert(rfi)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-rfis'] });
      toast.success(`RFI #${data.rfi_number} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create RFI: ${error.message}`);
    },
  });
}

export function useUpdateRFI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RFIRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_rfis')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-rfis'] });
      toast.success('RFI updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update RFI: ${error.message}`);
    },
  });
}

export function useRespondToRFI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      response,
      respondedBy,
    }: {
      id: string;
      response: string;
      respondedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('project_rfis')
        .update({
          response,
          responded_by: respondedBy,
          responded_at: new Date().toISOString(),
          status: 'answered' as RFIStatus,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-rfis'] });
      toast.success('RFI response submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to respond to RFI: ${error.message}`);
    },
  });
}

export function useCloseRFI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('project_rfis')
        .update({ status: 'closed' as RFIStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-rfis'] });
      toast.success('RFI closed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to close RFI: ${error.message}`);
    },
  });
}
