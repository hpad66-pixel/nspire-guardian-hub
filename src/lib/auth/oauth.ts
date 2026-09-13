import type { Provider } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';

export const AUTH0_PROVIDER_ID =
  import.meta.env.VITE_AUTH0_PROVIDER_ID || '';

export function isAuth0SignInEnabled() {
  return Boolean(AUTH0_PROVIDER_ID);
}

export async function signInWithAuth0(redirectTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: AUTH0_PROVIDER_ID as Provider,
    options: {
      redirectTo,
      scopes: 'openid profile email',
    },
  });
}
