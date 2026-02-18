import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays } from 'date-fns';

export type WorkspacePlan = 'trial' | 'starter' | 'professional' | 'enterprise';
export type WorkspaceStatus = 'active' | 'trial' | 'suspended' | 'churned';

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseWorkspaceReturn {
  workspace: Workspace | null;
  isLoading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  plan: WorkspacePlan | null;
  workspaceId: string | null;
  refetchWorkspace: () => void;
}

export function useWorkspace(): UseWorkspaceReturn {
  const { user } = useAuth();

  const { data: workspace, isLoading, refetch } = useQuery({
    queryKey: ['workspace', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Get the workspace_id from profiles first, then fetch the workspace
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.workspace_id) return null;

      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, slug, plan, status, trial_ends_at, stripe_customer_id, stripe_subscription_id, owner_user_id, created_at, updated_at')
        .eq('id', profile.workspace_id)
        .maybeSingle();

      if (wsError) throw wsError;
      return ws as Workspace | null;
    },
  });

  const isActive =
    workspace?.status === 'active' || workspace?.status === 'trial';

  const isTrialing =
    workspace?.status === 'trial' &&
    !!workspace?.trial_ends_at &&
    new Date(workspace.trial_ends_at) > new Date();

  const trialDaysLeft =
    isTrialing && workspace?.trial_ends_at
      ? Math.max(0, differenceInDays(new Date(workspace.trial_ends_at), new Date()))
      : null;

  return {
    workspace: workspace ?? null,
    isLoading,
    isActive,
    isTrialing,
    trialDaysLeft,
    plan: (workspace?.plan as WorkspacePlan) ?? null,
    workspaceId: workspace?.id ?? null,
    refetchWorkspace: refetch,
  };
}
