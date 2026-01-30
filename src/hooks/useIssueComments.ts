import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IssueComment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function useIssueComments(issueId: string | null) {
  return useQuery({
    queryKey: ['issue-comments', issueId],
    queryFn: async () => {
      if (!issueId) return [];
      
      // Fetch comments
      const { data: comments, error: commentsError } = await supabase
        .from('issue_comments')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      if (!comments || comments.length === 0) return [];
      
      // Fetch profiles for comment authors
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine comments with user profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return comments.map(comment => ({
        ...comment,
        user: profileMap.get(comment.user_id) || null,
      })) as IssueComment[];
    },
    enabled: !!issueId,
  });
}

export function useCreateIssueComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ issueId, content }: { issueId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('issue_comments')
        .insert({ issue_id: issueId, user_id: user.id, content })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issue-comments', variables.issueId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to post comment: ${error.message}`);
    },
  });
}

export function useDeleteIssueComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, issueId }: { commentId: string; issueId: string }) => {
      const { error } = await supabase
        .from('issue_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      return { issueId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issue-comments', data.issueId] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}
