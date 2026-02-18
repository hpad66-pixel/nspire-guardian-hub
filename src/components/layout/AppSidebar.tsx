import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadThreadCount, useUnreadThreadCountRealtime } from '@/hooks/useThreadReadStatus';
import { useProperties } from '@/hooks/useProperties';
import { useOpenDefects } from '@/hooks/useDefects';
import { useIssues } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { computeHealth, HEALTH_CONFIG } from '@/lib/projectHealth';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Building2,
  ClipboardCheck,
  FolderKanban,
  Settings,
  AlertTriangle,
  Users,
  FileText,
  Box,
  LayoutDashboard,
  Building,
  DoorOpen,
  LogOut,
  BarChart3,
  Sun,
  Wrench,
  Mail,
  Shield,
  QrCode,
  Home,
  GraduationCap,
  Contact,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Zone label (non-interactive, uppercase) ──────────────────────────────
function ZoneLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pt-4 pb-1">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--sidebar-zone-label))]">
        {label}
      </span>
    </div>
  );
}

// ── Zone divider ─────────────────────────────────────────────────────────
function ZoneDivider() {
  return <div className="mx-3 my-1 border-t border-[hsl(var(--sidebar-border)/0.4)]" />;
}

// ── Individual nav item ───────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
  badgeVariant?: 'urgent' | 'default';
  tooltip?: string;
}

function NavItem({ to, icon: Icon, label, collapsed, end, badge, badgeVariant = 'default', tooltip }: NavItemProps) {
  const hasBadge = badge !== undefined && badge > 0;
  const badgeNum = badge ?? 0;

  const inner = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        "group relative flex items-center gap-2.5 h-9 px-3 rounded-lg w-full text-sm font-medium",
        "text-[hsl(var(--sidebar-muted))] transition-colors duration-150",
        "hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
        collapsed && "justify-center px-0"
      )}
      activeClassName={cn(
        "!bg-[hsl(217_91%_60%/0.12)] !text-white",
        "border-l-2 border-[hsl(217,91%,60%)] rounded-l-none rounded-r-lg"
      )}
    >
      {/* Icon + collapsed badge dot */}
      <div className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {collapsed && hasBadge && (
          <span className={cn(
            "absolute -top-1 -right-1 h-2 w-2 rounded-full",
            badgeVariant === 'urgent'
              ? "bg-[hsl(0,84%,60%)]"
              : "bg-[hsl(217,91%,60%)]"
          )} />
        )}
      </div>

      {/* Label (expanded only) */}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}

      {/* Count badge (expanded only) */}
      {!collapsed && hasBadge && (
        <span className={cn(
          "ml-auto h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center tabular-nums",
          badgeVariant === 'urgent'
            ? "bg-[hsl(0,84%,60%/0.2)] text-[hsl(0,84%,60%)]"
            : "bg-[hsl(217,91%,60%/0.2)] text-[hsl(217,91%,60%)]"
        )}>
          {badgeNum > 99 ? '99+' : badgeNum}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    const tipLabel = hasBadge ? `${label} (${badgeNum})` : label;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{tooltip || tipLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

// ── Main sidebar ─────────────────────────────────────────────────────────
export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canView, currentRole } = useUserPermissions();

  const { data: unreadCount = 0 } = useUnreadThreadCount();
  useUnreadThreadCountRealtime();

  // Live data for badges
  const { data: openDefects = [] } = useOpenDefects();
  const { data: issues = [] } = useIssues();
  const { data: allProjects } = useProjects();
  const { data: properties } = useProperties();

  const isAdmin = currentRole === 'admin';

  // Open severe defects badge
  const severeDefectCount = openDefects.filter(d => d.severity === 'severe').length;

  // Open issues badge
  const openIssueCount = (issues as Array<{ status: string | null }>).filter(
    i => i.status !== 'resolved' && i.status !== 'verified'
  ).length;

  // Active projects badge
  const activeProjectCount = (allProjects ?? []).filter(p => p.status === 'active').length;

  // Selected property name for context indicator
  const firstProperty = properties?.[0];
  const propertyLabel = properties && properties.length > 1
    ? `${properties.length} properties`
    : firstProperty?.name ?? 'All Properties';

  // Recent projects (tracked in localStorage)
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recent_projects') || '[]'); } catch { return []; }
  });
  const currentPath = location.pathname;
  useEffect(() => {
    const match = currentPath.match(/^\/projects\/([^/]+)$/);
    if (!match) return;
    const pid = match[1];
    setRecentIds(prev => {
      const next = [pid, ...prev.filter(id => id !== pid)].slice(0, 3);
      try { localStorage.setItem('recent_projects', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [currentPath]);
  const recentProjects = recentIds
    .map(id => allProjects?.find(p => p.id === id))
    .filter(Boolean) as NonNullable<typeof allProjects>[number][];

  // User info
  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userRole = currentRole
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1).replace('_', ' ')
    : 'Member';

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <SidebarHeader className="p-3 pb-0">
          <NavLink to="/" className={cn(
            "flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors",
            collapsed && "justify-center"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] shrink-0">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white leading-tight">PM APAS</span>
                <span className="text-[11px] text-[hsl(var(--sidebar-muted))] leading-tight">Property OS</span>
              </div>
            )}
          </NavLink>

          {/* Property context indicator */}
          {!collapsed && (
            <div className="mt-2 px-1.5 pb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                <Building className="h-3 w-3 text-[hsl(var(--sidebar-muted))] shrink-0" />
                <span className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate">{propertyLabel}</span>
              </div>
            </div>
          )}

          <div className="border-b border-[hsl(var(--sidebar-border)/0.4)] mt-1" />
        </SidebarHeader>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <SidebarContent className="overflow-y-auto px-2 py-2">

          {/* ZONE 1 — OVERVIEW */}
          <nav className="space-y-0.5">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} end />
          </nav>

          <ZoneDivider />

          {/* ZONE 2 — PROPERTY */}
          {!collapsed && <ZoneLabel label="Property" />}
          <nav className="space-y-0.5">
            <NavItem to="/properties" icon={Building} label="Properties" collapsed={collapsed} />
            <NavItem to="/units" icon={DoorOpen} label="Units" collapsed={collapsed} />
            <NavItem to="/assets" icon={Box} label="Assets" collapsed={collapsed} />
            {isModuleEnabled('occupancyEnabled') && (
              <NavItem to="/occupancy" icon={Home} label="Occupancy" collapsed={collapsed} />
            )}
          </nav>

          <ZoneDivider />

          {/* ZONE 3 — OPERATIONS */}
          {!collapsed && <ZoneLabel label="Operations" />}
          <nav className="space-y-0.5">
            {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
              <NavItem to="/inspections/daily" icon={Sun} label="Daily Grounds" collapsed={collapsed} />
            )}
            {isModuleEnabled('nspireEnabled') && canView('inspections') && (
              <NavItem
                to="/inspections"
                icon={ClipboardCheck}
                label="Compliance"
                collapsed={collapsed}
                badge={severeDefectCount}
                badgeVariant="urgent"
                tooltip={severeDefectCount > 0 ? `Compliance — ${severeDefectCount} severe` : 'NSPIRE Compliance'}
              />
            )}
            {isModuleEnabled('projectsEnabled') && canView('projects') && (
              <>
                <NavItem
                  to="/projects"
                  icon={FolderKanban}
                  label="Projects"
                  collapsed={collapsed}
                  badge={activeProjectCount}
                  badgeVariant="default"
                  tooltip={activeProjectCount > 0 ? `Projects — ${activeProjectCount} active` : 'Projects'}
                />
                {/* Recent projects — expanded only */}
                {!collapsed && recentProjects.length > 0 && (
                  <div className="pl-7 space-y-0.5 pb-0.5">
                    {recentProjects.map(p => {
                      const health = computeHealth(p);
                      const hc = HEALTH_CONFIG[health];
                      const isCurrentProject = currentPath === `/projects/${p.id}`;
                      return (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className={cn(
                            'flex items-center gap-2 w-full text-left px-2 h-7 rounded-md text-xs transition-colors',
                            'text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]',
                            isCurrentProject && 'bg-white/8 text-white font-medium'
                          )}
                        >
                          <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', hc.dot)} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {isAdmin && (
                  <div className="pl-7">
                    <NavItem to="/projects/proposals" icon={FileText} label="Proposals" collapsed={collapsed} />
                  </div>
                )}
              </>
            )}
            {canView('issues') && (
              <NavItem
                to="/issues"
                icon={AlertTriangle}
                label="Issues"
                collapsed={collapsed}
                badge={openIssueCount}
                badgeVariant={openIssueCount > 5 ? 'urgent' : 'default'}
                tooltip={openIssueCount > 0 ? `Issues — ${openIssueCount} open` : 'Issues'}
              />
            )}
            {canView('work_orders') && (
              <>
                <NavItem to="/work-orders" icon={Wrench} label="Work Orders" collapsed={collapsed} />
                <NavItem to="/permits" icon={Shield} label="Permits" collapsed={collapsed} />
              </>
            )}
          </nav>

          <ZoneDivider />

          {/* ZONE 4 — TEAM & TOOLS */}
          {!collapsed && <ZoneLabel label="Team & Tools" />}
          <nav className="space-y-0.5">
            <NavItem
              to="/messages"
              icon={MessageCircle}
              label="Messages"
              collapsed={collapsed}
              badge={unreadCount}
              badgeVariant="default"
              tooltip={unreadCount > 0 ? `Messages — ${unreadCount} unread` : 'Messages'}
            />
            <NavItem to="/inbox" icon={Mail} label="Email" collapsed={collapsed} />
            <NavItem to="/voice-agent" icon={Phone} label="Voice Agent" collapsed={collapsed} tooltip="AI Voice Call Center" />
            <NavItem to="/contacts" icon={Contact} label="Contacts" collapsed={collapsed} tooltip="CRM — Vendors & contacts" />
            {canView('people') && (
              <NavItem to="/people" icon={Users} label="People" collapsed={collapsed} tooltip="Team member management" />
            )}
            <NavItem to="/training" icon={GraduationCap} label="Training" collapsed={collapsed} tooltip="Training Academy" />
            {canView('documents') && (
              <NavItem to="/documents" icon={FileText} label="Documents" collapsed={collapsed} />
            )}
            {canView('reports') && (
              <NavItem to="/reports" icon={BarChart3} label="Reports" collapsed={collapsed} />
            )}
            {isModuleEnabled('qrScanningEnabled') && (
              <NavItem to="/qr-scanner" icon={QrCode} label="QR Scanner" collapsed={collapsed} />
            )}
          </nav>
        </SidebarContent>

        {/* Rail */}
        <SidebarRail />

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <SidebarFooter className="p-2 border-t border-[hsl(var(--sidebar-border)/0.4)]">
          {/* Settings */}
          {canView('settings') && (
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          )}

          {/* User identity block */}
          <div className={cn(
            "flex items-center gap-2.5 mt-1 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors",
            collapsed && "justify-center px-0"
          )}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="flex flex-col items-center gap-1"
                    title="Sign out"
                  >
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarFallback className="bg-[hsl(var(--sidebar-primary)/0.2)] text-[hsl(var(--sidebar-primary))] text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {userName} · Sign out
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-[hsl(var(--sidebar-primary)/0.2)] text-[hsl(var(--sidebar-primary))] text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--sidebar-foreground))] truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate leading-tight">
                    {userRole}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={signOut}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-colors shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
