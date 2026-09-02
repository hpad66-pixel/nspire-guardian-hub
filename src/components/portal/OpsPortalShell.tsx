/**
 * Dedicated shell for the Property Ops portal.
 * External Glorieta staff never see APAS project-controls navigation.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Package,
  ShieldCheck,
  Droplets,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyPortalKind } from '@/hooks/usePortals';
import { useOpsPortalContext, useOpsPortalMembership } from '@/hooks/useOpsPortal';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { OpsPortalPropertyProvider, useOpsPortalProperty } from './OpsPortalPropertyContext';
import '@/pages/portal/client-portal.css';

function useOpsNav(propertyId: string | null) {
  const { can } = useOpsPortalProperty();
  return useMemo(
    () =>
      [
        { to: opsPortalPath(propertyId), label: 'Home', icon: Home, exact: true as boolean | undefined, show: true },
        {
          to: opsPortalPath(propertyId, 'executive'),
          label: 'Executive',
          icon: LayoutDashboard,
          exact: undefined as boolean | undefined,
          show: can('executive'),
        },
        {
          to: opsPortalPath(propertyId, 'work-orders'),
          label: 'Work Orders',
          icon: ClipboardList,
          exact: undefined as boolean | undefined,
          show: can('maintenance'),
        },
        {
          to: opsPortalPath(propertyId, 'nspire'),
          label: 'NSPIRE',
          icon: ShieldCheck,
          exact: undefined as boolean | undefined,
          show: can('nspire'),
        },
        {
          to: opsPortalPath(propertyId, 'stores'),
          label: 'Stores',
          icon: Warehouse,
          exact: undefined as boolean | undefined,
          show: can('stores'),
        },
        {
          to: opsPortalPath(propertyId, 'voice'),
          label: 'Voice',
          icon: Mic,
          exact: undefined as boolean | undefined,
          show: can('voice'),
        },
        {
          to: opsPortalPath(propertyId, 'costs'),
          label: 'Costs & Receipts',
          icon: Package,
          exact: undefined as boolean | undefined,
          show: can('costs'),
        },
        {
          to: opsPortalPath(propertyId, 'water'),
          label: 'Water Intel',
          icon: Droplets,
          exact: undefined as boolean | undefined,
          show: can('water'),
        },
      ].filter((item) => item.show),
    [propertyId, can],
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'GG';
}

export function OpsPortalShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ propertyId?: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: membership, isLoading: membershipLoading } = useOpsPortalMembership();
  const { data: portalKind } = useMyPortalKind();

  const routePropertyId = params.propertyId ?? null;
  const membershipPropertyId = membership?.property_id ?? null;
  const activePropertyId = routePropertyId ?? membershipPropertyId;

  const { data: context, isLoading: contextLoading } = useOpsPortalContext(activePropertyId);

  // Redirect bare /ops-portal → property home
  useEffect(() => {
    if (location.pathname === '/ops-portal' && membershipPropertyId) {
      navigate(opsPortalPath(membershipPropertyId), { replace: true });
    }
  }, [location.pathname, membershipPropertyId, navigate]);

  const personName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team member',
    [user],
  );

  const isPreview = portalKind === 'main';
  const loading = membershipLoading || contextLoading;

  if (!loading && !activePropertyId && portalKind !== 'main') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCF9] p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="font-display text-3xl text-[#08271f]">No property assigned</h1>
          <p className="text-sm text-muted-foreground">
            Your Property Ops invitation is missing a property. Ask APAS to re-invite you to Glorieta Gardens Apartments.
          </p>
        </div>
      </div>
    );
  }

  if (!loading && routePropertyId && membershipPropertyId && routePropertyId !== membershipPropertyId && portalKind !== 'main') {
    return <Navigate to={opsPortalPath(membershipPropertyId)} replace />;
  }

  return (
    <OpsPortalPropertyProvider context={context ?? null} isLoading={loading}>
      <OpsPortalShellInner
        personName={personName}
        isPreview={isPreview}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        signOut={async () => {
          await signOut();
          navigate('/auth?portal=ops');
        }}
        propertyId={activePropertyId}
        propertyName={context?.property_name ?? 'Property Ops'}
        roleLabel={context?.ops_role ?? membership?.role ?? 'ops'}
      />
    </OpsPortalPropertyProvider>
  );
}

function OpsPortalShellInner({
  personName,
  isPreview,
  mobileOpen,
  setMobileOpen,
  signOut,
  propertyId,
  propertyName,
  roleLabel,
}: {
  personName: string;
  isPreview: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  signOut: () => Promise<void>;
  propertyId: string | null;
  propertyName: string;
  roleLabel: string;
}) {
  const nav = useOpsNav(propertyId);
  const rolePretty =
    roleLabel === 'ops_owner'
      ? 'Owner'
      : roleLabel === 'ops_pm'
        ? 'Property Manager'
        : roleLabel === 'ops_tech'
          ? 'Maintenance'
          : 'Ops';

  return (
    <div className="client-portal min-h-screen bg-[#F7F4EC] text-[#08271f]" data-testid="ops-portal-shell">
      {isPreview && (
        <div className="bg-[#08271f] px-4 py-2 text-center text-xs font-semibold tracking-wide text-[#d5aa52]">
          APAS preview · Property Ops portal (external users never see construction modules)
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[#dedbd1] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-[#dedbd1] p-2 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to={opsPortalPath(propertyId)} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#08271f] text-sm font-bold text-[#d5aa52]">
                GG
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Property Ops</div>
                <div className="font-display text-lg font-medium">{propertyName}</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-[#08271f] text-white' : 'text-[#3d4a45] hover:bg-[#efe9da]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#dedbd1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5c6863] sm:inline">
              {rolePretty}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d5aa52]/20 text-xs font-bold text-[#08271f]">
              {initials(personName)}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-[#dedbd1] p-2 text-[#5c6863] hover:bg-white"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-[280px] space-y-2 bg-[#fffdf8] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-xl">Menu</div>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                    isActive ? 'bg-[#08271f] text-white' : 'text-[#08271f] hover:bg-[#efe9da]'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}

export default OpsPortalShell;
