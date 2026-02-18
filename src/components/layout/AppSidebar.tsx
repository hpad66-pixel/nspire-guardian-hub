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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ChevronRight,
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

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — Work Module Button (dominant, colored, always visible)
// ─────────────────────────────────────────────────────────────────────────────
interface WorkModuleButtonProps {
  title: string;
  icon: React.ReactNode;
  /** CSS color string for the left accent border */
  accentColor: string;
  /** Background class for the icon container */
  iconBg: string;
  /** Text/icon color class */
  iconColor: string;
  children: React.ReactNode;
  collapsed: boolean;
  isActive: boolean;
  badge?: number;
  badgeVariant?: 'urgent' | 'default';
}

function WorkModuleButton({
  title, icon, accentColor, iconBg, iconColor,
  children, collapsed, isActive, badge, badgeVariant = 'default',
}: WorkModuleButtonProps) {
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const hasBadge = badge !== undefined && badge > 0;

  if (collapsed) {
    return (
      <div className="px-2 space-y-0.5">
        {children}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'mx-2 rounded-lg overflow-hidden transition-all duration-200',
        isActive ? 'ring-1 ring-white/10' : ''
      )}
        style={{ background: isActive ? 'rgba(255,255,255,0.04)' : undefined }}
      >
        {/* Module header trigger */}
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left group/module hover:bg-white/5 transition-colors rounded-lg"
          >
            {/* Colored icon container — solid background for maximum visual weight */}
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 flex-shrink-0"
              style={{ background: accentColor, opacity: isActive ? 1 : 0.85 }}
            >
              <span className="text-white">{icon}</span>
            </div>

            {/* Module name */}
            <span className={cn(
              'flex-1 text-sm font-semibold leading-none truncate transition-colors',
              isActive
                ? 'text-white'
                : 'text-[hsl(var(--sidebar-foreground)/0.8)] group-hover/module:text-white'
            )}>
              {title}
            </span>

            {/* Badge */}
            {hasBadge && (
              <span className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                badgeVariant === 'urgent'
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-white/15 text-white'
              )}>
                {(badge ?? 0) > 9 ? '9+' : badge}
              </span>
            )}

            {/* Chevron */}
            <ChevronRight className={cn(
              'h-3.5 w-3.5 shrink-0 transition-all duration-200 text-white/40',
              isOpen && 'rotate-90'
            )} />
          </button>
        </CollapsibleTrigger>

        {/* Children with accent left border */}
        <CollapsibleContent>
          <div
            className="pb-1.5"
            style={{
              borderLeft: `2px solid ${accentColor}`,
              marginLeft: '17px',
              paddingLeft: '4px',
            }}
          >
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 & 3 — CollapsibleNavGroup (quieter, supporting sections)
// ─────────────────────────────────────────────────────────────────────────────
interface CollapsibleNavGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
  isActive?: boolean;
}

function CollapsibleNavGroup({
  title, icon, children, collapsed, defaultOpen = false, isActive = false,
}: CollapsibleNavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (collapsed) {
    return (
      <div className="px-2 space-y-0.5">
        {children}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between mx-2 px-2 py-1.5 mb-0.5 rounded-md group/navgroup hover:bg-white/5 transition-colors text-left">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-muted))] transition-colors group-hover/navgroup:text-[hsl(var(--sidebar-foreground)/0.6)]">
            {title}
          </span>
          <ChevronRight className={cn(
            'h-3 w-3 text-[hsl(var(--sidebar-label))] transition-all duration-200 group-hover/navgroup:text-[hsl(var(--sidebar-muted))]',
            isOpen && 'rotate-90'
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 space-y-0.5 pb-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — individual nav link
// ─────────────────────────────────────────────────────────────────────────────
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
        'group/navitem flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal w-full',
        'text-[hsl(var(--sidebar-foreground)/0.75)] transition-colors duration-150',
        'hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]',
        collapsed && 'justify-center px-0'
      )}
      activeClassName="!bg-[hsl(var(--sidebar-accent)/0.15)] !text-[hsl(var(--sidebar-accent))] !font-medium border-l-2 border-[hsl(var(--sidebar-accent))] rounded-l-none pl-[10px]"
    >
      <div className="relative flex-shrink-0">
        {icon}
        {collapsed && hasBadge && (
          <span className={cn(
            'absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-[hsl(var(--sidebar-background))]',
            badgeVariant === 'urgent'
              ? 'bg-[hsl(var(--destructive))]'
              : 'bg-[hsl(var(--sidebar-accent))]'
          )} />
        )}
      </div>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className={cn(
              'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
              badgeVariant === 'urgent'
                ? 'bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]'
                : 'bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))]'
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
              'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
              badgeVariant === 'urgent'
                ? 'bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]'
                : 'bg-[hsl(var(--sidebar-accent)/0.2)] text-[hsl(var(--sidebar-accent))]'
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

// ─────────────────────────────────────────────────────────────────────────────
// Zone divider
// ─────────────────────────────────────────────────────────────────────────────
function ZoneDivider() {
  return <div className="mx-3 my-2 border-t border-[hsl(var(--sidebar-border))]" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar
// ─────────────────────────────────────────────────────────────────────────────
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

  const { data: openDefects = [] } = useOpenDefects();
  const { data: issues = [] } = useIssues();
  const { data: allProjects } = useProjects();
  const { data: properties } = useProperties();

  const isAdmin = currentRole === 'admin';

  const severeDefectCount = openDefects.filter(d => d.severity === 'severe').length;
  const openIssueCount = (issues as Array<{ status: string | null }>).filter(
    i => i.status !== 'resolved' && i.status !== 'verified'
  ).length;
  const activeProjectCount = (allProjects ?? []).filter(p => p.status === 'active').length;

  const firstProperty = properties?.[0];
  const propertyLabel = properties && properties.length > 1
    ? `${properties.length} properties`
    : firstProperty?.name ?? 'All Properties';

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

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userRole = currentRole
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1).replace('_', ' ')
    : 'Member';

  // Active-section detection for auto-expanding work modules
  const isGroundsActive = currentPath.startsWith('/inspections/daily') || currentPath.startsWith('/inspections/history') || currentPath.startsWith('/inspections/review');
  const isNspireActive = currentPath.startsWith('/inspections') && !isGroundsActive;
  const isProjectsActive = currentPath.startsWith('/projects');
  const isPortfolioActive = ['/properties', '/units', '/assets', '/occupancy'].some(p => currentPath.startsWith(p));
  const isOpsActive = ['/issues', '/work-orders', '/permits'].some(p => currentPath.startsWith(p));
  const isCommsActive = ['/messages', '/inbox', '/voice-agent', '/contacts'].some(p => currentPath.startsWith(p));
  const isOrgActive = ['/people', '/training', '/documents', '/reports'].some(p => currentPath.startsWith(p));

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">

        {/* ── HEADER ── */}
        <SidebarHeader className="border-b border-[hsl(var(--sidebar-border))] px-3 py-4">
          <NavLink to="/" className={cn(
            'flex items-center gap-3 outline-none rounded-md',
            collapsed && 'justify-center'
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

          {!collapsed && (
            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
              <Building className="h-3 w-3 text-[hsl(var(--sidebar-muted))] shrink-0" />
              <span className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate">{propertyLabel}</span>
            </div>
          )}
        </SidebarHeader>

        {/* ── CONTENT ── */}
        <SidebarContent className="overflow-y-auto px-1 py-2">

          {/* Dashboard — always first */}
          <div className="px-2 pb-1">
            <NavItem
              to="/dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              collapsed={collapsed}
              end
            />
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TIER 1: WORK ENGINES — dominant, colored, primary focus  */}
          {/* ──────────────────────────────────────────────────────── */}
          {!collapsed && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-label))]">
                Work Modules
              </span>
            </div>
          )}
          {collapsed && <div className="my-1 mx-3 border-t border-[hsl(var(--sidebar-border))]" />}

          {/* Daily Grounds */}
          {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
            <WorkModuleButton
              title="Daily Grounds"
              icon={<Sun className="h-4 w-4" />}
              accentColor="hsl(142 76% 36%)"
              iconBg="bg-emerald-500/20"
              iconColor="text-emerald-400"
              collapsed={collapsed}
              isActive={isGroundsActive}
            >
              <NavItem to="/inspections/daily"   icon={<Sun className="h-4 w-4" />}           label="Today's Rounds"  collapsed={collapsed} />
              <NavItem to="/inspections/history" icon={<ClipboardCheck className="h-4 w-4" />} label="History"         collapsed={collapsed} />
              <NavItem to="/inspections/review"  icon={<FileText className="h-4 w-4" />}       label="Review Queue"    collapsed={collapsed} />
            </WorkModuleButton>
          )}

          {/* NSPIRE Compliance */}
          {isModuleEnabled('nspireEnabled') && canView('inspections') && (
            <WorkModuleButton
              title="NSPIRE Compliance"
              icon={<ClipboardCheck className="h-4 w-4" />}
              accentColor="hsl(var(--module-inspections))"
              iconBg="bg-blue-500/20"
              iconColor="text-blue-400"
              collapsed={collapsed}
              isActive={isNspireActive}
              badge={severeDefectCount}
              badgeVariant="urgent"
            >
              <NavItem to="/inspections"          icon={<ClipboardCheck className="h-4 w-4" />} label="Dashboard"       collapsed={collapsed} end
                badge={severeDefectCount} badgeVariant="urgent"
                tooltip={severeDefectCount > 0 ? `Compliance — ${severeDefectCount} severe` : 'NSPIRE Overview'}
              />
              <NavItem to="/inspections/outside"  icon={<Sun className="h-4 w-4" />}           label="Outside"         collapsed={collapsed} />
              <NavItem to="/inspections/inside"   icon={<Building className="h-4 w-4" />}      label="Inside"          collapsed={collapsed} />
              <NavItem to="/inspections/units"    icon={<DoorOpen className="h-4 w-4" />}      label="Units"           collapsed={collapsed} />
            </WorkModuleButton>
          )}

          {/* Projects */}
          {isModuleEnabled('projectsEnabled') && canView('projects') && (
            <WorkModuleButton
              title="Projects"
              icon={<FolderKanban className="h-4 w-4" />}
              accentColor="hsl(var(--module-projects))"
              iconBg="bg-violet-500/20"
              iconColor="text-violet-400"
              collapsed={collapsed}
              isActive={isProjectsActive}
              badge={activeProjectCount}
              badgeVariant="default"
            >
              <NavItem
                to="/projects"
                icon={<FolderKanban className="h-4 w-4" />}
                label="All Projects"
                collapsed={collapsed}
                end
                badge={activeProjectCount}
                badgeVariant="default"
                tooltip={activeProjectCount > 0 ? `Projects — ${activeProjectCount} active` : 'Projects'}
              />
              {/* Recent projects — expanded only */}
              {!collapsed && recentProjects.length > 0 && (
                <div className="pl-4 space-y-0.5 pb-0.5">
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
                <NavItem to="/projects/proposals" icon={<FileText className="h-4 w-4" />} label="Proposals" collapsed={collapsed} />
              )}
            </WorkModuleButton>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TIER 2: PLATFORM — quieter, collapsible groups           */}
          {/* ──────────────────────────────────────────────────────── */}
          <ZoneDivider />

          {/* Portfolio */}
          <CollapsibleNavGroup
            title="Portfolio"
            icon={<Building className="h-3.5 w-3.5" />}
            collapsed={collapsed}
            defaultOpen
            isActive={isPortfolioActive}
          >
            <NavItem to="/properties" icon={<Building className="h-4 w-4" />}   label="Properties" collapsed={collapsed} />
            <NavItem to="/units"      icon={<DoorOpen className="h-4 w-4" />}    label="Units"      collapsed={collapsed} />
            <NavItem to="/assets"     icon={<Box className="h-4 w-4" />}          label="Assets"     collapsed={collapsed} />
            {isModuleEnabled('occupancyEnabled') && (
              <NavItem to="/occupancy" icon={<Home className="h-4 w-4" />} label="Occupancy" collapsed={collapsed} />
            )}
          </CollapsibleNavGroup>

          {/* Operations */}
          <CollapsibleNavGroup
            title="Operations"
            icon={<Wrench className="h-3.5 w-3.5" />}
            collapsed={collapsed}
            defaultOpen={isOpsActive}
            isActive={isOpsActive}
          >
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
                <NavItem to="/work-orders" icon={<Wrench className="h-4 w-4" />}  label="Work Orders" collapsed={collapsed} />
                <NavItem to="/permits"     icon={<Shield className="h-4 w-4" />}  label="Permits"     collapsed={collapsed} />
              </>
            )}
          </CollapsibleNavGroup>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TIER 3: SUPPORTING — communications & org, lightest      */}
          {/* ──────────────────────────────────────────────────────── */}
          <ZoneDivider />

          {/* Communications */}
          <CollapsibleNavGroup
            title="Communications"
            icon={<MessageCircle className="h-3.5 w-3.5" />}
            collapsed={collapsed}
            defaultOpen={isCommsActive}
            isActive={isCommsActive}
          >
            <NavItem
              to="/messages"
              icon={<MessageCircle className="h-4 w-4" />}
              label="Messages"
              collapsed={collapsed}
              badge={unreadCount}
              badgeVariant="default"
              tooltip={unreadCount > 0 ? `Messages — ${unreadCount} unread` : 'Messages'}
            />
            <NavItem to="/inbox"       icon={<Mail className="h-4 w-4" />}    label="Email"       collapsed={collapsed} />
            <NavItem to="/voice-agent" icon={<Phone className="h-4 w-4" />}   label="Voice Agent" collapsed={collapsed} tooltip="AI Voice Call Center" />
            <NavItem to="/contacts"    icon={<Contact className="h-4 w-4" />} label="Contacts"    collapsed={collapsed} tooltip="CRM — Vendors & contacts" />
          </CollapsibleNavGroup>

          {/* Organization */}
          <CollapsibleNavGroup
            title="Organization"
            icon={<Users className="h-3.5 w-3.5" />}
            collapsed={collapsed}
            defaultOpen={isOrgActive}
            isActive={isOrgActive}
          >
            {canView('people') && (
              <NavItem to="/people"   icon={<Users className="h-4 w-4" />}       label="People"    collapsed={collapsed} tooltip="Team member management" />
            )}
            <NavItem to="/training"  icon={<GraduationCap className="h-4 w-4" />} label="Training"  collapsed={collapsed} tooltip="Training Academy" />
            {canView('documents') && (
              <NavItem to="/documents" icon={<FileText className="h-4 w-4" />}  label="Documents" collapsed={collapsed} />
            )}
            {canView('reports') && (
              <NavItem to="/reports"   icon={<BarChart3 className="h-4 w-4" />} label="Reports"   collapsed={collapsed} />
            )}
            {isModuleEnabled('qrScanningEnabled') && (
              <NavItem to="/qr-scanner" icon={<QrCode className="h-4 w-4" />} label="QR Scanner" collapsed={collapsed} />
            )}
          </CollapsibleNavGroup>

        </SidebarContent>

        {/* Rail */}
        <SidebarRail />

        {/* ── FOOTER ── */}
        <SidebarFooter className="p-2 border-t border-[hsl(var(--sidebar-border))]">
          {canView('settings') && (
            <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" collapsed={collapsed} />
          )}

          {/* User identity — clickable → /profile */}
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
