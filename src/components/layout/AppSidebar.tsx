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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMyProfile } from '@/hooks/useMyProfile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Zone label (non-interactive, uppercase) ──────────────────────────────
function ZoneLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-label))]">
        {label}
      </span>
    </div>
  );
}

// ── Zone divider ─────────────────────────────────────────────────────────
function ZoneDivider() {
  return <div className="mx-3 my-1 border-t border-[hsl(var(--sidebar-border))]" />;
}

// ── Individual nav item ───────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
  badgeVariant?: 'urgent' | 'default';
  tooltip?: string;
}

function NavItem({ to, icon, label, collapsed, end, badge, badgeVariant = 'default', tooltip }: NavItemProps) {
  const hasBadge = badge !== undefined && badge > 0;
  const badgeNum = badge ?? 0;

  const content = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        "group/navitem flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal w-full",
        "text-[hsl(var(--sidebar-foreground)/0.75)] transition-colors duration-150",
        "hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
        collapsed && "justify-center px-0"
      )}
      activeClassName="!bg-[hsl(var(--sidebar-accent)/0.15)] !text-[hsl(var(--sidebar-accent))] !font-medium border-l-2 border-[hsl(var(--sidebar-accent))] rounded-l-none pl-[10px]"
    >
      {/* Icon + collapsed badge dot */}
      <div className="relative flex-shrink-0">
        {icon}
        {collapsed && hasBadge && (
          <span className={cn(
            "absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-[hsl(var(--sidebar-background))]",
            badgeVariant === 'urgent'
              ? "bg-[hsl(var(--destructive))]"
              : "bg-[hsl(var(--sidebar-accent))]"
          )} />
        )}
      </div>

      {/* Label + badge (expanded only) */}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className={cn(
              "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
              badgeVariant === 'urgent'
                ? "bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]"
                : "bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))]"
            )}>
              {badgeNum > 99 ? '99+' : badgeNum}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2 text-xs">
          {tooltip || label}
          {hasBadge && (
            <span className={cn(
              "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
              badgeVariant === 'urgent'
                ? "bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]"
                : "bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))]"
            )}>
              {badgeNum}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ── Main sidebar ─────────────────────────────────────────────────────────
export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { data: myProfile } = useMyProfile();
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
        <SidebarHeader className="border-b border-[hsl(var(--sidebar-border))] px-3 py-4">
          <NavLink to="/" className={cn(
            "flex items-center gap-3 outline-none rounded-md",
            collapsed && "justify-center"
          )}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent))]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-[hsl(var(--sidebar-foreground))] leading-tight">PM APAS</span>
                <span className="text-[10px] font-normal text-[hsl(var(--sidebar-muted))] leading-tight tracking-wide">Property OS</span>
              </div>
            )}
          </NavLink>

          {/* Property context indicator */}
          {!collapsed && (
            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
              <Building className="h-3 w-3 text-[hsl(var(--sidebar-muted))] shrink-0" />
              <span className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate">{propertyLabel}</span>
            </div>
          )}
        </SidebarHeader>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <SidebarContent className="overflow-y-auto px-1 py-2">

          {/* ZONE 1 — OVERVIEW */}
          <nav className="space-y-0.5 px-2 pb-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" collapsed={collapsed} end />
          </nav>

          <ZoneDivider />

          {/* ZONE 2 — PROPERTY */}
          {!collapsed && <ZoneLabel label="Property" />}
          <nav className="space-y-0.5 px-2">
            <NavItem to="/properties" icon={<Building className="h-4 w-4" />} label="Properties" collapsed={collapsed} />
            <NavItem to="/units" icon={<DoorOpen className="h-4 w-4" />} label="Units" collapsed={collapsed} />
            <NavItem to="/assets" icon={<Box className="h-4 w-4" />} label="Assets" collapsed={collapsed} />
            {isModuleEnabled('occupancyEnabled') && (
              <NavItem to="/occupancy" icon={<Home className="h-4 w-4" />} label="Occupancy" collapsed={collapsed} />
            )}
          </nav>

          <ZoneDivider />

          {/* ZONE 3 — OPERATIONS */}
          {!collapsed && <ZoneLabel label="Operations" />}
          <nav className="space-y-0.5 px-2">
            {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
              <NavItem to="/inspections/daily" icon={<Sun className="h-4 w-4" />} label="Daily Grounds" collapsed={collapsed} />
            )}
            {isModuleEnabled('nspireEnabled') && canView('inspections') && (
              <NavItem
                to="/inspections"
                icon={<ClipboardCheck className="h-4 w-4" />}
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
                  icon={<FolderKanban className="h-4 w-4" />}
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
                    <NavItem to="/projects/proposals" icon={<FileText className="h-4 w-4" />} label="Proposals" collapsed={collapsed} />
                  </div>
                )}
              </>
            )}
            {canView('issues') && (
              <NavItem
                to="/issues"
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Issues"
                collapsed={collapsed}
                badge={openIssueCount}
                badgeVariant={openIssueCount > 5 ? 'urgent' : 'default'}
                tooltip={openIssueCount > 0 ? `Issues — ${openIssueCount} open` : 'Issues'}
              />
            )}
            {canView('work_orders') && (
              <>
                <NavItem to="/work-orders" icon={<Wrench className="h-4 w-4" />} label="Work Orders" collapsed={collapsed} />
                <NavItem to="/permits" icon={<Shield className="h-4 w-4" />} label="Permits" collapsed={collapsed} />
              </>
            )}
          </nav>

          <ZoneDivider />

          {/* ZONE 4 — TEAM & TOOLS */}
          {!collapsed && <ZoneLabel label="Team & Tools" />}
          <nav className="space-y-0.5 px-2">
            <NavItem
              to="/messages"
              icon={<MessageCircle className="h-4 w-4" />}
              label="Messages"
              collapsed={collapsed}
              badge={unreadCount}
              badgeVariant="default"
              tooltip={unreadCount > 0 ? `Messages — ${unreadCount} unread` : 'Messages'}
            />
            <NavItem to="/inbox" icon={<Mail className="h-4 w-4" />} label="Email" collapsed={collapsed} />
            <NavItem to="/voice-agent" icon={<Phone className="h-4 w-4" />} label="Voice Agent" collapsed={collapsed} tooltip="AI Voice Call Center" />
            <NavItem to="/contacts" icon={<Contact className="h-4 w-4" />} label="Contacts" collapsed={collapsed} tooltip="CRM — Vendors & contacts" />
            {canView('people') && (
              <NavItem to="/people" icon={<Users className="h-4 w-4" />} label="People" collapsed={collapsed} tooltip="Team member management" />
            )}
            <NavItem to="/training" icon={<GraduationCap className="h-4 w-4" />} label="Training" collapsed={collapsed} tooltip="Training Academy" />
            {canView('documents') && (
              <NavItem to="/documents" icon={<FileText className="h-4 w-4" />} label="Documents" collapsed={collapsed} />
            )}
            {canView('reports') && (
              <NavItem to="/reports" icon={<BarChart3 className="h-4 w-4" />} label="Reports" collapsed={collapsed} />
            )}
            {isModuleEnabled('qrScanningEnabled') && (
              <NavItem to="/qr-scanner" icon={<QrCode className="h-4 w-4" />} label="QR Scanner" collapsed={collapsed} />
            )}
          </nav>
        </SidebarContent>

        {/* Rail */}
        <SidebarRail />

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <SidebarFooter className="p-2 border-t border-[hsl(var(--sidebar-border))]">
          {/* Settings */}
          {canView('settings') && (
            <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" collapsed={collapsed} />
          )}

          {/* User identity block — clickable to go to /profile */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex w-full items-center justify-center rounded-md p-1.5 transition-colors hover:bg-white/5 focus:outline-none"
                  title="My Profile"
                >
                  <Avatar className="h-7 w-7 cursor-pointer">
                    <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile photo" />
                    <AvatarFallback className="bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))] text-[10px] font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {userName} · My Profile
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="flex w-full items-center gap-2.5 mt-1 px-3 py-2 rounded-md transition-colors hover:bg-white/5 focus:outline-none text-left"
              title="My Profile"
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile photo" />
                <AvatarFallback className="bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))] text-[10px] font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[hsl(var(--sidebar-foreground))] truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-[hsl(var(--sidebar-muted))] truncate leading-tight">
                  {userRole}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); signOut(); }}
                className="flex-shrink-0 rounded p-1 text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/5 hover:text-[hsl(var(--destructive))]"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </button>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
