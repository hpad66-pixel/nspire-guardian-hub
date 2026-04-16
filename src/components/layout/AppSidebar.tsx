import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
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

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — clean, single-line link
// ─────────────────────────────────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
}

function NavItem({ to, icon: Icon, label, collapsed, end, badge }: NavItemProps) {
  const hasBadge = badge !== undefined && badge > 0;

  const content = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium',
        'text-sidebar-foreground/60 transition-all duration-150',
        'hover:bg-sidebar-accent/8 hover:text-sidebar-foreground',
        collapsed && 'justify-center px-0 py-2.5'
      )}
      activeClassName="!bg-sidebar-accent/12 !text-sidebar-foreground"
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold tabular-nums text-destructive">
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
          {hasBadge && <span className="ml-1.5 text-destructive">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section label
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-2 h-px w-5 bg-sidebar-border" />;
  return (
    <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
      {label}
    </p>
  );
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">

        {/* ── HEADER ── */}
        <SidebarHeader className="px-3 py-4">
          <NavLink
            to="/dashboard"
            className={cn('flex items-center gap-3 rounded-lg', collapsed && 'justify-center')}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-sidebar-foreground">APAS</p>
                <p className="text-[10px] text-sidebar-foreground/40">Construction OS</p>
              </div>
            )}
          </NavLink>
        </SidebarHeader>

        {/* ── CONTENT ── */}
        <SidebarContent className="overflow-y-auto overflow-x-hidden px-2 py-1">

          {/* MAIN */}
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={Home} label="Home" collapsed={collapsed} end />
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

          {/* OPERATIONS */}
          <SectionLabel label="Operations" collapsed={collapsed} />
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
            <NavItem to="/voice-agent" icon={Phone} label="Voice Agent" collapsed={collapsed} />
          </div>

          {/* PROJECTS */}
          {isModuleEnabled('projectsEnabled') && canView('projects') && (
            <>
              <SectionLabel label="Projects" collapsed={collapsed} />
              <div className="space-y-0.5">
                <NavItem to="/projects" icon={FolderKanban} label="Projects" collapsed={collapsed} end />
              </div>
            </>
          )}

          {/* TEAM */}
          <SectionLabel label="Team" collapsed={collapsed} />
          <div className="space-y-0.5">
            {canView('people') && (
              <NavItem to="/people" icon={Users} label="People" collapsed={collapsed} />
            )}
            <NavItem to="/contacts" icon={Contact} label="Contacts" collapsed={collapsed} />
            <NavItem to="/training" icon={GraduationCap} label="Training" collapsed={collapsed} />
          </div>

          {/* INSIGHTS */}
          {(canView('documents') || canView('reports')) && (
            <>
              <SectionLabel label="Insights" collapsed={collapsed} />
              <div className="space-y-0.5">
                {canView('documents') && (
                  <NavItem to="/documents" icon={FileText} label="Documents" collapsed={collapsed} />
                )}
                {canView('reports') && (
                  <NavItem to="/reports" icon={BarChart3} label="Reports" collapsed={collapsed} />
                )}
              </div>
            </>
          )}

        </SidebarContent>

        <SidebarRail />

        {/* ── FOOTER ── */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
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
                    <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
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
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-sidebar-foreground">{userName}</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/40">{userRole}</p>
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
