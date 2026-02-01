import { NavLink } from '@/components/NavLink';
import { useModules } from '@/contexts/ModuleContext';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AppSidebar() {
  const { isModuleEnabled, userRole } = useModules();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';
  
  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border p-4">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">NSPIRE</span>
              <span className="text-xs text-sidebar-muted">Property OS</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Platform */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/properties"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Building className="h-4 w-4" />
                    {!collapsed && <span>Properties</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/units"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <DoorOpen className="h-4 w-4" />
                    {!collapsed && <span>Units</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/assets"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Box className="h-4 w-4" />
                    {!collapsed && <span>Assets</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/issues"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {!collapsed && <span>Issues</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/work-orders"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Wrench className="h-4 w-4" />
                    {!collapsed && <span>Work Orders</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/documents"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <FileText className="h-4 w-4" />
                    {!collapsed && <span>Documents</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/permits"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Permits</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/inbox"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Mail className="h-4 w-4" />
                    {!collapsed && <span>Inbox</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/people"
                        className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <Users className="h-4 w-4" />
                        {!collapsed && <span>People</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">Team member management</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/contacts"
                        className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <Contact className="h-4 w-4" />
                        {!collapsed && <span>Contacts</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">CRM - Vendors, regulators & contacts</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reports"
                    className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <BarChart3 className="h-4 w-4" />
                    {!collapsed && <span>Reports</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isModuleEnabled('occupancyEnabled') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/occupancy"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <Home className="h-4 w-4" />
                      {!collapsed && <span>Occupancy</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isModuleEnabled('qrScanningEnabled') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/qr-scanner"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <QrCode className="h-4 w-4" />
                      {!collapsed && <span>QR Scanner</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/training"
                        className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <GraduationCap className="h-4 w-4" />
                        {!collapsed && <span>Training</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">Training Academy - Operational skills & certifications</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Daily Grounds Module - Separate from NSPIRE */}
        {isModuleEnabled('dailyGroundsEnabled') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {!collapsed && <span>Daily Grounds</span>}
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/daily"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <Sun className="h-4 w-4" />
                      {!collapsed && <span>Today's Inspection</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/history"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <History className="h-4 w-4" />
                      {!collapsed && <span>History</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/review"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <ClipboardList className="h-4 w-4" />
                      {!collapsed && <span>Review Queue</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* NSPIRE Compliance Module - Inside unit inspections */}
        {isModuleEnabled('nspireEnabled') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-module-inspections" />
                {!collapsed && <span>NSPIRE Compliance</span>}
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections"
                      end
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      {!collapsed && <span>Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/outside"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <TreePine className="h-4 w-4" />
                      {!collapsed && <span>Outside</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/inside"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <Building className="h-4 w-4" />
                      {!collapsed && <span>Inside</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/inspections/units"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <DoorOpen className="h-4 w-4" />
                      {!collapsed && <span>Units</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Projects Module */}
        {isModuleEnabled('projectsEnabled') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-module-projects" />
                {!collapsed && <span>Projects</span>}
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/projects"
                      end
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <FolderKanban className="h-4 w-4" />
                      {!collapsed && <span>All Projects</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/projects/proposals"
                        className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <FileText className="h-4 w-4" />
                        {!collapsed && <span>Proposals</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

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
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                >
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Settings</span>}
                </NavLink>
              </SidebarMenuButton>
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
