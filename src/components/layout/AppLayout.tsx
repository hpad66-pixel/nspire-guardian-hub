import { ReactNode, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { Breadcrumbs } from './Breadcrumbs';
import { useModules } from '@/contexts/ModuleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Download, Lightbulb, WifiOff } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWA';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { GlobalSearch } from '@/components/global/GlobalSearch';
import { NotificationCenter } from '@/components/global/NotificationCenter';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import { OwnerAssistantLauncher } from '@/components/assistant/OwnerAssistantLauncher';
import { AgentLauncher } from '@/components/agent/AgentLauncher';
import { AGENT_FOUNDATION_ENABLED } from '@/lib/agent/runtime';
import { PWAUpdateBanner } from '@/components/pwa/PWAUpdateBanner';
import { NotificationPermissionBanner } from '@/components/pwa/NotificationPermissionBanner';
import { MOBILE_MAIN_PADDING_CLASS } from '@/lib/mobileShell';
import { cn } from '@/lib/utils';
import type { ModuleConfig } from '@/types/modules';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserManagement';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useMyPortalKind } from '@/hooks/usePortals';
import { useProject } from '@/hooks/useProjects';
import { useClient } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';
import { ProjectClosureBoundary } from '@/components/projects/ProjectClosureBoundary';
import { internalAppRedirectForPortalKind } from '@/lib/portal/portalRedirect';

interface AppLayoutProps {
  children: ReactNode;
}

const UUID_SEGMENT = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

function ProjectRouteContextPill({ pathname }: { pathname: string }) {
  const projectId = useMemo(() => {
    const match =
      pathname.match(new RegExp(`^/projects/(${UUID_SEGMENT})(?:/|$)`)) ??
      pathname.match(new RegExp(`^/owner-portal/projects/(${UUID_SEGMENT})(?:/|$)`));
    return match?.[1] ?? null;
  }, [pathname]);
  const clientId = useMemo(() => {
    const match = pathname.match(new RegExp(`^/organizations/(${UUID_SEGMENT})(?:/|$)`));
    return match?.[1] ?? undefined;
  }, [pathname]);
  const { data: project } = useProject(projectId);
  const { data: client } = useClient(!projectId ? clientId : undefined);

  const projectName = projectId ? project?.name : null;
  const clientName = projectId ? project?.client?.name : client?.name;
  const label = projectName || clientName;
  const contextType = projectName ? 'Project' : clientName ? 'Client' : null;

  if (!label || !contextType) return null;

  return (
    <div className="flex min-w-0 flex-1 justify-end px-1 sm:px-3">
      <div
        className="min-w-0 max-w-[46vw] rounded-lg border border-[var(--ow-taupe-2)] bg-[rgba(251,250,245,0.95)] px-3 py-1.5 text-right shadow-sm sm:max-w-[360px]"
        aria-label={`Current ${contextType.toLowerCase()}: ${label}`}
      >
        <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--ow-muted)]">
          Current {contextType}
        </p>
        <p className="mt-1 truncate text-sm font-semibold leading-tight text-[var(--ow-ink)] sm:text-base">
          {label}
        </p>
        {projectName && clientName && (
          <p className="mt-0.5 hidden truncate text-[11px] leading-none text-muted-foreground min-[430px]:block">
            {clientName}
          </p>
        )}
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();
  const { isInstallable, isIOS, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  // Show bottom nav on anything below desktop (< 1024px)
  const showMobileNav = useIsCompactNav();
  const canOfferInstall = !isInstalled && (isInstallable || isIOS);
  const { user } = useAuth();
  const { data: assignedRoles = [] } = useUserRoles(user?.id ?? null);
  const { data: myProfile } = useMyProfile();
  const { data: portalKind = 'main', isLoading: portalKindLoading } = useMyPortalKind();
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  type AppRole = Database['public']['Enums']['app_role'];

  const roleLabels: Record<AppRole, string> = {
    admin: 'Admin',
    owner: 'Owner',
    manager: 'Property Manager',
    inspector: 'Inspector',
    administrator: 'Administrator',
    superintendent: 'Superintendent',
    clerk: 'Clerk',
    project_manager: 'Project Manager',
    subcontractor: 'Subcontractor',
    viewer: 'Viewer',
    user: 'User',
  };

  const rolePriority: Record<AppRole, number> = {
    admin: 9,
    owner: 8,
    manager: 7,
    inspector: 6,
    administrator: 5,
    superintendent: 4,
    clerk: 3,
    project_manager: 2,
    subcontractor: 2,
    viewer: 1,
    user: 1,
  };

  const displayRoles = assignedRoles
    .map((role) => role.role as AppRole)
    .sort((a, b) => (rolePriority[b] || 0) - (rolePriority[a] || 0))
    .map((role) => roleLabels[role] || role);

  useEffect(() => {
    const expectedPath = location.pathname;
    const reloadKey = 'proj-os-router-desync-reload';
    const checkForRouterDesync = () => {
      if (window.location.pathname === expectedPath) {
        sessionStorage.removeItem(reloadKey);
        return;
      }

      const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
      if (Number.isFinite(lastReload) && Date.now() - lastReload < 5000) return;
      sessionStorage.setItem(reloadKey, String(Date.now()));
      window.location.reload();
    };

    const timer = window.setInterval(checkForRouterDesync, 750);
    return () => window.clearInterval(timer);
  }, [location.pathname]);

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const initials = (() => {
    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  })();

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (modulesLoading) return;

    const path = location.pathname;

    // Projects suite is gated by Construction / Consulting (and the legacy
    // properties.projects_enabled flag) — not by projectsEnabled alone.
    // Previously this redirected to /portals whenever projectsEnabled was off,
    // even when the sidebar correctly showed All Projects under Construction.
    if (path.startsWith('/projects')) {
      const projectsOk =
        isModuleEnabled('constructionEnabled') ||
        isModuleEnabled('consultingEnabled') ||
        isModuleEnabled('projectsEnabled');
      if (!projectsOk) {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    const moduleForPath = (() => {
      if (path.startsWith('/inspections/daily') || path.startsWith('/inspections/history') || path.startsWith('/inspections/review')) {
        return 'dailyGroundsEnabled';
      }
      if (path.startsWith('/inspections')) {
        return 'nspireEnabled';
      }
      if (path.startsWith('/occupancy')) {
        return 'occupancyEnabled';
      }
      if (path.startsWith('/qr-scanner')) {
        return 'qrScanningEnabled';
      }
      if (path.startsWith('/inbox')) {
        return 'emailInboxEnabled';
      }
      return null;
    })() as keyof ModuleConfig | null;

    if (moduleForPath && !isModuleEnabled(moduleForPath)) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, isModuleEnabled, modulesLoading, navigate]);

  const portalRedirect = internalAppRedirectForPortalKind(portalKind);

  useEffect(() => {
    if (portalKindLoading || !portalRedirect) return;
    navigate(portalRedirect, { replace: true });
  }, [navigate, portalKindLoading, portalRedirect]);

  if (portalKindLoading || portalRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PWAUpdateBanner />
      <SidebarProvider>
        <div className="apas-app-shell ow-app-surface flex min-h-dvh w-full max-w-[100vw]">
          {/* Desktop sidebar — hidden on mobile/tablet */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            {/* Header — safe-area top for notch / Dynamic Island in standalone PWA */}
            <header className="sticky top-0 z-10 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center gap-2 border-b border-[rgba(37,44,57,0.14)] bg-[rgba(251,250,245,0.86)] px-3 pt-[env(safe-area-inset-top,0px)] shadow-[0_10px_30px_rgba(37,44,57,0.05)] backdrop-blur-xl md:px-5">

              {/* Desktop only: sidebar trigger */}
              <div className="hidden lg:block">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>

              {/* Mobile: icon-only search button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-10 w-10 min-h-[44px] min-w-[44px] lg:hidden')}
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Desktop: full search bar */}
              <Button
                variant="outline"
                className={cn(
                  'relative hidden h-10 w-80 justify-start gap-2 rounded-lg border-[var(--ow-taupe-2)] bg-[rgba(251,250,245,0.8)] px-3 text-sm font-medium text-[var(--ow-muted)] shadow-none hover:bg-[rgba(230,224,210,0.5)] hover:text-[var(--ow-ink)] lg:flex'
                )}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-[15px] w-[15px] stroke-[2]" />
                <span className="tracking-tight">Search projects, records, issues…</span>
                <kbd className="pointer-events-none absolute right-2 hidden h-6 select-none items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 font-mono text-[11px] font-semibold text-muted-foreground sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              <ProjectRouteContextPill pathname={location.pathname} />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/product-ideas')}
                  aria-current={location.pathname === '/product-ideas' ? 'page' : undefined}
                  className={cn(
                    'h-9 gap-2 rounded-lg border-[rgba(36,63,104,0.25)] bg-[rgba(36,63,104,0.07)] px-3 font-semibold text-[var(--ow-navy)] shadow-sm transition-all hover:border-[rgba(36,63,104,0.4)] hover:bg-[rgba(36,63,104,0.1)] hover:text-[var(--ow-navy)]',
                    location.pathname === '/product-ideas' &&
                      'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )}
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden min-[380px]:inline">Product Ideas</span>
                  <span className="min-[380px]:hidden">Ideas</span>
                </Button>
                {canOfferInstall && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void install()}
                      className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg border-border/70 sm:hidden"
                      aria-label="Install app"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void install()}
                      className="hidden h-10 items-center gap-2 rounded-lg border-border/70 text-sm font-medium sm:flex"
                    >
                      <Download className="h-[15px] w-[15px]" />
                      Install App
                    </Button>
                  </>
                )}
                <NotificationCenter />
                {/* Role badge — hidden on mobile to save space */}
                <Badge
                  variant="outline"
                  className="hidden h-8 rounded-md border-border/60 px-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] sm:inline-flex"
                >
                  {displayRoles.length > 0 ? displayRoles[0] : 'User'}
                </Badge>
                {/* Profile avatar — clickable */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate('/profile')}
                      className="rounded-full ring-2 ring-transparent transition-all duration-200 hover:ring-primary/30 focus:outline-none focus:ring-primary/50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      aria-label="My Profile"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile photo" />
                        <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    My Profile
                  </TooltipContent>
                </Tooltip>
              </div>
            </header>

            {/* App-wide back + breadcrumb wayfinding (hidden on the dashboard) */}
            <Breadcrumbs />

            {/* Push notification permission banner */}
            <NotificationPermissionBanner />

            {/* Main Content — bottom padding clears MobileNav (+ iPad secondary bar) */}
            <main
              data-testid="app-main"
              className={cn(
                'flex-1 min-w-0',
                showMobileNav && MOBILE_MAIN_PADDING_CLASS,
              )}
            >
              {!isOnline && (
                <div className="flex items-center justify-center gap-2 bg-yellow-500/90 px-4 py-2 text-sm font-medium text-yellow-950">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span className="text-left">You are offline — your changes will sync when connection is restored</span>
                </div>
              )}
              <ProjectClosureBoundary>{children}</ProjectClosureBoundary>
            </main>
          </div>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>

      {/* Mobile Bottom Navigation — iPhone + iPad (< 1024px) */}
      {showMobileNav && <MobileNav />}

      {/* PWA Install Banner — rendered outside SidebarProvider so it overlays correctly */}
      <PWAInstallBanner />

      {/* AI assistants — only when the workspace has the AI module. */}
      {isModuleEnabled('aiEnabled') && (
        <>
          {/* The signed, project-scoped Agent replaces the legacy assistant only
              after its production runtime flag is enabled. */}
          {AGENT_FOUNDATION_ENABLED ? <AgentLauncher /> : <AssistantLauncher />}
          {/* Client assistant — always available in the owner portal (owner-safe tools) */}
          <OwnerAssistantLauncher />
        </>
      )}
    </>
  );
}
