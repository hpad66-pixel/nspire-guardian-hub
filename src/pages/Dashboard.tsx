import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

import {
  AlertTriangle, Clock, Users, RefreshCw,
  ChevronDown, ChevronUp, ArrowRight, Wrench, FolderKanban, ClipboardCheck,
  Activity, ShieldCheck, CalendarDays, Building2, TriangleAlert,
  Settings2, Eye, EyeOff, RotateCcw, Plus,
  MessageCircle, ClipboardList, BarChart3, Sunrise, HardHat, Lightbulb,
  FileText, Inbox, Phone, LayoutDashboard, Sparkles, Compass,
  Shield, Gauge, Contact, Files, Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { useMyProfile } from '@/hooks/useMyProfile';
import { useIssues } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useCommandCenter, type CommandCenterAlert } from '@/hooks/useCommandCenter';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { usePendingReviewCount } from '@/hooks/useInspectionReview';
import { useUnreadThreadCount } from '@/hooks/useThreadReadStatus';
import { useModules } from '@/contexts/ModuleContext';
import { type ActionCardData } from '@/components/dashboard/ActionCard';
import { ProjectKindBadge } from '@/components/projects/ProjectKindBadge';
import { isActiveProject } from '@/lib/projects';
import { dashboardHeroCopy, type DashboardHeroCta } from '@/lib/dashboard/hero';
import {
  DASHBOARD_NAV_CATEGORIES,
  filterDashboardNavCategories,
  type DashboardNavItemId,
} from '@/lib/dashboard/navMap';
import { groupProjectsByKind, projectKind, projectKindTileClass } from '@/lib/projectKind';

// ─── Helpers ────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.2 } }),
};

const NAV_ICONS: Record<DashboardNavItemId, LucideIcon> = {
  'my-day': Sunrise,
  projects: FolderKanban,
  'work-orders': Wrench,
  cockpit: Gauge,
  permits: Shield,
  inspections: ClipboardCheck,
  'daily-reports': ClipboardList,
  'daily-grounds': HardHat,
  clients: Building2,
  contacts: Contact,
  messages: MessageCircle,
  inbox: Inbox,
  voice: Phone,
  stores: LayoutDashboard,
  reports: BarChart3,
  documents: Files,
  portals: Link2,
  people: Users,
};

// ─── Widget Registry ────────────────────────────────────────────────

interface WidgetDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'kpi-strip', label: 'Pulse metrics', icon: Activity, description: 'Key metrics at a glance' },
  { id: 'nav-map', label: 'Where to go', icon: Compass, description: 'Categorized navigation map' },
  { id: 'portfolio', label: 'Portfolio glimpse', icon: FolderKanban, description: 'Active construction & consulting projects' },
  { id: 'alerts-critical', label: 'Critical Alerts', icon: AlertTriangle, description: 'Items needing immediate attention' },
  { id: 'alerts-warning', label: 'Warnings', icon: Clock, description: 'Items needing attention soon' },
  { id: 'coming-up', label: 'Coming Up', icon: CalendarDays, description: 'Upcoming deadlines and expirations' },
  { id: 'team-compliance', label: 'Team Compliance', icon: Users, description: 'Team member compliance status' },
];

// ─── Pulse Tile ─────────────────────────────────────────────────────

function PulseTile({
  label, value, icon: Icon, tone, sub, onClick,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: 'rose' | 'amber' | 'sapphire' | 'emerald' | 'ink';
  sub?: string;
  onClick?: () => void;
}) {
  const toneClass = {
    rose: 'border-[var(--apas-rose)]/25 hover:border-[var(--apas-rose)]/45',
    amber: 'border-[var(--apas-amber)]/30 hover:border-[var(--apas-amber)]/50',
    sapphire: 'border-[var(--apas-sapphire)]/30 hover:border-[var(--apas-sapphire)]/50',
    emerald: 'border-[var(--apas-emerald)]/30 hover:border-[var(--apas-emerald)]/50',
    ink: 'border-border/70 hover:border-[var(--apas-amber)]/40',
  }[tone];
  const iconWrap = {
    rose: 'bg-[var(--apas-rose)]/12 text-[var(--apas-rose)]',
    amber: 'bg-[var(--apas-amber)]/15 text-[var(--apas-amber)]',
    sapphire: 'bg-[var(--apas-sapphire)]/15 text-[var(--kind-consulting)]',
    emerald: 'bg-[var(--apas-emerald)]/15 text-[var(--apas-emerald)]',
    ink: 'bg-primary/8 text-primary',
  }[tone];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left w-full shadow-sm transition-shadow hover:shadow-md',
        toneClass,
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{sub}</p>}
      </div>
      {onClick && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </motion.button>
  );
}

// ─── Alert Card ─────────────────────────────────────────────────────

function AlertCard({ alert, index, isCritical }: { alert: CommandCenterAlert; index: number; isCritical: boolean }) {
  const navigate = useNavigate();
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3.5 border-l-4 shadow-sm',
        isCritical ? 'border-l-[var(--apas-rose)] border-[var(--apas-rose)]/20' : 'border-l-[var(--apas-amber)] border-[var(--apas-amber)]/25',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] uppercase tracking-wide',
              isCritical
                ? 'border-[var(--apas-rose)]/35 text-[var(--apas-rose)] bg-[var(--apas-rose)]/5'
                : 'border-[var(--apas-amber)]/40 text-[var(--apas-amber)] bg-[var(--apas-amber)]/5',
            )}
          >
            {isCritical ? 'Critical' : 'Soon'}
          </Badge>
        </div>
        <p className="text-sm font-semibold truncate leading-tight">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.subtitle}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 text-xs h-8 gap-1" onClick={() => navigate(alert.actionPath)}>
        {alert.actionLabel} <ArrowRight className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

// ─── Widget Customize Sheet ─────────────────────────────────────────

function WidgetCustomizer({
  hiddenWidgets, toggleWidget, resetLayout,
}: {
  hiddenWidgets: string[]; toggleWidget: (id: string) => void; resetLayout: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/15 hover:text-white">
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          {WIDGET_REGISTRY.map(w => {
            const hidden = hiddenWidgets.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg px-3 py-3 text-left transition-colors',
                  hidden ? 'opacity-50 hover:opacity-70' : 'hover:bg-accent/50'
                )}
              >
                <w.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{w.label}</p>
                  <p className="text-xs text-muted-foreground">{w.description}</p>
                </div>
                {hidden ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" className="w-full gap-2" onClick={resetLayout}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────

function ZoneSection({
  icon: Icon, iconClass, accentClass, title, badge, badgeClass, subtext, children, action,
}: {
  icon: React.ElementType; iconClass: string; accentClass: string; title: string;
  badge?: number | string; badgeClass?: string; subtext?: string; children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className={cn('flex items-start gap-3 pl-4 border-l-4', accentClass)}>
        <div className="flex-1 space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={cn('h-4 w-4', iconClass)} />
            <h2 className="text-base font-semibold leading-none font-display">{title}</h2>
            {badge !== undefined && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none', badgeClass)}>{badge}</span>
            )}
          </div>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isModuleEnabled } = useModules();

  const { data: profile } = useMyProfile();
  const { data: branding } = useCompanyBranding();
  const { data: issues = [] } = useIssues();
  const { data: projects = [] } = useProjects();
  const { data: workOrders = [] } = useWorkOrders();
  const { criticalAlerts, warningAlerts, teamStatuses, isLoading, counts } = useCommandCenter();
  const { hiddenWidgets, toggleWidget, resetLayout } = useDashboardLayout();
  const { data: pendingReviews = 0 } = usePendingReviewCount();
  const { data: unreadMessages = 0 } = useUnreadThreadCount();

  const [showAllCritical, setShowAllCritical] = useState(false);
  const [showAllWarning, setShowAllWarning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshedAt(new Date());
    setTimeout(() => setRefreshing(false), 800);
  }, [qc]);

  const openIssues = useMemo(() => issues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length, [issues]);
  const activeProjectsList = useMemo(() => projects.filter(isActiveProject), [projects]);
  const activeProjects = activeProjectsList.length;
  const openWOs = useMemo(() => workOrders.filter(w => !['completed', 'verified', 'closed', 'rejected'].includes(w.status)).length, [workOrders]);
  const totalAlerts = counts.critical + counts.warnings;

  const today = format(new Date(), 'EEEE, MMMM d');
  const workspaceName = branding?.company_name ?? 'Your Workspace';

  const hero = useMemo(
    () =>
      dashboardHeroCopy({
        fullName: profile?.full_name ?? null,
        workspaceName,
        criticalCount: counts.critical,
        warningCount: counts.warnings,
        activeProjects,
        openWOs,
        openIssues,
      }),
    [profile?.full_name, workspaceName, counts.critical, counts.warnings, activeProjects, openWOs, openIssues],
  );

  const handleHeroCta = useCallback((target: DashboardHeroCta) => {
    if (target === 'critical') {
      document.getElementById('dash-critical')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (target === 'my-day') return navigate('/my-day');
    if (target === 'projects') return navigate('/projects');
    if (target === 'work-orders') return navigate('/work-orders');
    if (target === 'issues') return navigate('/issues');
  }, [navigate]);

  const badgeCounts = useMemo(
    () => ({
      critical: counts.critical,
      warnings: counts.warnings,
      issues: openIssues,
      workOrders: openWOs,
      projects: activeProjects,
      messages: unreadMessages,
      reviews: pendingReviews,
    }),
    [counts.critical, counts.warnings, openIssues, openWOs, activeProjects, unreadMessages, pendingReviews],
  );

  const navCategories = useMemo(
    () =>
      filterDashboardNavCategories(DASHBOARD_NAV_CATEGORIES, (mod) => {
        // Projects suite: show Clients when either construction or consulting is on,
        // even if the legacy projectsEnabled property flag is still false.
        if (mod === 'projectsEnabled') {
          return (
            isModuleEnabled('projectsEnabled') ||
            isModuleEnabled('constructionEnabled') ||
            isModuleEnabled('consultingEnabled')
          );
        }
        return isModuleEnabled(mod);
      }),
    [isModuleEnabled],
  );

  const portfolio = useMemo(() => groupProjectsByKind(activeProjectsList), [activeProjectsList]);
  const portfolioPreview = useMemo(() => {
    const mixed = [...portfolio.construction, ...portfolio.consulting].slice(0, 6);
    return mixed;
  }, [portfolio]);

  // ── Guided actions ──────────────────────────────────────────────────
  const actionCards = useMemo<ActionCardData[]>(() => {
    const live: ActionCardData[] = [];

    if (counts.critical > 0) {
      live.push({
        id: 'critical', title: 'Resolve critical items', tone: 'danger',
        description: 'Items flagged as needing attention right now.',
        icon: AlertTriangle, count: counts.critical,
        onClick: () => document.getElementById('dash-critical')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      });
    }
    if (openIssues > 0) {
      live.push({
        id: 'issues', title: 'Work open issues', tone: 'danger',
        description: 'Open issues across your properties and projects.',
        icon: ClipboardCheck, count: openIssues, to: '/issues',
      });
    }
    if (pendingReviews > 0) {
      live.push({
        id: 'reviews', title: 'Review inspections', tone: 'warning',
        description: 'Submitted inspections waiting for your sign-off.',
        icon: ShieldCheck, count: pendingReviews, to: '/inspections/review',
      });
    }
    if (openWOs > 0) {
      live.push({
        id: 'work-orders', title: 'Advance work orders', tone: 'warning',
        description: 'Work orders still in progress.',
        icon: Wrench, count: openWOs, to: '/work-orders',
      });
    }
    if (activeProjects > 0) {
      live.push({
        id: 'projects', title: 'Check on projects', tone: 'default',
        description: 'Active projects in your workspace.',
        icon: FolderKanban, count: activeProjects, to: '/projects',
      });
    }
    if (unreadMessages > 0) {
      live.push({
        id: 'messages', title: 'Read new messages', tone: 'default',
        description: 'Unread message threads.',
        icon: MessageCircle, count: unreadMessages, to: '/messages',
      });
    }

    const fillers: ActionCardData[] = [
      { id: 'my-day', title: 'Open My Day', description: 'See what is on your plate today.', icon: Sunrise, to: '/my-day', tone: 'default' },
      { id: 'new-project', title: 'Start a new project', description: 'Spin up a project and its workspace.', icon: Plus, to: '/projects', tone: 'default' },
      { id: 'daily-reports', title: 'File a daily report', description: 'Capture today’s field activity.', icon: ClipboardList, to: '/daily-reports', tone: 'default' },
      { id: 'reports', title: 'Open reports', description: 'Review analytics across modules.', icon: BarChart3, to: '/reports', tone: 'default' },
    ];

    const cards = [...live];
    for (const f of fillers) {
      if (cards.length >= 3) break;
      if (!cards.some((c) => c.id === f.id)) cards.push(f);
    }
    return cards.slice(0, 3);
  }, [counts.critical, openIssues, pendingReviews, openWOs, activeProjects, unreadMessages]);

  const isVisible = (id: string) => !hiddenWidgets.includes(id);

  const CRITICAL_LIMIT = 5;
  const WARNING_LIMIT = 5;
  const visibleCritical = showAllCritical ? criticalAlerts : criticalAlerts.slice(0, CRITICAL_LIMIT);
  const visibleWarning = showAllWarning ? warningAlerts : warningAlerts.slice(0, WARNING_LIMIT);

  const heroToneBar =
    hero.tone === 'critical'
      ? 'from-[var(--apas-rose)]/30 via-transparent to-transparent'
      : hero.tone === 'clear'
        ? 'from-[var(--apas-emerald)]/25 via-transparent to-transparent'
        : 'from-[var(--apas-amber)]/25 via-transparent to-transparent';

  return (
    <div className="space-y-8 pb-16">
      {/* ── Hero command strip ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--apas-border)] bg-[var(--apas-midnight)] text-[var(--apas-white)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 10% 0%, rgba(213,170,82,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(113,168,207,0.16), transparent 50%)',
          }}
        />
        <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r', heroToneBar)} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--apas-muted)]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  <Building2 className="h-3 w-3 text-[var(--apas-amber)]" />
                  {workspaceName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  <LayoutDashboard className="h-3 w-3 text-[var(--apas-sapphire)]" />
                  Command Center
                </span>
                <span className="text-[var(--apas-muted)] normal-case tracking-normal">{today}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight max-w-3xl">
                {hero.headline}
              </h1>
              <p className="text-sm sm:text-base text-[rgba(251,248,241,0.72)] max-w-2xl leading-relaxed">
                {hero.subline}
              </p>
              <p className="text-xs sm:text-sm text-[var(--apas-amber)] font-medium tabular-nums">
                {hero.statusLine}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/15 hover:text-white"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                  Refresh
                </Button>
                <WidgetCustomizer hiddenWidgets={hiddenWidgets} toggleWidget={toggleWidget} resetLayout={resetLayout} />
              </div>
              <span className="text-[11px] text-[var(--apas-muted)] text-right hidden sm:block">
                Refreshed {format(refreshedAt, 'h:mm a')}
              </span>
              <Button
                size="lg"
                onClick={() => handleHeroCta(hero.ctaTarget)}
                className={cn(
                  'gap-2 shadow-lg font-semibold',
                  hero.tone === 'critical'
                    ? 'bg-[var(--apas-rose)] hover:bg-[var(--apas-rose)]/90 text-white'
                    : 'bg-[var(--apas-amber)] hover:bg-[var(--apas-amber)]/90 text-[var(--apas-midnight)]',
                )}
              >
                {hero.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Guided actions inside hero for wow + clarity */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {actionCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  if (card.onClick) return card.onClick();
                  if (card.to) navigate(card.to);
                }}
                className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left backdrop-blur-sm transition hover:bg-white/[0.08] hover:border-[var(--apas-amber)]/35"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    card.tone === 'danger'
                      ? 'bg-[var(--apas-rose)]/20 text-[var(--apas-rose)]'
                      : card.tone === 'warning'
                        ? 'bg-[var(--apas-amber)]/20 text-[var(--apas-amber)]'
                        : 'bg-[var(--apas-sapphire)]/20 text-[var(--apas-sapphire)]',
                  )}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{card.title}</p>
                    {card.count !== undefined && card.count > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 text-[11px] font-bold tabular-nums text-[var(--apas-amber)]">
                        {card.count > 99 ? '99+' : card.count}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[rgba(251,248,241,0.55)] leading-snug line-clamp-2">
                    {card.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[var(--apas-amber)] transition-colors mt-1" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Pulse metrics */}
        {isVisible('kpi-strip') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <PulseTile
              label="Open issues"
              value={openIssues}
              icon={ClipboardCheck}
              tone={openIssues > 0 ? 'rose' : 'emerald'}
              sub={openIssues > 0 ? 'Across properties & projects' : 'Nothing open'}
              onClick={() => navigate('/issues')}
            />
            <PulseTile
              label="Active projects"
              value={activeProjects}
              icon={FolderKanban}
              tone="sapphire"
              sub={`${portfolio.construction.length} construction · ${portfolio.consulting.length} consulting`}
              onClick={() => navigate('/projects')}
            />
            <PulseTile
              label="Work orders"
              value={openWOs}
              icon={Wrench}
              tone={openWOs > 0 ? 'amber' : 'ink'}
              sub={openWOs > 0 ? 'In progress or pending' : 'Queue clear'}
              onClick={() => navigate('/work-orders')}
            />
            <PulseTile
              label="Alerts"
              value={totalAlerts}
              icon={TriangleAlert}
              tone={totalAlerts > 0 ? (counts.critical > 0 ? 'rose' : 'amber') : 'emerald'}
              sub={totalAlerts > 0 ? `${counts.critical} critical · ${counts.warnings} warnings` : 'All clear'}
              onClick={() => {
                const el =
                  document.getElementById(counts.critical > 0 ? 'dash-critical' : 'dash-warnings') ??
                  document.getElementById('dash-critical');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>
        )}

        {/* Where to go */}
        {isVisible('nav-map') && (
          <ZoneSection
            icon={Compass}
            iconClass="text-[var(--kind-consulting)]"
            accentClass="border-[var(--kind-consulting)]"
            title="Where to go"
            subtext="Your map of the platform — tap a destination, no hunting in the sidebar"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {navCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3"
                >
                  <div>
                    <h3 className="text-sm font-bold font-display tracking-tight">{cat.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.subtitle}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const Icon = NAV_ICONS[item.id] ?? FileText;
                      const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                      return (
                        <Link
                          key={item.id}
                          to={item.to}
                          className="group flex items-start gap-2.5 rounded-xl border border-transparent bg-muted/40 px-3 py-2.5 transition hover:border-[var(--apas-sapphire)]/35 hover:bg-card hover:shadow-sm"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--apas-surface)]/10 text-[var(--apas-surface)] group-hover:bg-[var(--kind-consulting)]/10 group-hover:text-[var(--kind-consulting)]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">{item.label}</p>
                              {badge > 0 && (
                                <span className="rounded-full bg-[var(--apas-amber)]/15 px-1.5 text-[10px] font-bold tabular-nums text-[var(--apas-amber)]">
                                  {badge > 99 ? '99+' : badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ZoneSection>
        )}

        {/* Portfolio glimpse */}
        {isVisible('portfolio') && activeProjects > 0 && (
          <ZoneSection
            icon={FolderKanban}
            iconClass="text-primary"
            accentClass="border-primary"
            title="Portfolio glimpse"
            badge={activeProjects}
            badgeClass="bg-primary/10 text-primary"
            subtext="Active construction (ivory) and consulting (blue) workspaces"
            action={
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/projects')}>
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {portfolioPreview.map((p, i) => {
                const kind = projectKind(p);
                const Icon = kind === 'consulting' ? Lightbulb : HardHat;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className={cn(
                      'rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5',
                      projectKindTileClass(kind),
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-current/15 bg-black/5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <ProjectKindBadge project={p} />
                    </div>
                    <p className="mt-3 font-semibold text-sm leading-snug line-clamp-2">{p.name}</p>
                    <p className="mt-1 text-xs opacity-70 truncate">
                      {p.client?.name || p.property?.name || 'Standalone'}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </ZoneSection>
        )}

        {/* Critical Alerts */}
        {isVisible('alerts-critical') && (
          <div id="dash-critical" className="scroll-mt-20">
            <ZoneSection
              icon={AlertTriangle}
              iconClass="text-[var(--apas-rose)]"
              accentClass="border-[var(--apas-rose)]"
              title="Needs attention now"
              badge={counts.critical > 0 ? counts.critical : undefined}
              badgeClass="bg-[var(--apas-rose)]/15 text-[var(--apas-rose)]"
              subtext="Critical items requiring immediate action"
            >
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : criticalAlerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--apas-emerald)]/30 bg-[var(--apas-emerald)]/5 p-4">
                  <Sparkles className="h-5 w-5 text-[var(--apas-emerald)] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--apas-emerald)]">All clear</p>
                    <p className="text-xs text-muted-foreground">No critical items require attention right now</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleCritical.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} isCritical />)}
                  {criticalAlerts.length > CRITICAL_LIMIT && (
                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAllCritical(v => !v)}>
                      {showAllCritical ? <><ChevronUp className="h-3.5 w-3.5" />Show less</> : <><ChevronDown className="h-3.5 w-3.5" />Show {criticalAlerts.length - CRITICAL_LIMIT} more</>}
                    </Button>
                  )}
                </div>
              )}
            </ZoneSection>
          </div>
        )}

        {/* Warnings */}
        {isVisible('alerts-warning') && (warningAlerts.length > 0 || isLoading) && (
          <div id="dash-warnings" className="scroll-mt-20">
            <ZoneSection
              icon={Clock}
              iconClass="text-[var(--apas-amber)]"
              accentClass="border-[var(--apas-amber)]"
              title="Coming due soon"
              badge={counts.warnings > 0 ? counts.warnings : undefined}
              badgeClass="bg-[var(--apas-amber)]/15 text-[var(--apas-amber)]"
              subtext="Warnings that need attention before they become critical"
            >
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : (
                <div className="space-y-2">
                  {visibleWarning.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} isCritical={false} />)}
                  {warningAlerts.length > WARNING_LIMIT && (
                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAllWarning(v => !v)}>
                      {showAllWarning ? <><ChevronUp className="h-3.5 w-3.5" />Show less</> : <><ChevronDown className="h-3.5 w-3.5" />Show {warningAlerts.length - WARNING_LIMIT} more</>}
                    </Button>
                  )}
                </div>
              )}
            </ZoneSection>
          </div>
        )}

        {/* Coming Up */}
        {isVisible('coming-up') && (
          <ZoneSection
            icon={CalendarDays}
            iconClass="text-[var(--kind-consulting)]"
            accentClass="border-[var(--kind-consulting)]"
            title="Coming up"
            subtext="Expirations and deadlines in the next 60 days"
          >
            <button
              onClick={() => navigate('/credentials')}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 w-full text-left hover:bg-accent/40 transition-colors group shadow-sm"
            >
              <CalendarDays className="h-5 w-5 text-[var(--kind-consulting)] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Timeline view</p>
                <p className="text-xs text-muted-foreground">Credential expirations, training due dates, and equipment documents</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </ZoneSection>
        )}

        {/* Team Compliance */}
        {isVisible('team-compliance') && (
          <ZoneSection
            icon={Users}
            iconClass="text-primary"
            accentClass="border-primary"
            title="Team compliance"
            badge={counts.teamRed > 0 ? `${counts.teamRed} flagged` : undefined}
            badgeClass="bg-destructive/15 text-destructive"
            subtext="Compliance health snapshot for active team members"
          >
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : teamStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No team data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {teamStatuses.slice(0, 12).map((member, i) => (
                  <motion.button
                    key={member.userId}
                    type="button"
                    onClick={() => navigate(`/people?member=${member.userId}`)}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-4 text-center cursor-pointer hover:border-primary/40 transition-colors shadow-sm',
                      member.dot === 'red' && 'bg-destructive/5',
                      member.dot === 'amber' && 'bg-amber-500/5',
                    )}
                  >
                    <div className={cn(
                      'absolute top-3 right-3 h-2.5 w-2.5 rounded-full ring-2',
                      member.dot === 'red' ? 'bg-destructive ring-destructive/30' :
                      member.dot === 'amber' ? 'bg-amber-500 ring-amber-500/30' :
                      member.dot === 'green' ? 'bg-green-500 ring-green-500/20' :
                      'bg-muted-foreground/30 ring-border',
                    )} />
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {member.name?.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') ?? '?'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold truncate w-full">{member.name}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </ZoneSection>
        )}
      </div>
    </div>
  );
}
