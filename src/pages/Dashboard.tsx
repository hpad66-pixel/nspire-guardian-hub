import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

// Icons
import {
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  GraduationCap,
  ShieldAlert,
  Truck,
  Share2,
  ArrowRight,
  Wrench,
  FolderKanban,
  ClipboardCheck,
  Activity,
  CircleDot,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
} from 'lucide-react';

// UI
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useIssues } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useCommandCenter, type CommandCenterAlert, type TeamMemberStatus } from '@/hooks/useCommandCenter';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  credentials: { icon: BadgeCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  training:    { icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  safety:      { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  equipment:   { icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  portals:     { icon: Share2, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  projects:    { icon: FolderKanban, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  core:        { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = name?.split(' ')[0] ?? null;
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert Card
// ─────────────────────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.2 } }),
};

function AlertCard({
  alert,
  index,
  borderColor,
}: {
  alert: CommandCenterAlert;
  index: number;
  borderColor: string;
}) {
  const navigate = useNavigate();
  const mod = MODULE_COLORS[alert.module] ?? MODULE_COLORS.core;
  const ModIcon = mod.icon;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4',
        'border-l-4',
        borderColor
      )}
    >
      {/* Module icon */}
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', mod.bg)}>
        <ModIcon className={cn('h-4 w-4', mod.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {alert.personAvatar !== undefined || alert.personName ? (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={alert.personAvatar} />
              <AvatarFallback className="text-[9px]">{getInitials(alert.personName ?? null)}</AvatarFallback>
            </Avatar>
          ) : null}
          <p className="text-sm font-semibold truncate">{alert.title}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.subtitle}</p>
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs h-8"
        onClick={() => navigate(alert.actionPath)}
      >
        {alert.actionLabel}
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone Header
// ─────────────────────────────────────────────────────────────────────────────

function ZoneHeader({
  icon: Icon,
  iconClass,
  borderClass,
  label,
  count,
  countClass,
  subtext,
}: {
  icon: React.ElementType;
  iconClass: string;
  borderClass: string;
  label: string;
  count?: number;
  countClass?: string;
  subtext: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 pl-4 border-l-4', borderClass)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconClass)} />
          <h2 className="text-base font-semibold">{label}</h2>
          {count !== undefined && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', countClass)}>
              {count} item{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground w-full mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Member Card
// ─────────────────────────────────────────────────────────────────────────────

const DOT_COLORS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-slate-300 dark:bg-slate-600',
} as const;

const DOT_CARD_TINT = {
  red:   'bg-red-500/5 dark:bg-red-500/10',
  amber: 'bg-amber-500/5 dark:bg-amber-500/10',
  green: '',
  gray:  '',
} as const;

function TeamMemberCard({ member, index }: { member: TeamMemberStatus; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/60 p-4',
        DOT_CARD_TINT[member.dot]
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.avatar} />
        <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {member.jobTitle ?? member.department ?? 'Team Member'}
        </p>
        {member.department && member.jobTitle && (
          <span className="mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {member.department}
          </span>
        )}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('h-3 w-3 rounded-full shrink-0 cursor-help', DOT_COLORS[member.dot])} />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs max-w-[200px]">
            {member.worstReason ?? 'All credentials and training current'}
          </p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Activity Cards (Zone 4)
// ─────────────────────────────────────────────────────────────────────────────

function IssuesCard({ isLoading }: { isLoading: boolean }) {
  const { data: issues = [] } = useIssues();
  const open = useMemo(
    () => issues.filter(i => i.status !== 'resolved' && i.status !== 'closed'),
    [issues]
  );
  const SEVERITY_ORDER = ['severe', 'moderate', 'low'];
  const top3 = [...open]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 3);

  if (isLoading) return <Skeleton className="h-36 rounded-xl" />;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold">Open Issues</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{open.length}</span>
      </div>
      {top3.length > 0 ? (
        <div className="space-y-1.5">
          {top3.map(issue => (
            <div key={issue.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleDot className={cn('h-3 w-3 shrink-0',
                issue.severity === 'severe' ? 'text-red-500' :
                issue.severity === 'moderate' ? 'text-amber-500' : 'text-blue-500'
              )} />
              <span className="truncate">{issue.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No open issues</p>
      )}
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
        <Link to="/issues">View All Issues <ArrowRight className="h-3 w-3 ml-1" /></Link>
      </Button>
    </div>
  );
}

function ProjectsCard({ isLoading }: { isLoading: boolean }) {
  const { data: projects = [] } = useProjects();
  const active = useMemo(
    () => projects.filter(p => p.status === 'active' || p.status === 'planning'),
    [projects]
  );

  // Find next upcoming milestone
  const nextMilestone = useMemo(() => {
    const now = new Date();
    const upcoming = active
      .flatMap(p => (p.milestones ?? []).map(m => ({ ...m, projectName: p.name })))
      .filter(m => m.status !== 'completed' && m.due_date)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return upcoming.find(m => !isPast(new Date(m.due_date + 'T00:00:00'))) ?? upcoming[0] ?? null;
  }, [active]);

  if (isLoading) return <Skeleton className="h-36 rounded-xl" />;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold">Active Projects</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{active.length}</span>
      </div>
      {nextMilestone ? (
        <div className="text-xs space-y-0.5">
          <p className="text-muted-foreground font-medium">Next milestone:</p>
          <p className="font-semibold truncate">{nextMilestone.name}</p>
          <p className="text-muted-foreground">{nextMilestone.projectName} · {format(new Date(nextMilestone.due_date + 'T00:00:00'), 'MMM d')}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming milestones</p>
      )}
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
        <Link to="/projects">View Projects <ArrowRight className="h-3 w-3 ml-1" /></Link>
      </Button>
    </div>
  );
}

function WorkOrdersCard({ isLoading }: { isLoading: boolean }) {
  const { data: workOrders = [] } = useWorkOrders();
  const open = useMemo(
    () => workOrders.filter(w => w.status !== 'completed' && w.status !== 'verified' && w.status !== 'closed' && w.status !== 'rejected'),
    [workOrders]
  );
  const oldest = useMemo(() => {
    if (!open.length) return null;
    return [...open].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  }, [open]);

  const daysOpen = oldest
    ? differenceInDays(new Date(), new Date(oldest.created_at))
    : 0;

  if (isLoading) return <Skeleton className="h-36 rounded-xl" />;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold">Work Orders</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{open.length}</span>
      </div>
      {oldest ? (
        <div className="text-xs space-y-0.5">
          <p className="text-muted-foreground font-medium">Oldest open:</p>
          <p className="font-semibold truncate">{oldest.title}</p>
          <p className={cn('text-muted-foreground', daysOpen > 14 && 'text-amber-600 dark:text-amber-400')}>
            Open {daysOpen} day{daysOpen === 1 ? '' : 's'}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No open work orders</p>
      )}
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
        <Link to="/work-orders">View Work Orders <ArrowRight className="h-3 w-3 ml-1" /></Link>
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Zones
// ─────────────────────────────────────────────────────────────────────────────

function ZoneSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Today at a Glance — KPI Strip
// ─────────────────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass: string;
  accentClass: string;  // border + subtle bg
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  trendGoodDirection?: 'up' | 'down'; // which direction is "good"
  onClick?: () => void;
}

function KpiTile({
  label, value, sub, icon: Icon, iconClass, accentClass,
  trend, trendLabel, trendGoodDirection, onClick,
}: KpiTileProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'neutral' || !trend
      ? 'text-muted-foreground'
      : trend === trendGoodDirection
      ? 'text-green-500'
      : 'text-red-500';

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left w-full',
        accentClass,
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', iconClass.replace('text-', 'bg-').replace('-500', '-500/10').replace('-400', '-400/10'))}>
          <Icon className={cn('h-3.5 w-3.5', iconClass)} />
        </div>
      </div>
      <div>
        <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend && trendLabel && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {trendLabel}
        </div>
      )}
    </motion.button>
  );
}

interface GlanceStripProps {
  issues: ReturnType<typeof useIssues>['data'];
  workOrders: ReturnType<typeof useWorkOrders>['data'];
  projects: ReturnType<typeof useProjects>['data'];
  counts: { critical: number; warnings: number; teamGreen: number; teamAmber: number; teamRed: number };
  teamTotal: number;
  isLoading: boolean;
}

function GlanceStrip({ issues = [], workOrders = [], projects = [], counts, teamTotal, isLoading }: GlanceStripProps) {
  const navigate = useNavigate();

  const openIssues = issues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const severeIssues = issues.filter(i => i.severity === 'severe' && i.status !== 'resolved' && i.status !== 'closed').length;

  const openWOs = workOrders.filter(w =>
    w.status !== 'completed' && w.status !== 'verified' && w.status !== 'closed' && w.status !== 'rejected'
  ).length;
  const inProgressWOs = workOrders.filter(w => w.status === 'in_progress').length;

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning').length;

  const compliancePct = teamTotal > 0
    ? Math.round((counts.teamGreen / teamTotal) * 100)
    : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiTile
        label="Open Issues"
        value={openIssues}
        sub={severeIssues > 0 ? `${severeIssues} severe` : 'No severe issues'}
        icon={ClipboardCheck}
        iconClass="text-red-500"
        accentClass={cn(
          'border-border/60',
          openIssues > 0 && severeIssues > 0 ? 'border-l-4 border-l-red-500' : ''
        )}
        trend={severeIssues > 0 ? 'up' : 'neutral'}
        trendLabel={severeIssues > 0 ? `${severeIssues} need immediate attention` : 'All manageable'}
        trendGoodDirection="down"
        onClick={() => navigate('/issues')}
      />

      <KpiTile
        label="Work Orders"
        value={openWOs}
        sub={inProgressWOs > 0 ? `${inProgressWOs} in progress` : 'None in progress'}
        icon={Wrench}
        iconClass="text-orange-500"
        accentClass={cn(
          'border-border/60',
          openWOs > 5 ? 'border-l-4 border-l-orange-500' : ''
        )}
        trend={inProgressWOs > 0 ? 'neutral' : 'neutral'}
        trendLabel={openWOs === 0 ? 'All clear' : `${openWOs} open`}
        trendGoodDirection="down"
        onClick={() => navigate('/work-orders')}
      />

      <KpiTile
        label="Active Projects"
        value={activeProjects}
        sub={counts.critical > 0 ? `${counts.critical} critical alerts` : 'On track'}
        icon={FolderKanban}
        iconClass="text-indigo-500"
        accentClass="border-border/60"
        trend="neutral"
        trendLabel={activeProjects === 0 ? 'No active projects' : `${activeProjects} in flight`}
        trendGoodDirection="up"
        onClick={() => navigate('/projects')}
      />

      {compliancePct !== null ? (
        <KpiTile
          label="Team Compliance"
          value={`${compliancePct}%`}
          sub={`${counts.teamGreen} of ${teamTotal} members`}
          icon={ShieldCheck}
          iconClass={compliancePct === 100 ? 'text-green-500' : compliancePct >= 75 ? 'text-amber-500' : 'text-red-500'}
          accentClass={cn(
            'border-border/60',
            compliancePct === 100
              ? 'border-l-4 border-l-green-500'
              : compliancePct >= 75
              ? 'border-l-4 border-l-amber-500'
              : 'border-l-4 border-l-red-500'
          )}
          trend={compliancePct === 100 ? 'up' : compliancePct >= 75 ? 'neutral' : 'down'}
          trendLabel={compliancePct === 100 ? 'Fully compliant' : `${counts.teamRed + counts.teamAmber} need attention`}
          trendGoodDirection="up"
          onClick={() => {}}
        />
      ) : (
        <KpiTile
          label="Alerts Summary"
          value={counts.critical + counts.warnings}
          sub={`${counts.critical} critical · ${counts.warnings} warnings`}
          icon={AlertTriangle}
          iconClass={counts.critical > 0 ? 'text-red-500' : counts.warnings > 0 ? 'text-amber-500' : 'text-green-500'}
          accentClass={cn(
            'border-border/60',
            counts.critical > 0 ? 'border-l-4 border-l-red-500' : counts.warnings > 0 ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-green-500'
          )}
          trend={counts.critical > 0 ? 'up' : counts.warnings > 0 ? 'neutral' : 'down'}
          trendLabel={counts.critical + counts.warnings === 0 ? 'All clear' : 'Review below'}
          trendGoodDirection="down"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: issues = [] } = useIssues();
  const { data: workOrders = [] } = useWorkOrders();
  const { data: projects = [] } = useProjects();
  const {
    criticalAlerts,
    warningAlerts,
    teamStatuses,
    isLoading,
    lastRefreshed,
    counts,
  } = useCommandCenter();

  const [showAllCritical, setShowAllCritical] = useState(false);
  const [showAllWarning, setShowAllWarning] = useState(false);

  const greeting = getGreeting(profile?.full_name ?? (user?.user_metadata?.full_name as string | null) ?? null);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const visibleCritical = showAllCritical ? criticalAlerts : criticalAlerts.slice(0, 5);
  const visibleWarning = showAllWarning ? warningAlerts : warningAlerts.slice(0, 8);

  const teamTotal = teamStatuses.length;
  const allClear = criticalAlerts.length === 0 && warningAlerts.length === 0;

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{greeting} · {today}</p>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border',
            counts.critical > 0
              ? 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/50 dark:text-red-400'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', counts.critical > 0 ? 'bg-red-500' : 'bg-muted-foreground/40')} />
            {counts.critical} Critical
          </span>

          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border',
            counts.warnings > 0
              ? 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800/50 dark:text-amber-400'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', counts.warnings > 0 ? 'bg-amber-500' : 'bg-muted-foreground/40')} />
            {counts.warnings} Warnings
          </span>

          {teamTotal > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border',
              counts.teamRed > 0
                ? 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/50 dark:text-red-400'
                : counts.teamAmber > 0
                ? 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800/50 dark:text-amber-400'
                : 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800/50 dark:text-green-400'
            )}>
              <Users className="h-3 w-3" />
              {counts.teamGreen}/{teamTotal} Team Ready
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground gap-1.5"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3 w-3" />
            Refreshed {format(lastRefreshed, 'h:mm a')}
          </Button>
        </div>
      </div>

      {/* ── Today at a Glance ─────────────────────────────────────────────── */}
      <GlanceStrip
        issues={issues}
        workOrders={workOrders}
        projects={projects}
        counts={counts}
        teamTotal={teamTotal}
        isLoading={isLoading}
      />

      {/* ── Zone 1 + 2 or All Clear ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <ZoneSkeleton count={3} />
            <ZoneSkeleton count={4} />
          </motion.div>
        ) : allClear ? (
          <motion.div
            key="all-clear"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-500/5 dark:bg-green-500/10 p-8 flex flex-col items-center gap-3 text-center"
          >
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">All Clear</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                No expired credentials, upcoming expirations, or pending safety incidents requiring attention.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">

            {/* Zone 1 — Critical */}
            {criticalAlerts.length > 0 && (
              <section className="space-y-4">
                <ZoneHeader
                  icon={AlertTriangle}
                  iconClass="text-red-500"
                  borderClass="border-red-500"
                  label="Needs Attention"
                  count={criticalAlerts.length}
                  countClass="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  subtext="These require immediate action"
                />
                <div className="space-y-2">
                  {visibleCritical.map((alert, i) => (
                    <AlertCard key={alert.id} alert={alert} index={i} borderColor="border-l-red-500" />
                  ))}
                </div>
                {criticalAlerts.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowAllCritical(v => !v)}
                  >
                    {showAllCritical ? (
                      <><ChevronUp className="h-3 w-3 mr-1" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3 w-3 mr-1" /> Show {criticalAlerts.length - 5} more</>
                    )}
                  </Button>
                )}
              </section>
            )}

            {/* Zone 2 — Warnings */}
            {warningAlerts.length > 0 && (
              <section className="space-y-4">
                <ZoneHeader
                  icon={Clock}
                  iconClass="text-amber-500"
                  borderClass="border-amber-500"
                  label="Coming Up"
                  count={warningAlerts.length}
                  countClass="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  subtext="Within the next 60 days"
                />

                {/* Group by module */}
                {Object.entries(
                  visibleWarning.reduce<Record<string, CommandCenterAlert[]>>((acc, alert) => {
                    if (!acc[alert.module]) acc[alert.module] = [];
                    acc[alert.module].push(alert);
                    return acc;
                  }, {})
                ).map(([module, alerts]) => {
                  const mod = MODULE_COLORS[module] ?? MODULE_COLORS.core;
                  const ModIcon = mod.icon;
                  return (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <ModIcon className={cn('h-3.5 w-3.5', mod.color)} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{module}</span>
                      </div>
                      {alerts.map((alert, i) => (
                        <AlertCard key={alert.id} alert={alert} index={i} borderColor="border-l-amber-500" />
                      ))}
                    </div>
                  );
                })}

                {warningAlerts.length > 8 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowAllWarning(v => !v)}
                  >
                    {showAllWarning ? (
                      <><ChevronUp className="h-3 w-3 mr-1" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3 w-3 mr-1" /> Show {warningAlerts.length - 8} more</>
                    )}
                  </Button>
                )}
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zone 3 — Team Readiness ───────────────────────────────────────── */}
      <section className="space-y-4">
        <ZoneHeader
          icon={Users}
          iconClass="text-foreground"
          borderClass="border-primary"
          label="Team Readiness"
          subtext={
            teamTotal > 0
              ? `${counts.teamGreen} of ${teamTotal} members fully compliant`
              : 'Enable modules to track team readiness'
          }
        />

        {isLoading ? (
          <ZoneSkeleton count={4} />
        ) : teamStatuses.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 py-10 flex flex-col items-center gap-2 text-center px-4">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Enable Credential Wallet or Training Hub</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Once enabled, you'll see each team member's compliance status at a glance here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teamStatuses.map((member, i) => (
              <TeamMemberCard key={member.userId} member={member} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Zone 4 — Platform Activity ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pl-4 border-l-4 border-muted-foreground/30">
          <h2 className="text-base font-semibold">Platform Activity</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <IssuesCard isLoading={isLoading} />
          <ProjectsCard isLoading={isLoading} />
          <WorkOrdersCard isLoading={isLoading} />
        </div>
      </section>

    </div>
  );
}
