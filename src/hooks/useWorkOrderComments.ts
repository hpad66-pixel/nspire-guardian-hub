import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface WorkOrderComment {
  id: string;
  work_order_id: string;
  user_id: string;
  content: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useWorkOrderComments(workOrderId: string | null) {
  return useQuery({
    queryKey: ['work-order-comments', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      
      const { data, error } = await supabase
        .from('work_order_comments')
        .select(`
          *,
          profile:profiles!work_order_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as WorkOrderComment[];
    },
    enabled: !!workOrderId,
  });
}

export function useCreateWorkOrderComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      workOrderId,
      content,
      attachments = [],
    }: {
      workOrderId: string;
      content: string;
      attachments?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('work_order_comments')
        .insert({
          work_order_id: workOrderId,
          user_id: user.id,
          content,
          attachments,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Also log activity
      await supabase.from('work_order_activity').insert({
        work_order_id: workOrderId,
        user_id: user.id,
        action: 'comment_added',
        details: { content_preview: content.substring(0, 100) },
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-comments', variables.workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-order-activity', variables.workOrderId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

export function useUpdateWorkOrderComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      content,
      workOrderId,
    }: {
      id: string;
      content: string;
      workOrderId: string;
    }) => {
      const { data, error } = await supabase
        .from('work_order_comments')
        .update({ content })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-comments', variables.workOrderId] });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
}

export function useDeleteWorkOrderComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      workOrderId,
    }: {
      id: string;
      workOrderId: string;
    }) => {
      const { error } = await supabase
        .from('work_order_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-comments', variables.workOrderId] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}
