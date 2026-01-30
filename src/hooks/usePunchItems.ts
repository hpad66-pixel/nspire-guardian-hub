import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PunchItemRow = Database['public']['Tables']['punch_items']['Row'];
type PunchItemInsert = Database['public']['Tables']['punch_items']['Insert'];
type PunchStatus = Database['public']['Enums']['punch_status'];

export interface PunchItem extends PunchItemRow {}

export function usePunchItemsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['punch-items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PunchItem[];
    },
    enabled: !!projectId,
  });
}

export function usePunchItemStats(projectId: string | null) {
  return useQuery({
    queryKey: ['punch-items', 'stats', projectId],
    queryFn: async () => {
      if (!projectId) return { open: 0, inProgress: 0, completed: 0, verified: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('punch_items')
        .select('status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      return {
        open: data.filter(p => p.status === 'open').length,
        inProgress: data.filter(p => p.status === 'in_progress').length,
        completed: data.filter(p => p.status === 'completed').length,
        verified: data.filter(p => p.status === 'verified').length,
        total: data.length,
      };
    },
    enabled: !!projectId,
  });
}

export function useCreatePunchItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<PunchItemInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('punch_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create punch item: ${error.message}`);
    },
  });
}

export function useUpdatePunchItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PunchItemRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('punch_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update punch item: ${error.message}`);
    },
  });
}

export function useCompletePunchItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      afterPhotos,
    }: {
      id: string;
      afterPhotos?: string[];
    }) => {
      const updates: Partial<PunchItemRow> = {
        status: 'completed' as PunchStatus,
        completed_at: new Date().toISOString(),
      };
      
      if (afterPhotos) {
        updates.after_photos = afterPhotos;
      }
      
      const { data, error } = await supabase
        .from('punch_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item marked as completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete punch item: ${error.message}`);
    },
  });
}

export function useVerifyPunchItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      verifiedBy,
    }: {
      id: string;
      verifiedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('punch_items')
        .update({
          status: 'verified' as PunchStatus,
          verified_at: new Date().toISOString(),
          verified_by: verifiedBy,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item verified');
    },
    onError: (error: Error) => {
      toast.error(`Failed to verify punch item: ${error.message}`);
    },
  });
}
