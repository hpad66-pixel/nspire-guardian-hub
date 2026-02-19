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
  TriangleAlert,
  BadgeCheck,
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
// TIER 1 — WorkModuleButton: dominant, solid-color icon, bold presence
// ─────────────────────────────────────────────────────────────────────────────
interface WorkModuleButtonProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  collapsed: boolean;
  isActive: boolean;
  badge?: number;
  badgeVariant?: 'urgent' | 'default';
}

function WorkModuleButton({
  title, icon, color, children, collapsed, isActive, badge, badgeVariant = 'default',
}: WorkModuleButtonProps) {
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const hasBadge = badge !== undefined && badge > 0;

  if (collapsed) {
    return <div className="space-y-0.5">{children}</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'mx-2 mb-1 rounded-xl transition-all duration-200',
          isActive ? 'ring-1 ring-white/10' : 'hover:ring-1 hover:ring-white/5'
        )}
        style={{ background: isActive ? 'rgba(255,255,255,0.05)' : undefined }}
      >
        <CollapsibleTrigger asChild>
          <button className="group/mod flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-xl transition-colors hover:bg-white/[0.04]">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-sm"
              style={{ background: color }}
            >
              <span className="text-white [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
            </span>

            <span className={cn(
              'flex-1 truncate text-[13px] font-semibold leading-none transition-colors',
              isActive
                ? 'text-white'
                : 'text-[hsl(var(--sidebar-foreground)/0.75)] group-hover/mod:text-white'
            )}>
              {title}
            </span>

            {hasBadge && (
              <span className={cn(
                'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
                badgeVariant === 'urgent'
                  ? 'bg-[hsl(var(--destructive)/0.25)] text-[hsl(var(--destructive))]'
                  : 'bg-white/15 text-white'
              )}>
                {(badge ?? 0) > 9 ? '9+' : badge}
              </span>
            )}

            <ChevronRight className={cn(
              'h-3.5 w-3.5 flex-shrink-0 text-white/30 transition-transform duration-200',
              isOpen && 'rotate-90'
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className="pb-2 pt-0.5"
            style={{
              marginLeft: '20px',
              paddingLeft: '6px',
              borderLeft: `2px solid ${color}`,
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
// TIER 2 & 3 — CollapsibleNavGroup: quieter, text-label trigger
// ─────────────────────────────────────────────────────────────────────────────
interface CollapsibleNavGroupProps {
  title: string;
  children: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
  isActive?: boolean;
}

function CollapsibleNavGroup({
  title, children, collapsed, defaultOpen = false, isActive = false,
}: CollapsibleNavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (collapsed) {
    return <div className="space-y-0.5">{children}</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="group/grp flex w-full items-center justify-between rounded-md px-3 py-1.5 transition-colors hover:bg-white/5 text-left">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--sidebar-label))] transition-colors group-hover/grp:text-[hsl(var(--sidebar-muted))]">
            {title}
          </span>
          <ChevronRight className={cn(
            'h-3 w-3 text-[hsl(var(--sidebar-label))] transition-transform duration-200 group-hover/grp:text-[hsl(var(--sidebar-muted))]',
            isOpen && 'rotate-90'
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 pb-1 pl-2 pr-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — individual navigation link
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

  const linkContent = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        'group/ni flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-normal',
        'text-[hsl(var(--sidebar-foreground)/0.65)] transition-colors duration-150',
        'hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-foreground))]',
        collapsed && 'justify-center px-0 py-2'
      )}
      activeClassName="!bg-[hsl(var(--sidebar-accent)/0.18)] !text-[hsl(var(--sidebar-accent))] !font-medium"
    >
      <span className="relative flex-shrink-0 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        {collapsed && hasBadge && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[hsl(var(--sidebar-background))]',
            badgeVariant === 'urgent' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--sidebar-accent))]'
          )} />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className={cn(
              'ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
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
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
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

  return linkContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// NavSubLabel — sub-section divider inside WorkModuleButton
// ─────────────────────────────────────────────────────────────────────────────
function NavSubLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-3 pb-0.5">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thin zone divider
// ─────────────────────────────────────────────────────────────────────────────
function ZoneDivider() {
  return <div className="my-2 mx-3 border-t border-[hsl(var(--sidebar-border))]" />;
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

  // Recent projects for quick-jump inside Projects module
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

  // User display
  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userRole = currentRole
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1).replace('_', ' ')
    : 'Member';

  // ── Active section detection ──────────────────────────────────────────────
  const isPropertyOpsActive = [
    '/properties', '/units', '/assets', '/occupancy',
    '/inspections', '/issues', '/work-orders', '/permits', '/voice-agent'
  ].some(p => currentPath.startsWith(p));

  const isProjectsActive = currentPath.startsWith('/projects');
  const isPeopleActive = ['/people', '/contacts', '/training'].some(p => currentPath.startsWith(p));

  // Module accent colors (solid, vivid)
  const COLOR_PROPERTY_OPS = 'hsl(142 76% 36%)'; // emerald-600
  const COLOR_PROJECTS     = 'hsl(262 83% 58%)'; // violet-500

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-[hsl(var(--sidebar-border))] overflow-hidden">

        {/* ────────────────── HEADER ────────────────── */}
        <SidebarHeader className="border-b border-[hsl(var(--sidebar-border))] px-3 py-3">
          <NavLink
            to="/"
            className={cn('flex items-center gap-2.5 outline-none rounded-md', collapsed && 'justify-center')}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent))]">
              <Building2 className="h-4 w-4 text-white" />
            </span>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-[hsl(var(--sidebar-foreground))] leading-tight tracking-tight">APAS OS</span>
                <span className="text-[10px] text-[hsl(var(--sidebar-muted))] leading-tight">Property Operations</span>
              </div>
            )}
          </NavLink>

          {/* Property context chip */}
          {!collapsed && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
              <Building className="h-3 w-3 flex-shrink-0 text-[hsl(var(--sidebar-muted))]" />
              <span className="truncate text-[11px] text-[hsl(var(--sidebar-muted))]">{propertyLabel}</span>
            </div>
          )}
        </SidebarHeader>

        {/* ────────────────── CONTENT ────────────────── */}
        <SidebarContent className="flex flex-col gap-0 overflow-y-auto overflow-x-hidden py-2">

          {/* ══════════════════════════════════════════════
               ZONE 0 — COMMAND RAIL
               Dashboard · Inbox · Messages — always visible, never collapsible
          ══════════════════════════════════════════════ */}
          {!collapsed && (
            <div className="px-3 pb-1 pt-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--sidebar-label))]">
                Always
              </span>
            </div>
          )}

          <div className={cn('px-2 pb-1', collapsed && 'px-1')}>
            <NavItem
              to="/dashboard"
              icon={<LayoutDashboard />}
              label="Dashboard"
              collapsed={collapsed}
              end
              tooltip="Dashboard"
            />
            <NavItem
              to="/inbox"
              icon={<Mail />}
              label="Inbox"
              collapsed={collapsed}
              tooltip="Email Inbox"
            />
            <NavItem
              to="/messages"
              icon={<MessageCircle />}
              label="Messages"
              collapsed={collapsed}
              badge={unreadCount}
              tooltip={unreadCount > 0 ? `${unreadCount} unread` : 'Messages'}
            />
          </div>

          {/* ══════════════════════════════════════════════
               ZONE 1 + 2 — WORK MODULES
               Property Ops + Projects
          ══════════════════════════════════════════════ */}
          {!collapsed && (
            <div className="px-3 pb-1 pt-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--sidebar-label))]">
                Work Modules
              </span>
            </div>
          )}
          {collapsed && <ZoneDivider />}

          {/* ── Property Ops (merged Portfolio + Operations + Inspections + Voice) ── */}
          <WorkModuleButton
            title="Property Ops"
            icon={<Building2 />}
            color={COLOR_PROPERTY_OPS}
            collapsed={collapsed}
            isActive={isPropertyOpsActive}
            badge={openIssueCount + severeDefectCount}
            badgeVariant={severeDefectCount > 0 ? 'urgent' : 'default'}
          >
            {/* ── YOUR PORTFOLIO ── */}
            <NavSubLabel label="Your Portfolio" />
            <NavItem to="/properties" icon={<Building2 />} label="Properties" collapsed={collapsed} />
            <NavItem to="/units"      icon={<DoorOpen />}  label="Units"      collapsed={collapsed} />
            <NavItem to="/assets"     icon={<Box />}       label="Assets"     collapsed={collapsed} />
            {isModuleEnabled('occupancyEnabled') && (
              <NavItem to="/occupancy" icon={<Home />} label="Occupancy" collapsed={collapsed} />
            )}

            {/* ── INSPECT ── */}
            {(isModuleEnabled('dailyGroundsEnabled') || isModuleEnabled('nspireEnabled')) && canView('inspections') && (
              <NavSubLabel label="Inspect" />
            )}
            {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
              <NavItem
                to="/inspections/daily"
                icon={<Sun />}
                label="Daily Rounds"
                collapsed={collapsed}
                tooltip="Today's Inspection Rounds"
              />
            )}
            {isModuleEnabled('nspireEnabled') && canView('inspections') && (
              <NavItem
                to="/inspections"
                icon={<ClipboardCheck />}
                label="NSPIRE"
                collapsed={collapsed}
                badge={severeDefectCount}
                badgeVariant="urgent"
                tooltip={severeDefectCount > 0 ? `${severeDefectCount} severe defects` : 'NSPIRE Compliance'}
              />
            )}

            {/* ── RESPOND ── */}
            <NavSubLabel label="Respond" />
            {canView('issues') && (
              <NavItem
                to="/issues"
                icon={<AlertTriangle />}
                label="Issues"
                collapsed={collapsed}
                badge={openIssueCount}
                badgeVariant={openIssueCount > 5 ? 'urgent' : 'default'}
                tooltip={openIssueCount > 0 ? `${openIssueCount} open issues` : 'Issues'}
              />
            )}
            {canView('work_orders') && (
              <>
                <NavItem to="/work-orders" icon={<Wrench />} label="Work Orders" collapsed={collapsed} />
                <NavItem to="/permits"     icon={<Shield />} label="Permits"     collapsed={collapsed} />
              </>
            )}
            <NavItem
              to="/voice-agent"
              icon={<Phone />}
              label="Voice Agent"
              collapsed={collapsed}
              tooltip="AI Call Center · auto-creates Issues"
            />
          </WorkModuleButton>

          {/* ── Projects ── */}
          {isModuleEnabled('projectsEnabled') && canView('projects') && (
            <WorkModuleButton
              title="Projects"
              icon={<FolderKanban />}
              color={COLOR_PROJECTS}
              collapsed={collapsed}
              isActive={isProjectsActive}
              badge={activeProjectCount}
            >
              <NavItem
                to="/projects" end
                icon={<FolderKanban />} label="All Projects"
                collapsed={collapsed}
                badge={activeProjectCount}
                tooltip={activeProjectCount > 0 ? `${activeProjectCount} active` : 'Projects'}
              />
              {!collapsed && recentProjects.length > 0 && (
                <div className="pl-3 space-y-0.5 pb-0.5">
                  {recentProjects.map(p => {
                    const health = computeHealth(p);
                    const hc = HEALTH_CONFIG[health];
                    const isCurrent = currentPath === `/projects/${p.id}`;
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className={cn(
                          'flex items-center gap-2 w-full rounded-md px-2 py-1 text-xs text-left transition-colors',
                          'text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]',
                          isCurrent && 'bg-white/8 !text-white font-medium'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', hc.dot)} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {isAdmin && (
                <NavItem to="/projects/proposals" icon={<FileText />} label="Proposals" collapsed={collapsed} />
              )}
            </WorkModuleButton>
          )}

          {/* ══════════════════════════════════════════════
               ZONE 3 — PEOPLE & CONTACTS
               Replaces old Communications + Organization groups
          ══════════════════════════════════════════════ */}
          <ZoneDivider />

          <div className={cn('px-2', collapsed && 'px-1')}>
            <CollapsibleNavGroup
              title="People & Contacts"
              collapsed={collapsed}
              defaultOpen={isPeopleActive}
              isActive={isPeopleActive}
            >
              {canView('people') && (
                <NavItem
                  to="/people"
                  icon={<Users />}
                  label="Team"
                  collapsed={collapsed}
                  tooltip="Team Members"
                />
              )}
              <NavItem
                to="/contacts"
                icon={<Contact />}
                label="Contacts"
                collapsed={collapsed}
                tooltip="Vendors, Contractors & Regulators"
              />
              <NavItem
                to="/training"
                icon={<GraduationCap />}
                label="Training"
                collapsed={collapsed}
                tooltip="Training Academy"
              />
            </CollapsibleNavGroup>
          </div>

        </SidebarContent>

        {/* Rail for drag-to-resize */}
        <SidebarRail />

        {/* ────────────────── FOOTER ────────────────── */}
        <SidebarFooter className="border-t border-[hsl(var(--sidebar-border))] p-2 space-y-0.5">
          {/* QR Scanner (if module enabled) */}
          {isModuleEnabled('qrScanningEnabled') && (
            <NavItem to="/qr-scanner" icon={<QrCode />} label="QR Scanner" collapsed={collapsed} />
          )}

          {/* Credentials (admin only, if module enabled) */}
          {isModuleEnabled('credentialWalletEnabled') && isAdmin && (
            <NavItem
              to="/credentials"
              icon={<BadgeCheck />}
              label="Credentials"
              collapsed={collapsed}
              tooltip="Credential Compliance"
            />
          )}

          {/* Safety Module */}
          {isModuleEnabled('safetyModuleEnabled') && (
            <NavItem
              to="/safety"
              icon={<TriangleAlert />}
              label="Safety"
              collapsed={collapsed}
              tooltip="Safety Incident Log"
            />
          )}

          {/* LW Schools (super admin only) */}
          {isAdmin && (
            <NavItem
              to="/admin/schools"
              icon={<GraduationCap />}
              label="LW Schools"
              collapsed={collapsed}
              tooltip="LearnWorlds School Management"
            />
          )}

          {/* Documents */}
          {canView('documents') && (
            <NavItem to="/documents" icon={<FileText />} label="Documents" collapsed={collapsed} />
          )}

          {/* Reports */}
          {canView('reports') && (
            <NavItem to="/reports" icon={<BarChart3 />} label="Reports" collapsed={collapsed} />
          )}

          {/* Settings */}
          {canView('settings') && (
            <NavItem to="/settings" icon={<Settings />} label="Settings" collapsed={collapsed} />
          )}

          {/* User identity → /profile */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex w-full items-center justify-center rounded-md p-1.5 transition-colors hover:bg-white/5 focus:outline-none"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile" />
                    <AvatarFallback className="bg-[hsl(var(--sidebar-accent)/0.25)] text-[hsl(var(--sidebar-accent))] text-[10px] font-semibold">
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
            <div className="flex items-center gap-2 mt-1 pl-1">
              <button
                onClick={() => navigate('/profile')}
                className="flex flex-1 min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5 focus:outline-none text-left"
                title="My Profile"
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={myProfile?.avatar_url ?? undefined} alt="Profile" />
                  <AvatarFallback className="bg-[hsl(var(--sidebar-accent)/0.25)] text-[hsl(var(--sidebar-accent))] text-[10px] font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-medium leading-tight text-[hsl(var(--sidebar-foreground))]">
                    {userName}
                  </p>
                  <p className="truncate text-[10px] leading-tight text-[hsl(var(--sidebar-muted))]">
                    {userRole}
                  </p>
                </div>
              </button>

              <button
                onClick={signOut}
                className="flex-shrink-0 rounded-md p-1.5 text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/5 hover:text-[hsl(var(--destructive))]"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
