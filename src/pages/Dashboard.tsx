import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

import {
  AlertTriangle, Clock, Users, CheckCircle2, RefreshCw,
  ChevronDown, ChevronUp, ArrowRight, Wrench, FolderKanban, ClipboardCheck,
  Activity, ShieldCheck, CalendarDays, Building2, TriangleAlert,
  Settings2, Eye, EyeOff, RotateCcw, GripVertical, Plus,
  MessageCircle, ClipboardList, BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useIssues } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useCommandCenter, type CommandCenterAlert, type TeamMemberStatus } from '@/hooks/useCommandCenter';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { usePendingReviewCount } from '@/hooks/useInspectionReview';
import { useUnreadThreadCount } from '@/hooks/useThreadReadStatus';
import { ActionCard, type ActionCardData } from '@/components/dashboard/ActionCard';
import { isActiveProject } from '@/lib/projects';

// ─── Helpers ────────────────────────────────────────────────────────

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = name?.split(' ')[0];
  return first ? `${greet}, ${first}` : greet;
}

const cardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.2 } }),
};

// ─── Widget Registry ────────────────────────────────────────────────

interface WidgetDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'kpi-strip', label: 'KPI Tiles', icon: Activity, description: 'Key metrics at a glance' },
  { id: 'alerts-critical', label: 'Critical Alerts', icon: AlertTriangle, description: 'Items needing immediate attention' },
  { id: 'alerts-warning', label: 'Warnings', icon: Clock, description: 'Items needing attention soon' },
  { id: 'coming-up', label: 'Coming Up', icon: CalendarDays, description: 'Upcoming deadlines and expirations' },
  { id: 'team-compliance', label: 'Team Compliance', icon: Users, description: 'Team member compliance status' },
  { id: 'module-snapshot', label: 'Module Snapshot', icon: Activity, description: 'Status across all modules' },
];

// ─── KPI Tile ───────────────────────────────────────────────────────

function KpiTile({
  label, value, icon: Icon, iconClass, accent, sub, onClick,
}: {
  label: string; value: number | string; icon: React.ElementType; iconClass: string; accent: string; sub?: string; onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      type="button"
      onClick={onClick}
      className={cn('flex flex-col gap-2 rounded-xl border bg-card p-4 text-left w-full', accent, onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', iconClass)} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
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
      className={cn('flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 border-l-4', isCritical ? 'border-l-destructive' : 'border-l-amber-500')}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.subtitle}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 gap-1" onClick={() => navigate(alert.actionPath)}>
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
        <Button variant="outline" size="sm" className="gap-2">
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
  icon: Icon, iconClass, accentClass, title, badge, badgeClass, subtext, children,
}: {
  icon: React.ElementType; iconClass: string; accentClass: string; title: string;
  badge?: number | string; badgeClass?: string; subtext?: string; children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className={cn('flex items-start gap-3 pl-4 border-l-4', accentClass)}>
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={cn('h-4 w-4', iconClass)} />
            <h2 className="text-base font-semibold leading-none">{title}</h2>
            {badge !== undefined && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none', badgeClass)}>{badge}</span>
            )}
          </div>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

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
  const activeProjects = useMemo(() => projects.filter(isActiveProject).length, [projects]);
  const openWOs = useMemo(() => workOrders.filter(w => !['completed', 'verified', 'closed', 'rejected'].includes(w.status)).length, [workOrders]);
  const totalAlerts = counts.critical + counts.warnings;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const greeting = getGreeting(profile?.full_name ?? null);
  const workspaceName = branding?.company_name ?? 'Your Workspace';
  const firstName = profile?.full_name?.split(' ')[0] ?? null;

  // ── Guided actions ──────────────────────────────────────────────────
  // Real, tenant-scoped signals (RLS keeps each org to its own data). Only
  // cards with a live count surface; if fewer than three are active we fill
  // with quick-start actions so the band always guides the user somewhere.
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
      { id: 'new-project', title: 'Start a new project', description: 'Spin up a project and its workspace.', icon: Plus, to: '/projects', tone: 'default' },
      { id: 'daily-reports', title: 'File a daily report', description: 'Capture today’s field activity.', icon: ClipboardList, to: '/daily-reports', tone: 'default' },
      { id: 'reports', title: 'Open reports', description: 'Review analytics across modules.', icon: BarChart3, to: '/reports', tone: 'default' },
    ];

    const cards = [...live];
    for (const f of fillers) {
      if (cards.length >= 3) break;
      cards.push(f);
    }
    return cards.slice(0, 6);
  }, [counts.critical, openIssues, pendingReviews, openWOs, activeProjects, unreadMessages]);

  const isVisible = (id: string) => !hiddenWidgets.includes(id);

  const CRITICAL_LIMIT = 5;
  const WARNING_LIMIT = 5;
  const visibleCritical = showAllCritical ? criticalAlerts : criticalAlerts.slice(0, CRITICAL_LIMIT);
  const visibleWarning = showAllWarning ? warningAlerts : warningAlerts.slice(0, WARNING_LIMIT);

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{workspaceName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">{greeting} · {today}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">Refreshed {format(refreshedAt, 'h:mm a')}</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <WidgetCustomizer hiddenWidgets={hiddenWidgets} toggleWidget={toggleWidget} resetLayout={resetLayout} />
        </div>
      </div>

      {/* Welcome + guided actions */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </h2>
          <p className="text-sm text-muted-foreground">What would you like to accomplish today?</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actionCards.map((card) => (
            <ActionCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* KPI Strip */}
      {isVisible('kpi-strip') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiTile label="Open Issues" value={openIssues} icon={ClipboardCheck} iconClass="text-destructive" accent="border-destructive/20" onClick={() => navigate('/issues')} />
          <KpiTile label="Active Projects" value={activeProjects} icon={FolderKanban} iconClass="text-indigo-500" accent="border-indigo-500/20" onClick={() => navigate('/projects')} />
          <KpiTile label="Work Orders" value={openWOs} icon={Wrench} iconClass="text-orange-500" accent="border-orange-500/20" onClick={() => navigate('/work-orders')} />
          <KpiTile
            label="Alerts" value={totalAlerts} icon={TriangleAlert}
            iconClass={totalAlerts > 0 ? 'text-amber-500' : 'text-green-500'}
            accent={totalAlerts > 0 ? 'border-amber-500/20' : 'border-green-500/20'}
            sub={totalAlerts > 0 ? `${counts.critical} critical · ${counts.warnings} warnings` : 'All clear'}
            onClick={() => {
              const el = document.getElementById(counts.critical > 0 ? 'dash-critical' : 'dash-warnings') ?? document.getElementById('dash-critical');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      )}

      {/* Critical Alerts */}
      {isVisible('alerts-critical') && (
        <div id="dash-critical" className="scroll-mt-20">
        <ZoneSection
          icon={AlertTriangle} iconClass="text-destructive" accentClass="border-destructive"
          title="Needs Attention Now"
          badge={counts.critical > 0 ? counts.critical : undefined}
          badgeClass="bg-destructive/15 text-destructive"
          subtext="Critical items requiring immediate action"
        >
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : criticalAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">All clear</p>
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
          icon={Clock} iconClass="text-amber-500" accentClass="border-amber-500"
          title="Warnings"
          badge={counts.warnings > 0 ? counts.warnings : undefined}
          badgeClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          subtext="Items needing attention soon"
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
          icon={CalendarDays} iconClass="text-blue-500" accentClass="border-blue-500"
          title="Coming Up"
          subtext="Expirations and deadlines in the next 60 days"
        >
          <button
            onClick={() => navigate('/credentials')}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 w-full text-left hover:bg-accent/40 transition-colors group"
          >
            <CalendarDays className="h-5 w-5 text-blue-500 shrink-0" />
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
          icon={Users} iconClass="text-primary" accentClass="border-primary"
          title="Team Compliance"
          badge={counts.teamRed > 0 ? `${counts.teamRed} flagged` : undefined}
          badgeClass="bg-destructive/15 text-destructive"
          subtext="Compliance health snapshot for all active team members"
        >
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : teamStatuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-10 text-center">
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
                    'relative flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center cursor-pointer hover:border-primary/40 transition-colors',
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

      {/* Module Snapshot */}
      {isVisible('module-snapshot') && (
        <ZoneSection
          icon={Activity} iconClass="text-muted-foreground" accentClass="border-border"
          title="Module Snapshot"
          subtext="Quick access to all modules"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Credentials', path: '/credentials', icon: '🎫' },
              { label: 'Safety', path: '/safety', icon: '🦺' },
              { label: 'Equipment', path: '/equipment', icon: '🚛' },
              { label: 'Training', path: '/training', icon: '🎓' },
              { label: 'Portals', path: '/portals', icon: '🔗' },
              { label: 'People', path: '/people', icon: '👥' },
            ].map(mod => (
              <button
                key={mod.label}
                onClick={() => navigate(mod.path)}
                className="rounded-xl border border-border/60 bg-card p-4 text-center hover:bg-accent/40 transition-colors group"
              >
                <div className="text-xl mb-2">{mod.icon}</div>
                <p className="text-xs font-semibold group-hover:text-primary transition-colors">{mod.label}</p>
              </button>
            ))}
          </div>
        </ZoneSection>
      )}
    </div>
  );
}
