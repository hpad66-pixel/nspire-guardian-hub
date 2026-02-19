import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setPortalSession, usePortalBySlug } from '@/hooks/usePortal';

export default function PortalAuthPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { data: portal } = usePortalBySlug(slug);

  useEffect(() => {
    if (!token || !portal) return;

    async function authenticate() {
      const now = new Date().toISOString();
      const { data: access, error } = await supabase
        .from('portal_access')
        .select('*')
        .eq('magic_link_token', token!)
        .eq('is_active', true)
        .gt('magic_link_expires_at', now)
        .maybeSingle();

      if (error || !access) {
        navigate(`/portal/${slug}?error=expired`);
        return;
      }

      const isFirstLogin = access.login_count === 0;

      // Clear token, update login info
      await supabase
        .from('portal_access')
        .update({
          magic_link_token: null,
          magic_link_expires_at: null,
          last_login_at: new Date().toISOString(),
          login_count: (access.login_count ?? 0) + 1,
        })
        .eq('id', access.id);

      setPortalSession({
        portalId: portal!.id,
        email: access.email,
        name: access.name,
        accessId: access.id,
        authenticated: true,
        portalSlug: slug!,
      });

      if (isFirstLogin) {
        navigate(`/portal/${slug}/welcome`);
      } else {
        navigate(`/portal/${slug}/home`);
      }
    }

    authenticate();
  }, [token, portal, slug, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center space-y-3">
          <p className="font-semibold text-foreground">This link has expired or already been used.</p>
          <a href={`/portal/${slug}`} className="text-sm text-primary hover:underline">Request a new link</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
