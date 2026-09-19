import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useUnreadThreadCount, useUnreadThreadCountRealtime } from '@/hooks/useThreadReadStatus';
import { useProjects } from '@/hooks/useProjects';
import {
  isDedicatedSiteAccountabilityProject,
  selectSiteAccountabilityProject,
  staffSiteAccountabilityPath,
} from '@/lib/accountability/accountabilityNavigation';
import { useWaterIntelAvailability } from '@/hooks/useWaterIntelligence';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
  ClipboardCheck,
  ClipboardList,
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
  ShieldCheck,
  QrCode,
  Settings,
  MoreHorizontal,
  FolderKanban,
  Lightbulb,
  UserRoundCheck,
  CircleDollarSign,
  ScanEye,
  X,
  Gauge,
  Droplets,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveSection = 'home' | 'daily' | 'compliance' | 'projects' | 'more';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveSection(pathname: string): ActiveSection {
  if (pathname === '/dashboard' || pathname === '/my-day' || pathname === '/cockpit') return 'home';
  if (
    pathname.startsWith('/inspections/daily') ||
    pathname.startsWith('/inspections/history') ||
    pathname.startsWith('/inspections/review')
  )
    return 'daily';
  if (pathname.startsWith('/inspections')) return 'compliance';
  if (pathname.startsWith('/projects') || pathname.startsWith('/site-accountability')) return 'projects';
  return 'more';
}

// Module accent colors
const MODULE_COLORS: Record<string, string> = {
  daily: '#69C2A2',       // verified emerald
  compliance: '#71A8CF',  // infrastructure blue
  projects: '#D5AA52',    // decision gold
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
  const pillColor = isActive && accentColor ? accentColor : '#D5AA52';
  const textColor = isActive
    ? accentColor ?? '#D5AA52'
    : '#8C9B95';

  return (
    <button
      onClick={onClick}
      className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1 cursor-pointer select-none active:scale-[0.96] transition-transform"
      type="button"
    >
      {/* Active pill indicator */}
      <div
        className={cn(
          'h-[2.5px] w-5 rounded-full mb-1 transition-all duration-200',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: pillColor }}
      />
      {/* Icon + optional badge dot */}
      <div className="relative">
        <span
          className="transition-colors duration-200 [&_svg]:stroke-[1.85]"
          style={{ color: textColor }}
        >
          {icon}
        </span>
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#E36B64] ring-[1.5px] ring-[#08271F]" />
        )}
      </div>
      {/* Label */}
      <span
        className="text-[12px] font-semibold leading-none transition-colors duration-200"
        style={{ color: textColor, letterSpacing: 0 }}
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

function SecondaryBar({ activeSection, hasSiteAccountability }: { activeSection: ActiveSection; hasSiteAccountability: boolean }) {
  const { pathname } = useLocation();

  if (activeSection === 'home' || activeSection === 'more') return null;

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
      { to: '/organizations', label: 'Clients' },
      ...(hasSiteAccountability ? [{ to: '/site-accountability', label: 'Site Accountability' }] : []),
    ];
  }

  if (items.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 flex h-10 items-center gap-1 overflow-x-auto border-t border-white/10 bg-[#041914] px-3 no-scrollbar"
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
        borderLeft: `3px solid ${borderColor}`,
      }}
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
      className="flex flex-col items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5 text-left transition-colors duration-150 active:bg-white/10"
    >
      <div className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-[#D5AA52] px-1 text-[10px] font-bold text-[#041914] tabular-nums">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[hsl(215,25%,92%)]" style={{ letterSpacing: 0 }}>
          {title}
        </p>
        <p className="text-[12px] font-medium leading-snug text-[hsl(215,16%,55%)] mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}

// ─── Section label inside drawer ──────────────────────────────────────────────

function DrawerSectionLabel({ label }: { label: string }) {
  return (
    <p className="col-span-2 mb-0.5 mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(215,16%,50%)]">
      {label}
    </p>
  );
}

// ─── More Drawer ─────────────────────────────────────────────────────────────

interface MoreDrawerProps {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
  hasSiteAccountability: boolean;
  siteAccountabilityPath: string;
}

function MoreDrawer({ open, onClose, unreadCount, hasSiteAccountability, siteAccountabilityPath }: MoreDrawerProps) {
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const { canView, currentRole } = useUserPermissions();
  const isAdminOrOwner = currentRole === 'admin' || currentRole === 'owner';
  const canManageContractors = ['admin', 'owner', 'manager', 'project_manager', 'administrator'].includes(currentRole ?? '');
  const showPropertyOps = isModuleEnabled('propertyMgmtEnabled');
  const showEmail = isModuleEnabled('emailInboxEnabled');
  const showTraining = isModuleEnabled('trainingHubEnabled');
  const showCockpit = isModuleEnabled('cockpitEnabled');
  const showClientPortals = isModuleEnabled('clientPortalEnabled');
  const isProjects =
    isModuleEnabled('constructionEnabled') ||
    isModuleEnabled('consultingEnabled') ||
    isModuleEnabled('projectsEnabled');
  const canViewDailyReports = isModuleEnabled('reportsEnabled') && (canView('reports') || isAdminOrOwner);
  const { data: hasEnabledWaterIntel = false } = useWaterIntelAvailability(showPropertyOps);
  const showWaterIntelligence = showPropertyOps && (isAdminOrOwner || hasEnabledWaterIntel);
  const showOperationsSection =
    (showPropertyOps && (canView('issues') || canView('work_orders'))) ||
    hasSiteAccountability ||
    canViewDailyReports;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const portfolioIconBg = 'bg-[hsl(215,20%,20%)]';
  const commIconBg = 'bg-[#D5AA52]/15';
  const orgIconBg = 'bg-[hsl(262,83%,58%)]/15';
  const toolsIconBg = 'bg-[hsl(215,20%,20%)]';
  const greenIconBg = 'bg-[hsl(142,76%,36%)]/15';
  const operationsRedBg = 'bg-[hsl(0,84%,60%)]/15';
  const operationsAmberBg = 'bg-[hsl(30,100%,50%)]/15';
  const adminIconBg = 'bg-[hsl(215,70%,45%)]/20';

  const iconClass = 'h-5 w-5 text-[hsl(215,25%,75%)]';

  const showToolsSection = isModuleEnabled('qrScanningEnabled') || canView('settings');

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent
        className="h-[72vh] border-t border-white/10 bg-[#08271F] text-[#F4EFE2] outline-none"
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 mb-4 h-1 w-9 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-[17px] font-semibold text-[hsl(215,25%,92%)]" style={{ letterSpacing: 0 }}>
            More
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[hsl(215,20%,55%)] transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-8 pt-0">

          <DrawerSectionLabel label="Command" />
          <DrawerTile
            icon={<Home className={iconClass} />}
            iconBg={portfolioIconBg}
            title="Dashboard"
            subtitle="Command center"
            onClick={() => go('/dashboard')}
          />
          <DrawerTile
            icon={<Sun className={iconClass} />}
            iconBg={greenIconBg}
            title="My Day"
            subtitle="Your work queue"
            onClick={() => go('/my-day')}
          />
          {showCockpit && (
            <DrawerTile
              icon={<Gauge className={iconClass} />}
              iconBg={adminIconBg}
              title="Cockpit"
              subtitle="Portfolio health"
              onClick={() => go('/cockpit')}
            />
          )}
          {showClientPortals && (
            <DrawerTile
              icon={<ShieldCheck className={iconClass} />}
              iconBg={commIconBg}
              title="Client Portals"
              subtitle="External access"
              onClick={() => go('/portals')}
            />
          )}
          {isProjects && (
            <DrawerTile
              icon={<CircleDollarSign className={iconClass} />}
              iconBg={commIconBg}
              title="Money Desk"
              subtitle="Proposals, invoices & billing"
              onClick={() => go('/projects')}
            />
          )}
          {hasSiteAccountability && (
            <DrawerTile
              icon={<ScanEye className={iconClass} />}
              iconBg={greenIconBg}
              title="Owner Walk"
              subtitle="Site photos, questions & proof"
              onClick={() => go(siteAccountabilityPath)}
            />
          )}

          {showOperationsSection && (
            <>
              <DrawerSectionLabel label="Operations" />
              {showPropertyOps && canView('issues') && (
                <DrawerTile
                  icon={<AlertTriangle className={iconClass} />}
                  iconBg={operationsRedBg}
                  title="Issues"
                  subtitle="Active defects & issues"
                  onClick={() => go('/issues')}
                />
              )}
              {showPropertyOps && canView('work_orders') && (
                <DrawerTile
                  icon={<Wrench className={iconClass} />}
                  iconBg={operationsAmberBg}
                  title="Work Orders"
                  subtitle="Maintenance pipeline"
                  onClick={() => go('/work-orders')}
                />
              )}
              {showPropertyOps && canView('work_orders') && (
                <DrawerTile
                  icon={<Shield className={iconClass} />}
                  iconBg={portfolioIconBg}
                  title="Compliance Permits"
                  subtitle="Property compliance docs & scan"
                  onClick={() => go('/permits')}
                />
              )}
              {hasSiteAccountability && (
                <DrawerTile
                  icon={<ScanEye className={iconClass} />}
                  iconBg={greenIconBg}
                  title="Site Accountability"
                  subtitle="Owner walks, photos & closeout proof"
                  onClick={() => go(siteAccountabilityPath)}
                />
              )}
              {canViewDailyReports && (
                <DrawerTile
                  icon={<ClipboardList className={iconClass} />}
                  iconBg={greenIconBg}
                  title="Daily Reports"
                  subtitle="View field reports"
                  onClick={() => go('/daily-reports')}
                />
              )}
            </>
          )}

          {/* PORTFOLIO */}
          {showPropertyOps && (
            <>
              <DrawerSectionLabel label="Property Ops" />
              <DrawerTile
                icon={<Building className={iconClass} />}
                iconBg={portfolioIconBg}
                title="Properties"
                subtitle="Managed property desk"
                onClick={() => go('/properties')}
              />
              {showWaterIntelligence && (
                <DrawerTile
                  icon={<Droplets className={iconClass} />}
                  iconBg={greenIconBg}
                  title="Water Intelligence"
                  subtitle="Utility ledger & owner brief"
                  onClick={() => go('/water-intel')}
                />
              )}
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
            </>
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
          {showEmail && (
            <DrawerTile
              icon={<Mail className={iconClass} />}
              iconBg={commIconBg}
              title="Email"
              subtitle="Email inbox"
              onClick={() => go('/inbox')}
            />
          )}
          {isModuleEnabled('aiEnabled') && (
            <DrawerTile
              icon={<Phone className={iconClass} />}
              iconBg={commIconBg}
              title="Voice Complaints"
              subtitle="ElevenLabs resident hotline"
              onClick={() => go('/voice-agent')}
            />
          )}

          {/* ORGANIZATION */}
          <DrawerSectionLabel label="Organization" />
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
            icon={<Contact className={iconClass} />}
            iconBg={orgIconBg}
            title="Contacts"
            subtitle="Vendors & contacts"
            onClick={() => go('/contacts')}
          />
          {isModuleEnabled('contractorReadinessEnabled') && canManageContractors && (
            <DrawerTile
              icon={<UserRoundCheck className={iconClass} />}
              iconBg={greenIconBg}
              title="Contractor Readiness"
              subtitle="Screening, documents & work gates"
              onClick={() => go('/contractor-readiness')}
            />
          )}
          {showTraining && (
            <DrawerTile
              icon={<GraduationCap className={iconClass} />}
              iconBg={orgIconBg}
              title="Training"
              subtitle="Training academy"
              onClick={() => go('/training')}
            />
          )}
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

          {/* ADMIN — Product Ideas lives here (also in top bar for everyone) */}
          {isAdminOrOwner && (
            <>
              <DrawerSectionLabel label="Admin" />
              <DrawerTile
                icon={<ShieldCheck className={iconClass} />}
                iconBg={adminIconBg}
                title="Admin"
                subtitle="Modules, packages, hub"
                onClick={() => go('/admin')}
              />
              <DrawerTile
                icon={<CircleDollarSign className={iconClass} />}
                iconBg={adminIconBg}
                title="Card Payoffs"
                subtitle="American Express payments"
                onClick={() => go('/admin/card-payoffs')}
              />
              <DrawerTile
                icon={<Lightbulb className={iconClass} />}
                iconBg={adminIconBg}
                title="Product Ideas"
                subtitle="Roadmap & client requests"
                onClick={() => go('/product-ideas')}
              />
            </>
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
  const { data: projects = [] } = useProjects();
  const siteAccountabilityProject = selectSiteAccountabilityProject(projects);
  const hasSiteAccountability = projects.some(isDedicatedSiteAccountabilityProject);
  const siteAccountabilityPath = siteAccountabilityProject
    ? staffSiteAccountabilityPath(siteAccountabilityProject.id)
    : '/site-accountability';
  useUnreadThreadCountRealtime();

  const isDailyGrounds = isModuleEnabled('dailyGroundsEnabled');
  const isNspire = isModuleEnabled('nspireEnabled');
  // Align with desktop sidebar: Projects = Construction or Consulting suite
  // (legacy properties.projects_enabled still counts as an enable).
  const isProjects =
    isModuleEnabled('constructionEnabled') ||
    isModuleEnabled('consultingEnabled') ||
    isModuleEnabled('projectsEnabled');

  const activeSection = getActiveSection(location.pathname);
  const hideOwnerWalkShortcut =
    location.pathname === '/site-accountability' ||
    location.pathname.endsWith('/accountability') ||
    location.pathname.startsWith('/owner-portal');

  return (
    <>
      {/* iPad secondary bar — only on md viewports */}
      <div className="hidden md:block lg:hidden">
        <SecondaryBar activeSection={activeSection} hasSiteAccountability={hasSiteAccountability} />
      </div>

      {/* Primary bar — 4rem tap row + home-indicator safe area */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-white/10 bg-[#041914]/95 backdrop-blur-xl"
        style={{
          minHeight: '4rem',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'hsl(222 47% 8% / 0.92)',
        }}
        data-testid="mobile-bottom-nav"
      >
        {/* Home — always visible */}
        <PrimaryItem
          icon={<Home className="h-5 w-5" />}
          label="Home"
          isActive={activeSection === 'home'}
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

      {hasSiteAccountability && !hideOwnerWalkShortcut && (
        <button
          type="button"
          onClick={() => navigate(siteAccountabilityPath)}
          className="fixed inset-x-4 z-[55] lg:hidden"
          style={{ bottom: 'calc(4.9rem + env(safe-area-inset-bottom, 0px))' }}
          data-testid="mobile-owner-walk-shortcut"
          aria-label="Open Site Accountability owner walkthrough"
        >
          <span className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-[#0d6b57] via-[#0a473a] to-[#082b23] px-4 py-3 text-left text-white shadow-[0_18px_45px_rgba(8,43,35,.28)] backdrop-blur-xl active:scale-[0.98]">
            <span className="flex items-center gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300 text-amber-950">
                <ScanEye className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-[#0d6b57]" />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">Owner walkthrough</span>
                <span className="block text-[15px] font-semibold leading-tight">Open Site Accountability</span>
              </span>
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-50">Open</span>
          </span>
        </button>
      )}

      {/* More drawer */}
      <MoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        unreadCount={unreadCount}
        hasSiteAccountability={hasSiteAccountability}
        siteAccountabilityPath={siteAccountabilityPath}
      />
    </>
  );
}
