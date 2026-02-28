import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useIsPlatformAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-platform-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.is_platform_admin ?? false;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
