/**
 * G3 · PortalProtectedRoute
 *
 * Wraps /portal/sub/* and /portal/owner/* routes with a
 * three-layer gate:
 *   1. Auth      -> redirect to /login?next=<encoded path>
 *   2. RBAC role -> redirect to /dashboard with error toast
 *   3. Plan      -> render <UpgradeRequired/> in place
 *
 * Mirrors the existing ProtectedRoute pattern (Loader2 spinner
 * during async checks). The component renders an <Outlet/>
 * when all three checks pass, so it can wrap a sub-tree of
 * portal routes from a single mount point.
 *
 * Note on translation from the G3 prompt:
 *   prompt key            ->  this codebase's API
 *   portal:sub:access     ->  can({module:'sub_portal',  action:'view'})
 *   portal:owner:access   ->  can({module:'owner_portal',action:'view'})
 *   feature 'sub_portal'  ->  canUseFeature('subcontractor_portal')
 *   feature 'owner_portal'->  canUseFeature('owner_portal')
 *
 * The RBAC `Module` enum already includes 'sub_portal' and
 * 'owner_portal', and the billing FeatureKey type already
 * includes 'subcontractor_portal' and 'owner_portal'.
 */
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { can } from '@/lib/rbac';
import { canUseFeature, type FeatureKey } from '@/lib/billing';
import { UpgradeRequired } from './UpgradeRequired';

export type PortalRole = 'subcontractor' | 'owner';
/** UI-friendly feature name; mapped internally to the billing key. */
export type PortalFeature = 'sub_portal' | 'owner_portal';

interface PortalProtectedRouteProps {
  role: PortalRole;
  feature: PortalFeature;
}

/** Map G-prompt feature names to the canonical billing FeatureKey. */
const FEATURE_MAP: Record<PortalFeature, FeatureKey> = {
  sub_portal: 'subcontractor_portal',
  owner_portal: 'owner_portal',
};

/** Map portal role to the RBAC module key (action is always 'view'). */
const ROLE_MODULE: Record<PortalRole, 'sub_portal' | 'owner_portal'> = {
  subcontractor: 'sub_portal',
  owner: 'owner_portal',
};

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
      const [hasRole, hasFeature] = await Promise.all([
        can({
          userId: user.id,
          module: ROLE_MODULE[role],
          action: 'view',
        }),
        canUseFeature(FEATURE_MAP[feature]),
      ]);

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
    return <Navigate to={`/login?next=${next}`} replace />;
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
    return <Navigate to="/dashboard" replace />;
  }

  if (gate.status === 'plan-locked') {
    return <UpgradeRequired feature={FEATURE_MAP[feature]} />;
  }

  return <Outlet />;
}

export default PortalProtectedRoute;
