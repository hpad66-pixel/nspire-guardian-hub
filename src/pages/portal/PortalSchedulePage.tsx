import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePortalBySlug, usePortalSession, setPortalSession } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';
import { GlorietaSchedule } from './schedule/GlorietaSchedule';

export default function PortalSchedulePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { data: portal, isLoading: portalLoading } = usePortalBySlug(slug);
  const { isAuthenticated: portalAuthed } = usePortalSession();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      // 1. Already has a portal session → allowed
      if (portalAuthed) {
        if (active) { setAllowed(true); setChecking(false); }
        return;
      }

      // 2. Magic link token in URL → auto-authenticate then allow
      if (token && portal) {
        const now = new Date().toISOString();
        const { data: access } = await supabase
          .from('portal_access')
          .select('*')
          .eq('magic_link_token', token)
          .eq('is_active', true)
          .gt('magic_link_expires_at', now)
          .maybeSingle();

        if (access) {
          await supabase
            .from('portal_access')
            .update({
              last_login_at: new Date().toISOString(),
              login_count: (access.login_count ?? 0) + 1,
            })
            .eq('id', access.id);

          setPortalSession({
            portalId: portal.id,
            email: access.email,
            name: access.name,
            accessId: access.id,
            authenticated: true,
            portalSlug: slug!,
          });

          if (active) { setAllowed(true); setChecking(false); }
          return;
        }
      }

      // 3. Supabase-authenticated admin/owner/manager → allowed
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const hasAdmin = roles?.some(r =>
          ['admin', 'owner', 'manager'].includes(r.role)
        );

        if (hasAdmin) {
          if (active) { setAllowed(true); setChecking(false); }
          return;
        }
      }

      // 4. Not authorized
      if (active) { setAllowed(false); setChecking(false); }
    }

    if (!portalLoading) check();

    return () => { active = false; };
  }, [portalAuthed, token, portal, portalLoading, slug]);

  if (portalLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed || !portal) {
    return <Navigate to={`/portal/${slug}?redirect=schedule`} replace />;
  }

  return (
    <GlorietaSchedule
      portalId={portal.id}
      portalName={portal.client_name ?? portal.name}
      accentColor={portal.brand_accent_color ?? '#D4A017'}
    />
  );
}
