import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadThreadCount, useUnreadThreadCountRealtime } from '@/hooks/useThreadReadStatus';
import { useIssues } from '@/hooks/useIssues';
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
  DoorOpen,
  LogOut,
  BarChart3,
  Sun,
  Wrench,
  Shield,
  Home,
  MessageCircle,
  Phone,
  Box,
  Contact,
  GraduationCap,
  Mail,
  Globe,
  BadgeCheck,
  ShieldAlert,
  Truck,
  Briefcase,
  Search as SearchIcon,
  QrCode,
  type LucideIcon,
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

// ─── NavItem ────────────────────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
  accent?: boolean;
}

function NavItem({ to, icon: Icon, label, collapsed, end, badge, accent }: NavItemProps) {
  const hasBadge = badge !== undefined && badge > 0;

  const content = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        'group flex w-full items-center gap-3 rounded px-3 py-[7px] text-[13px] font-medium',
        'text-sidebar-foreground/50 transition-all duration-150',
        'hover:bg-sidebar-accent/8 hover:text-sidebar-foreground/90',
        accent && 'text-sidebar-primary/80 italic',
        collapsed && 'justify-center px-0 py-2.5'
      )}
      activeClassName="!bg-sidebar-accent/10 !text-sidebar-foreground border-l-2 !border-sidebar-primary !pl-2.5"
    >
      <Icon className={cn('h-4 w-4 shrink-0', collapsed && 'h-5 w-5')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className="font-mono text-[10px] tabular-nums text-sidebar-primary">
              {(badge ?? 0) > 99 ? '99+' : badge}
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
        <TooltipContent side="right" className="text-xs font-medium">
          {label}
          {hasBadge && <span className="ml-1.5 text-sidebar-primary">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ─── Section Label ──────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-3 h-px w-5 bg-sidebar-border" />;
  return (
    <p className="px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/25">
      {label}
    </p>
  );
}

// ─── AppSidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { data: myProfile } = useMyProfile();
  const { canView, currentRole } = useUserPermissions();

  const { data: unreadCount = 0 } = useUnreadThreadCount();
  useUnreadThreadCountRealtime();

  const { data: issues = [] } = useIssues();
  const isAdmin = currentRole === 'admin';

  const openIssueCount = (issues as Array<{ status: string | null }>).filter(
    i => i.status !== 'resolved' && i.status !== 'verified'
  ).length;

  // User display
  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userRole = currentRole
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1).replace('_', ' ')
    : 'Member';

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">

        {/* ── HEADER ── */}
        <SidebarHeader className="px-3 py-4">
          <NavLink
            to="/dashboard"
            className={cn('flex items-center gap-2.5 rounded-lg px-2', collapsed && 'justify-center px-0')}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sidebar-primary">
              <div className="h-2.5 w-2.5 rotate-45 border-2 border-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-base font-semibold tracking-tighter text-sidebar-foreground">
                Build Space <span className="text-sidebar-primary">OS</span>
              </span>
            )}
          </NavLink>
        </SidebarHeader>

        {/* ── CONTENT ── */}
        <SidebarContent className="overflow-y-auto overflow-x-hidden px-2 py-1">

          {/* SYSTEMS */}
          <SectionLabel label="Systems" collapsed={collapsed} />
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={Home} label="Dashboard" collapsed={collapsed} end />
            <NavItem to="/messages" icon={MessageCircle} label="Messages" collapsed={collapsed} badge={unreadCount} />
            <NavItem to="/inbox" icon={Mail} label="Inbox" collapsed={collapsed} />
          </div>

          {/* PORTFOLIO */}
          <SectionLabel label="Portfolio" collapsed={collapsed} />
          <div className="space-y-0.5">
            <NavItem to="/properties" icon={Building2} label="Properties" collapsed={collapsed} />
            <NavItem to="/units" icon={DoorOpen} label="Units" collapsed={collapsed} />
            <NavItem to="/assets" icon={Box} label="Assets" collapsed={collapsed} />
          </div>

          {/* OPS ENGINE */}
          <SectionLabel label="Ops Engine" collapsed={collapsed} />
          <div className="space-y-0.5">
            {canView('issues') && (
              <NavItem to="/issues" icon={AlertTriangle} label="Issues" collapsed={collapsed} badge={openIssueCount} />
            )}
            {canView('work_orders') && (
              <NavItem to="/work-orders" icon={Wrench} label="Work Orders" collapsed={collapsed} />
            )}
            {canView('work_orders') && (
              <NavItem to="/permits" icon={Shield} label="Permits" collapsed={collapsed} />
            )}
            {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
              <NavItem to="/inspections/daily" icon={Sun} label="Daily Rounds" collapsed={collapsed} />
            )}
            {isModuleEnabled('nspireEnabled') && canView('inspections') && (
              <NavItem to="/inspections" icon={ClipboardCheck} label="Compliance" collapsed={collapsed} />
            )}
            <NavItem to="/voice-agent" icon={Phone} label="Voice Agent" collapsed={collapsed} accent />
          </div>

          {/* EXECUTION */}
          {isModuleEnabled('projectsEnabled') && canView('projects') && (
            <>
              <SectionLabel label="Execution" collapsed={collapsed} />
              <div className="space-y-0.5">
                <NavItem to="/projects" icon={FolderKanban} label="Projects" collapsed={collapsed} end />
              </div>
            </>
          )}

          {/* HUMAN CAPITAL */}
          <SectionLabel label="Human Capital" collapsed={collapsed} />
          <div className="space-y-0.5">
            {canView('people') && (
              <NavItem to="/people" icon={Users} label="People" collapsed={collapsed} />
            )}
            <NavItem to="/contacts" icon={Contact} label="Contacts" collapsed={collapsed} />
            <NavItem to="/organizations" icon={Briefcase} label="Organizations" collapsed={collapsed} />
            <NavItem to="/training" icon={GraduationCap} label="Training" collapsed={collapsed} />
            <NavItem to="/credentials" icon={BadgeCheck} label="Credentials" collapsed={collapsed} />
            <NavItem to="/safety" icon={ShieldAlert} label="Safety" collapsed={collapsed} />
            <NavItem to="/equipment" icon={Truck} label="Equipment" collapsed={collapsed} />
            <NavItem to="/qr-scanner" icon={QrCode} label="QR Scanner" collapsed={collapsed} />
            <NavItem to="/portals" icon={Globe} label="Portals" collapsed={collapsed} />
          </div>

          {/* INTELLIGENCE */}
          {(canView('documents') || canView('reports')) && (
            <>
              <SectionLabel label="Intelligence" collapsed={collapsed} />
              <div className="space-y-0.5">
                <NavItem to="/case-review" icon={SearchIcon} label="CaseIQ" collapsed={collapsed} accent />
                {canView('reports') && (
                  <NavItem to="/reports" icon={BarChart3} label="Reports" collapsed={collapsed} />
                )}
                {canView('documents') && (
                  <NavItem to="/documents" icon={FileText} label="Documents" collapsed={collapsed} />
                )}
              </div>
            </>
          )}

        </SidebarContent>

        <SidebarRail />

        {/* ── FOOTER ── */}
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-2">
          {canView('settings') && (
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          )}

          {/* User row */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-sidebar-accent/8"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-[11px] font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{userName}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/5">
              <button
                onClick={() => navigate('/profile')}
                className="flex flex-1 min-w-0 items-center gap-2.5 text-left"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-[11px] font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-sidebar-foreground">{userName}</p>
                  <p className="truncate text-[10px] font-bold tracking-widest uppercase text-sidebar-primary/70">{userRole}</p>
                </div>
              </button>
              <button
                onClick={signOut}
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
