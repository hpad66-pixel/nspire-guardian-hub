import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { useModules } from '@/contexts/ModuleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import { GlobalSearch } from '@/components/global/GlobalSearch';
import { NotificationCenter } from '@/components/global/NotificationCenter';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { PWAUpdateBanner } from '@/components/pwa/PWAUpdateBanner';
import { NotificationPermissionBanner } from '@/components/pwa/NotificationPermissionBanner';
import { cn } from '@/lib/utils';
import type { ModuleConfig } from '@/types/modules';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserManagement';
import { useMyProfile } from '@/hooks/useMyProfile';
import type { Database } from '@/integrations/supabase/types';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();
  const { isInstallable, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile(); // < 768px
  // Show bottom nav on anything below desktop (< 1024px)
  const [showMobileNav, setShowMobileNav] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setShowMobileNav(mql.matches);
    mql.addEventListener('change', onChange);
    setShowMobileNav(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const { user } = useAuth();
  const { data: assignedRoles = [] } = useUserRoles(user?.id ?? null);
  const { data: myProfile } = useMyProfile();
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
    const moduleForPath = (() => {
      if (path.startsWith('/inspections/daily') || path.startsWith('/inspections/history') || path.startsWith('/inspections/review')) {
        return 'dailyGroundsEnabled';
      }
      if (path.startsWith('/inspections')) {
        return 'nspireEnabled';
      }
      if (path.startsWith('/projects')) {
        return 'projectsEnabled';
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

  return (
    <>
      <PWAUpdateBanner />
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Desktop sidebar — hidden on mobile/tablet */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background px-3 md:px-4">

              {/* Desktop only: sidebar trigger */}
              <div className="hidden lg:block">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>

              {/* Mobile: icon-only search button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-9 w-9 lg:hidden')}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Desktop: full search bar */}
              <Button
                variant="outline"
                className={cn(
                  'relative h-9 w-64 justify-start text-sm text-muted-foreground hidden lg:flex'
                )}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search...
                <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                {isInstallable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={install}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Install App
                  </Button>
                )}
                <NotificationCenter />
                {/* Role badge — hidden on mobile to save space */}
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {displayRoles.length > 0 ? displayRoles[0] : 'User'}
                </Badge>
                {/* Profile avatar — clickable */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate('/profile')}
                      className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all duration-200 focus:outline-none focus:ring-primary/50"
                      aria-label="My Profile"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile photo" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
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

            {/* Push notification permission banner */}
            <NotificationPermissionBanner />

            {/* Main Content — pb-16 on mobile/tablet for bottom nav bar */}
            <main className={cn('flex-1 overflow-auto', showMobileNav && 'pb-16')}>
              {!isOnline && (
                <div className="flex items-center justify-center gap-2 bg-yellow-500/90 px-4 py-2 text-sm font-medium text-yellow-950">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>You are offline — your changes will sync when connection is restored</span>
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>

      {/* Mobile Bottom Navigation — iPhone + iPad (< 1024px) */}
      {showMobileNav && <MobileNav />}

      {/* PWA Install Banner — rendered outside SidebarProvider so it overlays correctly */}
      <PWAInstallBanner />
    </>
  );
}
