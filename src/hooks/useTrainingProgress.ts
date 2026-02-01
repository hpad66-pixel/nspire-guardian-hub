import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingProgress {
  id: string;
  user_id: string;
  resource_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useUserTrainingProgress() {
  return useQuery({
    queryKey: ['training-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as TrainingProgress[];
    },
  });
}

export function useResourceProgress(resourceId: string) {
  return useQuery({
    queryKey: ['training-progress', resourceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('training_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('resource_id', resourceId)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingProgress | null;
    },
    enabled: !!resourceId,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      resourceId, 
      status, 
      notes 
    }: { 
      resourceId: string; 
      status: TrainingProgress['status']; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: {
        user_id: string;
        resource_id: string;
        status: string;
        started_at?: string;
        completed_at?: string;
        notes?: string;
      } = {
        user_id: user.id,
        resource_id: resourceId,
        status,
      };

      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('training_progress')
        .upsert(updateData, {
          onConflict: 'user_id,resource_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] });
      queryClient.invalidateQueries({ queryKey: ['training-progress', variables.resourceId] });
      
      if (variables.status === 'completed') {
        toast.success('Training marked as completed!');
      } else if (variables.status === 'in_progress') {
        toast.success('Progress updated');
      }
    },
    onError: (error) => {
      toast.error('Failed to update progress');
      console.error(error);
    },
  });
}

export function useProgressStats() {
  return useQuery({
    queryKey: ['training-progress-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { completed: 0, inProgress: 0, notStarted: 0 };

      const { data, error } = await supabase
        .from('training_progress')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const completed = data?.filter(p => p.status === 'completed').length || 0;
      const inProgress = data?.filter(p => p.status === 'in_progress').length || 0;
      const notStarted = data?.filter(p => p.status === 'not_started').length || 0;

      return { completed, inProgress, notStarted };
    },
  });
}
