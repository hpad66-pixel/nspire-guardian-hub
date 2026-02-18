import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadThreadCount, useUnreadThreadCountRealtime } from '@/hooks/useThreadReadStatus';
import { useProjects } from '@/hooks/useProjects';
import { computeHealth, HEALTH_CONFIG } from '@/lib/projectHealth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  TreePine,
  LogOut,
  BarChart3,
  History,
  Sun,
  ClipboardList,
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
  Briefcase,
  Megaphone,
  Layers,
  Cog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
  tooltip?: string;
}

function NavItem({ to, icon, label, collapsed, end, badge, tooltip }: NavItemProps) {
  const content = (
    <SidebarMenuButton asChild>
      <NavLink
        to={to}
        end={end}
        className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      >
        <div className="relative shrink-0">
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] font-medium bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    </SidebarMenuButton>
  );

  // Always show tooltip in collapsed mode; optionally show if tooltip prop set
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{tooltip || label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

interface CollapsibleNavGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
  isActive?: boolean;
  indicator?: string;
}

function CollapsibleNavGroup({ 
  title, 
  icon, 
  children, 
  collapsed, 
  defaultOpen = false,
  isActive = false,
  indicator,
}: CollapsibleNavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isActive);

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>{children}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarGroup>
        <CollapsibleTrigger className="w-full">
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider cursor-pointer hover:text-sidebar-foreground transition-colors flex items-center justify-between pr-2">
            <div className="flex items-center gap-2">
              {indicator && (
                <div className={cn("h-2 w-2 rounded-full", indicator)} />
              )}
              {icon}
              <span>{title}</span>
            </div>
            <ChevronRight 
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isOpen && "rotate-90"
              )} 
            />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isModuleEnabled, userRole } = useModules();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canView, currentRole } = useUserPermissions();
  
  const { data: unreadCount = 0 } = useUnreadThreadCount();
  useUnreadThreadCountRealtime();

  const isAdmin = currentRole === 'admin';
  
  // Recent projects (tracked in localStorage)
  const { data: allProjects } = useProjects();
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recent_projects') || '[]');
    } catch { return []; }
  });

  // Track current project visits
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
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  // Route matching for auto-expanding groups
  const isPortfolioActive = ['/properties', '/units', '/assets', '/occupancy'].some(p => currentPath.startsWith(p));
  const isOperationsActive = ['/issues', '/work-orders', '/permits'].some(p => currentPath.startsWith(p));
  const isCommunicationsActive = ['/messages', '/inbox', '/voice-agent'].some(p => currentPath.startsWith(p));
  const isOrganizationActive = ['/people', '/contacts', '/training', '/reports', '/documents', '/organizations'].some(p => currentPath.startsWith(p));
  const isDailyGroundsActive = currentPath.startsWith('/inspections/daily') || currentPath.startsWith('/inspections/history') || currentPath.startsWith('/inspections/review');
  const isNspireActive = currentPath.startsWith('/inspections') && !isDailyGroundsActive;
  const isProjectsActive = currentPath.startsWith('/projects');

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">APAS Consulting</span>
              </div>
            )}
          </NavLink>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto">
          {/* Dashboard - Always visible at top */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NavItem
                    to="/dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Dashboard"
                    collapsed={collapsed}
                    end
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Daily Grounds Module */}
          {isModuleEnabled('dailyGroundsEnabled') && canView('inspections') && (
            <CollapsibleNavGroup
              title="Daily Grounds"
              icon={<Sun className="h-3 w-3" />}
              collapsed={collapsed}
              isActive={isDailyGroundsActive}
              indicator="bg-emerald-500"
            >
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/daily"
                  icon={<Sun className="h-4 w-4" />}
                  label="Today's Inspection"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/history"
                  icon={<History className="h-4 w-4" />}
                  label="History"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/review"
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Review Queue"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
            </CollapsibleNavGroup>
          )}

          {/* Projects Module */}
          {isModuleEnabled('projectsEnabled') && canView('projects') && (
            <CollapsibleNavGroup
              title="Projects"
              icon={<FolderKanban className="h-3 w-3" />}
              collapsed={collapsed}
              isActive={isProjectsActive}
              indicator="bg-[hsl(var(--module-projects))]"
            >
              <SidebarMenuItem>
                <NavItem
                  to="/projects"
                  icon={<FolderKanban className="h-4 w-4" />}
                  label="All Projects"
                  collapsed={collapsed}
                  end
                />
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <NavItem
                    to="/projects/proposals"
                    icon={<FileText className="h-4 w-4" />}
                    label="Proposals"
                    collapsed={collapsed}
                  />
                </SidebarMenuItem>
              )}
              {/* Recent projects (non-collapsed mode only) */}
              {!collapsed && recentProjects.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-sidebar-muted font-semibold">Recent</span>
                  </div>
                  {recentProjects.map(p => {
                    const health = computeHealth(p);
                    const hc = HEALTH_CONFIG[health];
                    const isCurrentProject = currentPath === `/projects/${p.id}`;
                    return (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className={cn(
                              'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors',
                              'text-sidebar-foreground hover:bg-sidebar-accent',
                              isCurrentProject && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            )}
                          >
                            <div className={cn('h-2 w-2 rounded-full shrink-0', hc.dot)} />
                            <span className="truncate text-xs">{p.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </CollapsibleNavGroup>
          )}


          {/* NSPIRE Compliance Module */}
          {isModuleEnabled('nspireEnabled') && canView('inspections') && (
            <CollapsibleNavGroup
              title="NSPIRE Compliance"
              icon={<ClipboardCheck className="h-3 w-3" />}
              collapsed={collapsed}
              isActive={isNspireActive}
              indicator="bg-[hsl(var(--module-inspections))]"
            >
              <SidebarMenuItem>
                <NavItem
                  to="/inspections"
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  label="Dashboard"
                  collapsed={collapsed}
                  end
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/outside"
                  icon={<TreePine className="h-4 w-4" />}
                  label="Outside"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/inside"
                  icon={<Building className="h-4 w-4" />}
                  label="Inside"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/inspections/units"
                  icon={<DoorOpen className="h-4 w-4" />}
                  label="Units"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
            </CollapsibleNavGroup>
          )}

          {/* Portfolio - Properties, Units, Assets, Occupancy */}
          {canView('properties') && (
            <CollapsibleNavGroup
              title="Portfolio"
              icon={<Layers className="h-3 w-3" />}
              collapsed={collapsed}
              isActive={isPortfolioActive}
            >
              <SidebarMenuItem>
                <NavItem
                  to="/properties"
                  icon={<Building className="h-4 w-4" />}
                  label="Properties"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/units"
                  icon={<DoorOpen className="h-4 w-4" />}
                  label="Units"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavItem
                  to="/assets"
                  icon={<Box className="h-4 w-4" />}
                  label="Assets"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
              {isModuleEnabled('occupancyEnabled') && (
                <SidebarMenuItem>
                  <NavItem
                    to="/occupancy"
                    icon={<Home className="h-4 w-4" />}
                    label="Occupancy"
                    collapsed={collapsed}
                  />
                </SidebarMenuItem>
              )}
            </CollapsibleNavGroup>
          )}

          {/* Operations - Issues, Work Orders, Permits */}
          {(canView('issues') || canView('work_orders')) && (
            <CollapsibleNavGroup
              title="Operations"
              icon={<Wrench className="h-3 w-3" />}
              collapsed={collapsed}
              isActive={isOperationsActive}
            >
              {canView('issues') && (
                <SidebarMenuItem>
                  <NavItem
                    to="/issues"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Issues"
                    collapsed={collapsed}
                  />
                </SidebarMenuItem>
              )}
              {canView('work_orders') && (
                <>
                  <SidebarMenuItem>
                    <NavItem
                      to="/work-orders"
                      icon={<Wrench className="h-4 w-4" />}
                      label="Work Orders"
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <NavItem
                      to="/permits"
                      icon={<Shield className="h-4 w-4" />}
                      label="Permits"
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                </>
              )}
            </CollapsibleNavGroup>
          )}

          {/* Communications - Messages, Email, Voice Agent */}
          <CollapsibleNavGroup
            title="Communications"
            icon={<Megaphone className="h-3 w-3" />}
            collapsed={collapsed}
            isActive={isCommunicationsActive}
          >
            <SidebarMenuItem>
              <NavItem
                to="/messages"
                icon={<MessageCircle className="h-4 w-4" />}
                label="Messages"
                collapsed={collapsed}
                badge={unreadCount}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem
                to="/inbox"
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                collapsed={collapsed}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem
                to="/voice-agent"
                icon={<Phone className="h-4 w-4" />}
                label="Voice Agent"
                collapsed={collapsed}
                tooltip="AI Voice Call Center"
              />
            </SidebarMenuItem>
          </CollapsibleNavGroup>

          {/* Organization - People, Contacts, Training, Reports, Documents */}
          <CollapsibleNavGroup
            title="Organization"
            icon={<Briefcase className="h-3 w-3" />}
            collapsed={collapsed}
            isActive={isOrganizationActive}
          >
            {canView('people') && (
              <SidebarMenuItem>
                <NavItem
                  to="/people"
                  icon={<Users className="h-4 w-4" />}
                  label="People"
                  collapsed={collapsed}
                  tooltip="Team member management"
                />
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <NavItem
                to="/organizations"
                icon={<Building2 className="h-4 w-4" />}
                label="Organizations"
                collapsed={collapsed}
                tooltip="Companies & Clients"
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem
                to="/contacts"
                icon={<Contact className="h-4 w-4" />}
                label="Contacts"
                collapsed={collapsed}
                tooltip="CRM - Vendors & contacts"
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem
                to="/training"
                icon={<GraduationCap className="h-4 w-4" />}
                label="Training"
                collapsed={collapsed}
                tooltip="Training Academy"
              />
            </SidebarMenuItem>
            {canView('documents') && (
              <SidebarMenuItem>
                <NavItem
                  to="/documents"
                  icon={<FileText className="h-4 w-4" />}
                  label="Documents"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
            )}
            {canView('reports') && (
              <SidebarMenuItem>
                <NavItem
                  to="/reports"
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Reports"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
            )}
          </CollapsibleNavGroup>

          {/* Tools - QR Scanner (conditional) */}
          {isModuleEnabled('qrScanningEnabled') && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
                Tools
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <NavItem
                      to="/qr-scanner"
                      icon={<QrCode className="h-4 w-4" />}
                      label="QR Scanner"
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Rail — thin clickable strip on the sidebar edge for collapse/expand */}
        <SidebarRail />

        {/* Footer with user and settings */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            {/* User info */}
            <SidebarMenuItem>
              <div className={cn(
                "flex items-center gap-3 px-2 py-2",
                collapsed && "justify-center"
              )}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-sidebar-muted truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>
            </SidebarMenuItem>
            
            {/* Settings - Admin only */}
            {canView('settings') && (
              <SidebarMenuItem>
                <NavItem
                  to="/settings"
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                  collapsed={collapsed}
                />
              </SidebarMenuItem>
            )}
            
            {/* Logout */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={signOut}
                className="flex items-center gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Log out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
