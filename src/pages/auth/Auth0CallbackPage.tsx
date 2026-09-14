import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseAuth0Fragment } from '@/lib/auth/auth0';

/**
 * Landing point for the Auth0 bridge. The `auth0-callback` edge function has
 * already verified the Auth0 identity and minted a Supabase session; all that is
 * left is to hand those tokens to the Supabase client and get out of the way.
 */
export default function Auth0CallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign-in…');
  // React 18 StrictMode double-invokes effects in development; the fragment is
  // consumed once, so guard against redeeming it twice.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const tokens = parseAuth0Fragment(window.location.hash);

    // Scrub the tokens out of the address bar and history before anything else.
    window.history.replaceState(null, '', window.location.pathname);

    if (!tokens) {
      navigate('/auth?error=sign_in_failed', { replace: true });
      return;
    }

    supabase.auth
      .setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
      .then(({ error }) => {
        if (error) {
          setMessage('Sign-in could not be completed.');
          toast.error('Sign-in could not be completed. Please try again.');
          navigate('/auth?error=session_failed', { replace: true });
          return;
        }
        navigate(tokens.next ?? '/dashboard', { replace: true });
      });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
