import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useUnreadThreadCount, useUnreadThreadCountRealtime } from '@/hooks/useThreadReadStatus';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Sun,
  Building,
  DoorOpen,
  FileText,
  BarChart3,
  Users,
  Contact,
  GraduationCap,
  MessageCircle,
  Mail,
  Phone,
  Box,
  Home,
  Shield,
  QrCode,
  Settings,
  MoreHorizontal,
  FolderKanban,
  X,
  Globe,
} from 'lucide-react';
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveSection = 'dashboard' | 'daily' | 'compliance' | 'projects' | 'more';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveSection(pathname: string): ActiveSection {
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
  if (
    pathname.startsWith('/inspections/daily') ||
    pathname.startsWith('/inspections/history') ||
    pathname.startsWith('/inspections/review')
  )
    return 'daily';
  if (pathname.startsWith('/inspections')) return 'compliance';
  if (pathname.startsWith('/projects')) return 'projects';
  return 'more';
}

// Module accent colors
const MODULE_COLORS: Record<string, string> = {
  daily: '#10B981',             // emerald
  compliance: '#1D6FE8',        // sapphire
  projects: 'hsl(262 83% 58%)', // violet
};

// ─── Primary bar item ─────────────────────────────────────────────────────────

interface PrimaryItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: boolean;
  accentColor?: string;
}

function PrimaryItem({ icon, label, isActive, onClick, badge, accentColor }: PrimaryItemProps) {
  const pillColor = isActive && accentColor ? accentColor : 'hsl(217 91% 62%)';
  const textColor = isActive
    ? accentColor ?? 'hsl(217 91% 62%)'
    : 'hsl(215 20% 50%)';

  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1 cursor-pointer select-none"
    >
      {/* Active pill indicator */}
      <div
        className={cn(
          'h-[3px] w-4 rounded-full mb-1 transition-all duration-150',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: pillColor }}
      />
      {/* Icon + optional badge dot */}
      <div className="relative">
        <span
          className="transition-colors duration-150"
          style={{ color: textColor }}
        >
          {icon}
        </span>
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(0,84%,60%)]" />
        )}
      </div>
      {/* Label */}
      <span
        className="text-[10px] font-medium leading-none tracking-wide transition-colors duration-150"
        style={{ color: textColor }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── iPad secondary bar ───────────────────────────────────────────────────────

function SecondaryBarItem({
  to,
  label,
  currentPath,
  accentColor,
}: {
  to: string;
  label: string;
  currentPath: string;
  accentColor: string;
}) {
  const navigate = useNavigate();
  const isActive = currentPath === to || (to !== '/inspections' && currentPath.startsWith(to));

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150',
        isActive
          ? 'bg-white/10'
          : 'bg-transparent text-[hsl(215,20%,55%)] hover:bg-white/5'
      )}
      style={isActive ? { color: accentColor } : undefined}
    >
      {label}
    </button>
  );
}

function SecondaryBar({ activeSection }: { activeSection: ActiveSection }) {
  const { pathname } = useLocation();

  if (activeSection === 'dashboard' || activeSection === 'more') return null;

  let items: { to: string; label: string }[] = [];
  let accentColor = MODULE_COLORS.daily;
  let borderColor = MODULE_COLORS.daily;

  if (activeSection === 'daily') {
    accentColor = MODULE_COLORS.daily;
    borderColor = MODULE_COLORS.daily;
    items = [
      { to: '/inspections/daily', label: 'Today' },
      { to: '/inspections/history', label: 'History' },
      { to: '/inspections/review', label: 'Review Queue' },
    ];
  } else if (activeSection === 'compliance') {
    accentColor = MODULE_COLORS.compliance;
    borderColor = MODULE_COLORS.compliance;
    items = [
      { to: '/inspections', label: 'Overview' },
      { to: '/inspections/outside', label: 'Outside' },
      { to: '/inspections/inside', label: 'Inside' },
      { to: '/inspections/units', label: 'Units' },
    ];
  } else if (activeSection === 'projects') {
    accentColor = MODULE_COLORS.projects;
    borderColor = MODULE_COLORS.projects;
    items = [
      { to: '/projects', label: 'All Projects' },
      { to: '/projects/proposals', label: 'Proposals' },
    ];
  }

  if (items.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 flex h-10 items-center gap-1 overflow-x-auto px-3 border-t border-[hsl(222,30%,17%)] bg-[hsl(222,47%,7%)] scrollbar-hide"
      style={{ bottom: 64, borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Colored context dot */}
      <span
        className="shrink-0 h-2 w-2 rounded-full mr-1"
        style={{ background: accentColor }}
      />
      {items.map((item) => (
        <SecondaryBarItem
          key={item.to}
          to={item.to}
          label={item.label}
          currentPath={pathname}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

// ─── More drawer tile ─────────────────────────────────────────────────────────

interface DrawerTileProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: number;
  onClick: () => void;
}

function DrawerTile({ icon, iconBg, title, subtitle, badge, onClick }: DrawerTileProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-colors duration-150 active:bg-white/10"
    >
      <div className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(217,91%,62%)] px-1 text-[9px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[hsl(215,25%,92%)]">{title}</p>
        <p className="text-[11px] leading-tight text-[hsl(215,16%,50%)]">{subtitle}</p>
      </div>
    </button>
  );
}

// ─── Section label inside drawer ──────────────────────────────────────────────

function DrawerSectionLabel({ label }: { label: string }) {
  return (
    <p className="col-span-2 mb-1 mt-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(215,16%,40%)]">
      {label}
    </p>
  );
}

// ─── More Drawer ─────────────────────────────────────────────────────────────

interface MoreDrawerProps {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
}

function MoreDrawer({ open, onClose, unreadCount }: MoreDrawerProps) {
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const { canView } = useUserPermissions();
  const { data: isPlatformAdmin } = useIsPlatformAdmin();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const portfolioIconBg = 'bg-[hsl(215,20%,20%)]';
  const commIconBg = 'bg-[hsl(217,91%,62%)]/15';
  const orgIconBg = 'bg-[hsl(262,83%,58%)]/15';
  const toolsIconBg = 'bg-[hsl(215,20%,20%)]';
  const greenIconBg = 'bg-[hsl(142,76%,36%)]/15';
  const operationsRedBg = 'bg-[hsl(0,84%,60%)]/15';
  const operationsAmberBg = 'bg-[hsl(30,100%,50%)]/15';

  const iconClass = 'h-5 w-5 text-[hsl(215,25%,75%)]';

  const showToolsSection = isModuleEnabled('qrScanningEnabled') || canView('settings');

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent
        className="h-[72vh] border-t border-[hsl(222,30%,17%)] bg-[hsl(222,47%,9%)] text-[hsl(215,25%,92%)] outline-none"
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 mb-4 h-1 w-9 rounded-full bg-[hsl(222,30%,25%)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-base font-semibold text-[hsl(215,25%,92%)]">More</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[hsl(215,20%,55%)] transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-8 pt-0">

          {/* OPERATIONS — moved here from bottom bar */}
          <DrawerSectionLabel label="Operations" />
          <DrawerTile
            icon={<AlertTriangle className={iconClass} />}
            iconBg={operationsRedBg}
            title="Issues"
            subtitle="Active defects & issues"
            onClick={() => go('/issues')}
          />
          <DrawerTile
            icon={<Wrench className={iconClass} />}
            iconBg={operationsAmberBg}
            title="Work Orders"
            subtitle="Maintenance pipeline"
            onClick={() => go('/work-orders')}
          />
          <DrawerTile
            icon={<Shield className={iconClass} />}
            iconBg={portfolioIconBg}
            title="Permits"
            subtitle="Permit tracking"
            onClick={() => go('/permits')}
          />

          {/* PORTFOLIO */}
          <DrawerSectionLabel label="Portfolio" />
          <DrawerTile
            icon={<Building className={iconClass} />}
            iconBg={portfolioIconBg}
            title="Properties"
            subtitle="Manage your properties"
            onClick={() => go('/properties')}
          />
          <DrawerTile
            icon={<DoorOpen className={iconClass} />}
            iconBg={portfolioIconBg}
            title="Units"
            subtitle="Unit inventory"
            onClick={() => go('/units')}
          />
          <DrawerTile
            icon={<Box className={iconClass} />}
            iconBg={portfolioIconBg}
            title="Assets"
            subtitle="Equipment & assets"
            onClick={() => go('/assets')}
          />
          {isModuleEnabled('occupancyEnabled') && (
            <DrawerTile
              icon={<Home className={iconClass} />}
              iconBg={portfolioIconBg}
              title="Occupancy"
              subtitle="Tenant tracking"
              onClick={() => go('/occupancy')}
            />
          )}

          {/* COMMUNICATIONS */}
          <DrawerSectionLabel label="Communications" />
          <DrawerTile
            icon={<MessageCircle className={iconClass} />}
            iconBg={commIconBg}
            title="Messages"
            subtitle="Team messages"
            badge={unreadCount}
            onClick={() => go('/messages')}
          />
          <DrawerTile
            icon={<Mail className={iconClass} />}
            iconBg={commIconBg}
            title="Email"
            subtitle="Email inbox"
            onClick={() => go('/inbox')}
          />
          <DrawerTile
            icon={<Phone className={iconClass} />}
            iconBg={commIconBg}
            title="Voice Agent"
            subtitle="AI call center"
            onClick={() => go('/voice-agent')}
          />

          {/* ORGANIZATION */}
          <DrawerSectionLabel label="People & Clients" />
          {canView('people') && (
            <DrawerTile
              icon={<Users className={iconClass} />}
              iconBg={orgIconBg}
              title="People"
              subtitle="Team management"
              onClick={() => go('/people')}
            />
          )}
          <DrawerTile
            icon={<Building className={iconClass} />}
            iconBg={orgIconBg}
            title="Organizations"
            subtitle="Client organizations"
            onClick={() => go('/organizations')}
          />
          <DrawerTile
            icon={<Contact className={iconClass} />}
            iconBg={orgIconBg}
            title="Contacts"
            subtitle="Vendors & contacts"
            onClick={() => go('/contacts')}
          />
          <DrawerTile
            icon={<GraduationCap className={iconClass} />}
            iconBg={orgIconBg}
            title="Training"
            subtitle="Training academy"
            onClick={() => go('/training')}
          />
          {canView('documents') && (
            <DrawerTile
              icon={<FileText className={iconClass} />}
              iconBg={orgIconBg}
              title="Documents"
              subtitle="File storage"
              onClick={() => go('/documents')}
            />
          )}
          {canView('reports') && (
            <DrawerTile
              icon={<BarChart3 className={iconClass} />}
              iconBg={orgIconBg}
              title="Reports"
              subtitle="Analytics"
              onClick={() => go('/reports')}
            />
          )}

          {/* TOOLS */}
          {showToolsSection && (
            <>
              <DrawerSectionLabel label="Tools" />
              {isModuleEnabled('qrScanningEnabled') && (
                <DrawerTile
                  icon={<QrCode className={iconClass} />}
                  iconBg={greenIconBg}
                  title="QR Scanner"
                  subtitle="Scan assets"
                  onClick={() => go('/qr-scanner')}
                />
              )}
              {canView('settings') && (
                <DrawerTile
                  icon={<Settings className={iconClass} />}
                  iconBg={toolsIconBg}
                  title="Settings"
                  subtitle="App settings"
                  onClick={() => go('/settings')}
                />
              )}
            </>
          )}

          {isPlatformAdmin && (
            <>
              <DrawerSectionLabel label="Platform" />
              <DrawerTile
                icon={<Globe className={iconClass} />}
                iconBg={toolsIconBg}
                title="Platform Admin"
                subtitle="Workspace tenants & modules"
                onClick={() => go('/platform')}
              />
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadThreadCount();
  useUnreadThreadCountRealtime();

  const isDailyGrounds = isModuleEnabled('dailyGroundsEnabled');
  const isNspire = isModuleEnabled('nspireEnabled');
  const isProjects = isModuleEnabled('projectsEnabled');

  const activeSection = getActiveSection(location.pathname);

  return (
    <>
      {/* iPad secondary bar — only on md viewports */}
      <div className="hidden md:block lg:hidden">
        <SecondaryBar activeSection={activeSection} />
      </div>

      {/* Primary bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-[hsl(222,30%,17%)] bg-[hsl(222,47%,9%)]"
        style={{
          height: 64,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Dashboard — always visible */}
        <PrimaryItem
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Command"
          isActive={activeSection === 'dashboard'}
          onClick={() => navigate('/dashboard')}
        />

        {/* Daily Grounds — module gated */}
        {isDailyGrounds && (
          <PrimaryItem
            icon={<Sun className="h-5 w-5" />}
            label="Grounds"
            isActive={activeSection === 'daily'}
            accentColor={MODULE_COLORS.daily}
            onClick={() => navigate('/inspections/daily')}
          />
        )}

        {/* NSPIRE Compliance — module gated */}
        {isNspire && (
          <PrimaryItem
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Compliance"
            isActive={activeSection === 'compliance'}
            accentColor={MODULE_COLORS.compliance}
            onClick={() => navigate('/inspections')}
          />
        )}

        {/* Projects — module gated */}
        {isProjects && (
          <PrimaryItem
            icon={<FolderKanban className="h-5 w-5" />}
            label="Projects"
            isActive={activeSection === 'projects'}
            accentColor={MODULE_COLORS.projects}
            onClick={() => navigate('/projects')}
          />
        )}

        {/* More — always visible */}
        <PrimaryItem
          icon={<MoreHorizontal className="h-5 w-5" />}
          label="More"
          isActive={activeSection === 'more' || moreOpen}
          onClick={() => setMoreOpen(true)}
        />
      </div>

      {/* More drawer */}
      <MoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        unreadCount={unreadCount}
      />
    </>
  );
}
