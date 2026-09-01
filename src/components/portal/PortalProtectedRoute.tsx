/**
 * G3 · PortalProtectedRoute
 *
 * Wraps /sub-portal/* and /owner-portal/* routes with a
 * three-layer gate:
 *   1. Auth      -> redirect to /auth?next=<encoded path>
 *   2. Active portal membership -> redirect to a safe access page when missing
 *   3. Plan      -> render <UpgradeRequired/> in place
 *
 * Mirrors the existing ProtectedRoute pattern (Loader2 spinner
 * during async checks). The component renders an <Outlet/>
 * when all three checks pass, so it can wrap a sub-tree of
 * portal routes from a single mount point.
 *
 * External clients are authorized by portal_memberships, not the internal
 * staff permission-template engine. Database RLS applies the same membership
 * and organization boundary to every record the portal reads.
 */
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { canUseFeature, type FeatureKey } from '@/lib/billing';
import { supabase } from '@/integrations/supabase/client';
import { UpgradeRequired } from './UpgradeRequired';

export type PortalRole = 'subcontractor' | 'owner' | 'ops';
/** UI-friendly feature name; mapped internally to the billing key. */
export type PortalFeature = 'sub_portal' | 'owner_portal' | 'ops_portal';

interface PortalProtectedRouteProps {
  role: PortalRole;
  feature: PortalFeature;
}

/** Map G-prompt feature names to the canonical billing FeatureKey. */
const FEATURE_MAP: Record<PortalFeature, FeatureKey> = {
  sub_portal: 'subcontractor_portal',
  owner_portal: 'owner_portal',
  ops_portal: 'ops_portal',
};

function expectedPortalKind(role: PortalRole): 'owner' | 'sub' | 'ops' {
  if (role === 'owner') return 'owner';
  if (role === 'ops') return 'ops';
  return 'sub';
}

function portalAuthQuery(role: PortalRole): string {
  if (role === 'owner') return 'client';
  if (role === 'ops') return 'ops';
  return 'subcontractor';
}

type GateState =
  | { status: 'checking' }
  | { status: 'allowed' }
  | { status: 'forbidden' }
  | { status: 'plan-locked' };

export function PortalProtectedRoute({
  role,
  feature,
}: PortalProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [gate, setGate] = useState<GateState>({ status: 'checking' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // handled below

    let cancelled = false;

    (async () => {
      // Super-admin bypass: read app_metadata.role from the JWT.
      // Plan still applies even for super admin so the upgrade
      // page is testable from a super-admin account.
      const isSuper =
        (user as any)?.app_metadata?.role === 'super_admin' ||
        (user as any)?.user_metadata?.role === 'super_admin';

      try {
        // A workspace's own main member (the GC/admin) can preview & manage the
        // client/sub portals for their own project — they're not an "owner" role
        // but they own the data. The plan feature still applies.
        let isMainAdmin = false;
        if (!isSuper) {
          const { data: mainMember } = await supabase
            .from('portal_memberships' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('portal_kind', 'main')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          isMainAdmin = Boolean(mainMember);
        }

        if (isSuper || isMainAdmin) {
          const hasFeature = await canUseFeature(FEATURE_MAP[feature]);
          if (cancelled) return;
          setGate({ status: hasFeature ? 'allowed' : 'plan-locked' });
          return;
        }

        // Portal membership is the security boundary for external users. They
        // intentionally do not receive an internal permission-template
        // assignment, so checking the staff RBAC engine here would reject every
        // properly invited client. RLS permits users to read their own row.
        const expectedKind = expectedPortalKind(role);
        const [membershipResult, hasFeature] = await Promise.all([
          supabase
            .from('portal_memberships' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('portal_kind', expectedKind)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
          canUseFeature(FEATURE_MAP[feature]),
        ]);
        const hasRole = Boolean(membershipResult.data) && !membershipResult.error;

        if (cancelled) return;

        if (!hasRole) {
          setGate({ status: 'forbidden' });
          return;
        }
        if (!hasFeature) {
          setGate({ status: 'plan-locked' });
          return;
        }
        setGate({ status: 'allowed' });
      } catch (err) {
        // Network or RLS rejection -- never hang the spinner. Default
        // to forbidden so the user gets a clear bounce instead of
        // staring at an infinite loader.
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[PortalProtectedRoute] gate evaluation failed:', err);
        setGate({ status: 'forbidden' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, role, feature]);

  // 1. Auth check
  if (authLoading) {
    return (
      <div
        data-testid="portal-protected-loading"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?portal=${portalAuthQuery(role)}&next=${next}`} replace />;
  }

  // 2/3. RBAC + plan checks
  if (gate.status === 'checking') {
    return (
      <div
        data-testid="portal-protected-loading"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (gate.status === 'forbidden') {
    toast.error("You don't have access to that portal.");
    const bounce =
      role === 'owner'
        ? '/auth?portal=client&error=access'
        : role === 'ops'
          ? '/auth?portal=ops&error=access'
          : '/dashboard';
    return <Navigate to={bounce} replace />;
  }

  if (gate.status === 'plan-locked') {
    return <UpgradeRequired feature={FEATURE_MAP[feature]} />;
  }

  return <Outlet />;
}

export default PortalProtectedRoute;
