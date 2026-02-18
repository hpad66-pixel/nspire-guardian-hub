import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';

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

  // Show onboarding wizard if:
  // 1. User is logged in
  // 2. User is admin, owner, or property manager
  // 3. No properties exist
  // 4. Onboarding not already completed
  const shouldShowOnboarding =
    !!user &&
    !statusLoading &&
    !propertiesLoading &&
    (userRole === 'admin' || userRole === 'owner' || userRole === 'manager') &&
    (!properties || properties.length === 0) &&
    !onboardingStatus?.completed_at &&
    onboardingStatus !== undefined; // only show if we've actually loaded the status

  return {
    shouldShowOnboarding,
    onboardingStatus,
    isLoading: statusLoading || propertiesLoading,
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
