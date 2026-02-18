import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useModules } from '@/contexts/ModuleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Search,
  Download,
  WifiOff,
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: assignedRoles = [] } = useUserRoles(user?.id ?? null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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

  // Close more menu on route change
  useEffect(() => {
    setMoreMenuOpen(false);
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

  const primaryNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Inspections', icon: ClipboardCheck, path: '/inspections' },
    { label: 'Issues', icon: AlertTriangle, path: '/issues' },
    { label: 'Work Orders', icon: Wrench, path: '/work-orders' },
    { label: 'Messages', icon: MessageCircle, path: '/messages' },
  ];

  return (
    <>
      <PWAUpdateBanner />
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background px-3 md:px-4">

              {/* Desktop: sidebar trigger */}
              <div className="hidden lg:block">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>




              {/* Search — full width on desktop, condensed on mobile */}
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
                {/* Role badge — hidden on mobile to save space */}
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

            {/* Main Content — add bottom padding on mobile for nav bar */}
            <main className="flex-1 overflow-auto pb-16 md:pb-0">
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

      {/* Mobile Bottom Navigation — only on mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md px-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
          {/* More — opens full sidebar sheet */}
          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-muted-foreground transition-colors hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
              <SidebarProvider defaultOpen={true} style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
                <AppSidebar />
              </SidebarProvider>
            </SheetContent>
          </Sheet>
        </nav>
      )}

      {/* PWA Install Banner — rendered outside SidebarProvider so it overlays correctly */}
      <PWAInstallBanner />
    </>
  );
}
