import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface MeetingUnlockRequest {
  id: string;
  meeting_id: string;
  requested_by: string;
  requested_at: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useMeetingUnlockRequests(meetingId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['meeting-unlock-requests', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_unlock_requests')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MeetingUnlockRequest[];
    },
    enabled: !!meetingId,
  });

  const pendingRequest = requests.find(r => r.status === 'pending') ?? null;

  const requestUnlock = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await supabase
        .from('meeting_unlock_requests')
        .insert([{ meeting_id: meetingId, requested_by: user!.id, reason }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-unlock-requests', meetingId] });
      toast.success('Unlock request submitted — awaiting supervisor approval');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewRequest = useMutation({
    mutationFn: async ({
      requestId,
      status,
      reviewer_notes,
      meetingId: mid,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      reviewer_notes?: string;
      meetingId: string;
    }) => {
      const { error: reviewError } = await supabase
        .from('meeting_unlock_requests')
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reviewer_notes || null,
        })
        .eq('id', requestId);
      if (reviewError) throw reviewError;

      // If approved → revert meeting to 'reviewed' (unlocked) and clear the request flag
      if (status === 'approved') {
        const { error: meetingError } = await supabase
          .from('project_meetings')
          .update({
            status: 'reviewed',
            unlock_requested: false,
            unlock_requested_by: null,
            unlock_requested_at: null,
            unlock_request_reason: null,
          })
          .eq('id', mid);
        if (meetingError) throw meetingError;
      } else {
        // Rejected — clear the pending flag but keep finalized
        const { error: meetingError } = await supabase
          .from('project_meetings')
          .update({
            unlock_requested: false,
            unlock_requested_by: null,
            unlock_requested_at: null,
            unlock_request_reason: null,
          })
          .eq('id', mid);
        if (meetingError) throw meetingError;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-unlock-requests', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['project-meetings'] });
      toast.success(vars.status === 'approved' ? 'Unlock approved — minutes are now editable' : 'Unlock request rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { requests, pendingRequest, isLoading, requestUnlock, reviewRequest };
}
