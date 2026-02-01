import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderActivity {
  id: string;
  work_order_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

export function useWorkOrderActivity(workOrderId: string | null) {
  return useQuery({
    queryKey: ['work-order-activity', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      
      const { data, error } = await supabase
        .from('work_order_activity')
        .select(`
          *,
          profile:profiles!work_order_activity_user_id_fkey(full_name)
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as WorkOrderActivity[];
    },
    enabled: !!workOrderId,
  });
}

export function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    created: 'created work order',
    submitted: 'submitted for approval',
    approved: 'approved',
    rejected: 'rejected',
    assigned: 'assigned work order',
    started: 'started work',
    completed: 'marked as completed',
    verified: 'verified completion',
    closed: 'closed work order',
    comment_added: 'added a comment',
    status_changed: 'changed status',
    cost_updated: 'updated cost estimate',
  };
  
  return actionMap[action] || action.replace(/_/g, ' ');
}
