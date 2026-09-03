import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformSuperAdmin } from '@/lib/auth/platformAdmin';

/**
 * Server-authoritative platform authority. Auth metadata provides an immediate
 * UI hint, while the RPC handles an older access token after an admin grant.
 */
export function usePlatformSuperAdmin() {
  const { user } = useAuth();
  const metadataAuthority = isPlatformSuperAdmin(user);
  const query = useQuery({
    queryKey: ['is-super-admin', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      return data === true;
    },
  });

  return {
    ...query,
    isSuperAdmin: metadataAuthority || query.data === true,
  };
}
