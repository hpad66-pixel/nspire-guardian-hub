import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'new_topic' | 'improvement' | 'question' | 'resource_request' | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'under_review' | 'approved' | 'implemented' | 'declined';
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export function useUserTrainingRequests() {
  return useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingRequest[];
    },
  });
}

export function useAllTrainingRequests() {
  return useQuery({
    queryKey: ['training-requests-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingRequest[];
    },
  });
}

export function useCreateTrainingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      title: string;
      description: string;
      category?: TrainingRequest['category'];
      priority?: TrainingRequest['priority'];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_requests')
        .insert({
          ...request,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      queryClient.invalidateQueries({ queryKey: ['training-requests-all'] });
      toast.success('Training request submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit training request');
      console.error(error);
    },
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_response,
    }: {
      id: string;
      status: TrainingRequest['status'];
      admin_response?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_requests')
        .update({
          status,
          admin_response,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      queryClient.invalidateQueries({ queryKey: ['training-requests-all'] });
      toast.success('Response submitted');
    },
    onError: (error) => {
      toast.error('Failed to respond to request');
      console.error(error);
    },
  });
}

export function useRequestsCount() {
  return useQuery({
    queryKey: ['training-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('training_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}
