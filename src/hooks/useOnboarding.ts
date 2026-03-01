import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useWorkspace } from '@/hooks/useWorkspace';

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export interface OnboardingStatus {
  id: string;
  user_id: string;
  completed_at: string | null;
  steps_completed: Record<string, boolean>;
  created_at: string;
}

export function useOnboarding() {
  const { user, userRole } = useAuth();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();

  const { data: onboardingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as OnboardingStatus | null;
    },
    enabled: !!user,
  });

  // Self-service: user is on the default workspace (hasn't created their own yet)
  const isOnDefaultWorkspace =
    !workspaceLoading && workspace?.id === DEFAULT_WORKSPACE_ID;

  // Show onboarding wizard if:
  // 1. User is logged in
  // 2. Either: user is admin/owner/manager with no properties, OR user is on the default workspace
  // 3. Onboarding not already completed
  const isPrivilegedRole =
    userRole === 'admin' || userRole === 'owner' || userRole === 'manager';

  const shouldShowOnboarding =
    !!user &&
    !statusLoading &&
    !propertiesLoading &&
    !workspaceLoading &&
    (
      (isPrivilegedRole && (!properties || properties.length === 0)) ||
      isOnDefaultWorkspace
    ) &&
    !onboardingStatus?.completed_at &&
    onboardingStatus !== undefined;

  return {
    shouldShowOnboarding,
    onboardingStatus,
    isLoading: statusLoading || propertiesLoading || workspaceLoading,
  };
}

export function useUpdateOnboardingStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: {
      steps_completed?: Record<string, boolean>;
      completed_at?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if record exists
      const { data: existing } = await supabase
        .from('onboarding_status')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('onboarding_status')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('onboarding_status')
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
}

export function useCompleteOnboarding() {
  const updateOnboarding = useUpdateOnboardingStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await updateOnboarding.mutateAsync({
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
