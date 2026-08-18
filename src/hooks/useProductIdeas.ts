import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { ProductIdeaCategory, ProductIdeaStatus } from '@/lib/productIdeas';
import { toast } from 'sonner';

export interface ProductIdeaUpdate {
  id: string;
  idea_id: string;
  created_by: string;
  author_name: string;
  update_type: 'note' | 'status';
  from_status: ProductIdeaStatus | null;
  to_status: ProductIdeaStatus | null;
  title: string;
  body: string;
  created_at: string;
}

export interface ProductIdea {
  id: string;
  source_workspace_id: string;
  created_by: string;
  requester_name: string;
  requester_avatar_url: string | null;
  title: string;
  description: string;
  category: ProductIdeaCategory;
  status: ProductIdeaStatus;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  user_vote: -1 | 1 | null;
  updates: ProductIdeaUpdate[];
}

type ProductIdeaRow = Omit<ProductIdea, 'upvotes' | 'downvotes' | 'user_vote' | 'updates'>;

interface VoteSummaryRow {
  idea_id: string;
  upvotes: number | string;
  downvotes: number | string;
  user_vote: -1 | 1 | null;
}

interface ProductIdeaRpcResult<T> {
  data: T | null;
  error: Error | null;
}

type ProductIdeaRpc = {
  (name: 'get_product_idea_vote_summary'): Promise<ProductIdeaRpcResult<VoteSummaryRow[]>>;
  (
    name: 'create_product_idea',
    args: {
      p_title: string;
      p_description: string;
      p_category: ProductIdeaCategory;
      p_requester_name: string;
      p_requester_avatar_url: string | null;
    },
  ): Promise<ProductIdeaRpcResult<string>>;
  (
    name: 'cast_product_idea_vote',
    args: { p_idea_id: string; p_value: -1 | 1 },
  ): Promise<ProductIdeaRpcResult<boolean>>;
  (
    name: 'publish_product_idea_update',
    args: {
      p_idea_id: string;
      p_status: ProductIdeaStatus;
      p_title: string;
      p_body: string;
    },
  ): Promise<ProductIdeaRpcResult<string>>;
};

// These functions are introduced by the Product Ideas migration. Keeping the
// narrow adapter here avoids weakening the generated Supabase client globally.
const productIdeaRpc = supabase.rpc as unknown as ProductIdeaRpc;

const BOARD_KEY = ['product-ideas'] as const;

export function useProductIdeas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...BOARD_KEY, user?.id],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    queryFn: async (): Promise<ProductIdea[]> => {
      const [ideasResult, votesResult, updatesResult] = await Promise.all([
        supabase
          .from('product_ideas' as never)
          .select('*')
          .order('created_at', { ascending: false }),
        productIdeaRpc('get_product_idea_vote_summary'),
        supabase
          .from('product_idea_updates' as never)
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (ideasResult.error) throw ideasResult.error;
      if (votesResult.error) throw votesResult.error;
      if (updatesResult.error) throw updatesResult.error;

      const summaries = new Map<string, VoteSummaryRow>(
        ((votesResult.data ?? []) as VoteSummaryRow[]).map((row) => [row.idea_id, row]),
      );
      const updatesByIdea = new Map<string, ProductIdeaUpdate[]>();
      for (const update of (updatesResult.data ?? []) as ProductIdeaUpdate[]) {
        const current = updatesByIdea.get(update.idea_id) ?? [];
        current.push(update);
        updatesByIdea.set(update.idea_id, current);
      }

      return ((ideasResult.data ?? []) as ProductIdeaRow[]).map((idea) => {
        const votes = summaries.get(idea.id);
        return {
          ...idea,
          upvotes: Number(votes?.upvotes ?? 0),
          downvotes: Number(votes?.downvotes ?? 0),
          user_vote: votes?.user_vote ?? null,
          updates: updatesByIdea.get(idea.id) ?? [],
        };
      });
    },
  });
}

export function useCreateProductIdea() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      category,
    }: {
      title: string;
      description: string;
      category: ProductIdeaCategory;
    }) => {
      if (!user || !workspaceId) throw new Error('A signed-in workspace account is required.');
      if (!title.trim() || !description.trim()) {
        throw new Error('Add a title and describe the idea.');
      }

      const requesterName =
        profile?.full_name?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email?.split('@')[0] ||
        'Proj OS member';

      // Creation and the requester's first upvote commit together so a dropped
      // connection cannot leave a half-created submission.
      const { data, error } = await productIdeaRpc('create_product_idea', {
        p_title: title.trim(),
        p_description: description.trim(),
        p_category: category,
        p_requester_name: requesterName,
        p_requester_avatar_url: profile?.avatar_url ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOARD_KEY });
      toast.success('Idea shared — the community can now vote on it.');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not share the idea.'),
  });
}

export function useCastProductIdeaVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ideaId, value }: { ideaId: string; value: -1 | 1 }) => {
      const { error } = await productIdeaRpc('cast_product_idea_vote', {
        p_idea_id: ideaId,
        p_value: value,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
    onError: (error: Error) => toast.error(error.message || 'Could not record your vote.'),
  });
}

export function usePublishProductIdeaUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ideaId,
      status,
      title,
      body,
    }: {
      ideaId: string;
      status: ProductIdeaStatus;
      title: string;
      body: string;
    }) => {
      const { data, error } = await productIdeaRpc('publish_product_idea_update', {
        p_idea_id: ideaId,
        p_status: status,
        p_title: title.trim(),
        p_body: body.trim(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOARD_KEY });
      toast.success('Client update published.');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not publish the update.'),
  });
}
