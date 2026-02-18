import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useModules } from '@/contexts/ModuleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Search, Menu, Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { GlobalSearch } from '@/components/global/GlobalSearch';
import { NotificationCenter } from '@/components/global/NotificationCenter';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { PWAUpdateBanner } from '@/components/pwa/PWAUpdateBanner';
import { NotificationPermissionBanner } from '@/components/pwa/NotificationPermissionBanner';
import type { ModuleConfig } from '@/types/modules';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserManagement';
import type { Database } from '@/integrations/supabase/types';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();
  const { isInstallable, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const { data: assignedRoles = [] } = useUserRoles(user?.id ?? null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Mobile nav drawer */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="left"
              className="w-72 p-0 border-r border-border"
            >
              {/* AppSidebar renders inside the drawer on mobile */}
              <AppSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 flex-col min-w-0">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
              {/* Mobile hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Desktop sidebar trigger */}
              <div className="hidden lg:block">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>

              {/* Search bar */}
              <Button
                variant="outline"
                className="relative h-9 flex-1 max-w-xs justify-start text-sm text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate hidden sm:inline">Search...</span>
                <span className="truncate sm:hidden">Search</span>
                <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
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
                {/* Role badge — hide on small mobile */}
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {displayRoles.length > 0 ? displayRoles[0] : 'User'}
                </Badge>
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary-foreground">{initials}</span>
                </div>
              </div>
            </header>

            {/* Push notification permission banner */}
            <NotificationPermissionBanner />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {!isOnline && (
                <div className="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950">
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

      {/* PWA Install Banner — rendered outside SidebarProvider so it overlays correctly */}
      <PWAInstallBanner />
    </>
  );
}
