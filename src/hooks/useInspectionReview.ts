import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ReviewStatus = Database['public']['Enums']['daily_inspection_review_status'];

export interface DailyInspectionWithDetails {
  id: string;
  property_id: string;
  inspection_date: string;
  inspector_id: string | null;
  weather: string | null;
  general_notes: string | null;
  status: string;
  review_status: ReviewStatus | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  property?: {
    name: string;
  };
  inspector?: {
    full_name: string | null;
    email: string | null;
  };
}

export function usePendingReviews() {
  return useQuery({
    queryKey: ['pending-reviews'],
    queryFn: async () => {
      const { data: inspections, error } = await supabase
        .from('daily_inspections')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('review_status', 'pending_review')
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch inspector profiles
      const inspectorIds = [...new Set(inspections?.map(i => i.inspector_id).filter(Boolean) as string[])];
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (inspectorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', inspectorIds);
        
        profiles?.forEach(p => {
          profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }
      
      const result = inspections?.map(i => ({
        ...i,
        inspector: i.inspector_id ? profileMap[i.inspector_id] : undefined,
      }));
      return result as DailyInspectionWithDetails[];
    },
  });
}

export function usePendingReviewCount() {
  return useQuery({
    queryKey: ['pending-review-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('daily_inspections')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'pending_review');
      
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useReviewInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      id: string;
      review_status: ReviewStatus;
      reviewer_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('daily_inspections')
        .update({
          review_status: input.review_status,
          reviewer_notes: input.reviewer_notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['pending-review-count'] });
      queryClient.invalidateQueries({ queryKey: ['daily-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-inspection'] });
      
      const statusMessages: Record<string, string> = {
        approved: 'Inspection approved. Issues have been created from defects.',
        needs_revision: 'Revision requested. Inspector will be notified.',
        rejected: 'Inspection rejected.',
      };
      toast.success(statusMessages[variables.review_status] || 'Review submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });
}
