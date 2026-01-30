import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IssueMention {
  id: string;
  issue_id: string;
  comment_id: string;
  mentioned_user_id: string;
  created_at: string;
}

export function useIssueMentions(issueId: string | null) {
  return useQuery({
    queryKey: ['issue-mentions', issueId],
    queryFn: async () => {
      if (!issueId) return [];
      
      const { data, error } = await supabase
        .from('issue_mentions')
        .select('*')
        .eq('issue_id', issueId);
      
      if (error) throw error;
      return data as IssueMention[];
    },
    enabled: !!issueId,
  });
}

export function useMyMentionedIssueIds() {
  return useQuery({
    queryKey: ['my-mentioned-issues'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('issue_mentions')
        .select('issue_id')
        .eq('mentioned_user_id', user.id);
      
      if (error) throw error;
      return [...new Set(data.map(m => m.issue_id))];
    },
  });
}

export function useCreateIssueMentions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      issueId, 
      commentId, 
      mentionedUserIds 
    }: { 
      issueId: string; 
      commentId: string; 
      mentionedUserIds: string[] 
    }) => {
      if (mentionedUserIds.length === 0) return [];
      
      const mentions = mentionedUserIds.map(userId => ({
        issue_id: issueId,
        comment_id: commentId,
        mentioned_user_id: userId,
      }));
      
      const { data, error } = await supabase
        .from('issue_mentions')
        .insert(mentions)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issue-mentions', variables.issueId] });
      queryClient.invalidateQueries({ queryKey: ['my-mentioned-issues'] });
    },
  });
}
