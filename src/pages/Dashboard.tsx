import { useMemo, useEffect, useState } from 'react';
import { useAllPropertiesUtilitySummary } from '@/hooks/useUtilityBills';
import { useModules } from '@/contexts/ModuleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building, 
  DoorOpen, 
  AlertTriangle, 
  ClipboardCheck, 
  FolderKanban,
  ArrowRight,
  Clock,
  CheckCircle2,
  TreePine,
  FileText,
  TrendingUp,
  Calendar,
  AtSign,
  MessageSquare,
  MessageCircle,
  CheckSquare,
  Users,
  Circle,
  Bell,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';
import { useUnitsByProperty } from '@/hooks/useUnits';
import { useIssuesByProperty } from '@/hooks/useIssues';
import { useDefects, useOpenDefects } from '@/hooks/useDefects';
import { useProjectsByProperty } from '@/hooks/useProjects';
import { useNotifications, useMarkNotificationRead, type Notification } from '@/hooks/useNotifications';
import { useMyActionItems, useAssignedByMe, useUpdateActionItem, type ActionItem } from '@/hooks/useActionItems';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Redesigned MetricCard ─────────────────────────────────────────────────
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className,
  to,
  accentColor,
  iconColor,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  to?: string;
  accentColor?: string;   // left-border accent class
  iconColor?: string;     // icon color class
}) {
  const content = (
    <div className={cn(
      "group relative overflow-hidden rounded-xl bg-card transition-all duration-200",
      "hover:shadow-md hover:-translate-y-px",
      "border border-border/60",
      accentColor && `border-l-4 ${accentColor}`,
      className
    )}>
      <div className="flex items-start justify-between p-5">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-[hsl(var(--success))]" />}
              <span>{subtitle}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 mt-0.5">
          <Icon className={cn("h-5 w-5", iconColor || "text-muted-foreground")} />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

// ── Redesigned Module Command Center Card ────────────────────────────────
function ModuleCommandCard({ 
  title, 
  icon: Icon, 
  to, 
  accentClass,
  statusBadge,
  stats,
  actions,
  children,
}: { 
  title: string; 
  icon: React.ElementType;
  to: string;
  accentClass: string;   // border-l color class e.g. "border-l-[hsl(var(--module-inspections))]"
  statusBadge?: string;  // e.g. "3 Open"
  stats?: { label: string; value: string | number }[];
  actions?: { label: string; to: string; icon?: React.ElementType }[];
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "group relative bg-card rounded-xl border border-border/60 border-l-4 overflow-hidden",
      "hover:shadow-md transition-all duration-200",
      accentClass
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Link to={to} className="text-sm font-semibold tracking-tight hover:text-primary transition-colors">
            {title}
          </Link>
        </div>
        {statusBadge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
            {statusBadge}
          </span>
        )}
      </div>

      {/* Inline stats pill row */}
      {stats && stats.length > 0 && (
        <div className="flex items-center gap-0 px-5 pb-3">
          {stats.map((stat, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2 px-3 py-1.5",
              i > 0 && "border-l border-border/40"
            )}>
              <span className="text-sm font-bold tabular-nums">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom content */}
      {children && (
        <div className="px-5 pb-3">
          {children}
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="px-5 pb-4 pt-1 flex gap-2">
          {actions.map((action, i) => (
            <Button key={i} variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" asChild>
              <Link to={action.to}>
                {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                {action.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Today at a Glance Bar ─────────────────────────────────────────────────
function TodayGlanceBar({
  vacantUnits,
  overdueDefects,
  openIssuesCount,
  activeProjects,
}: {
  vacantUnits: number;
  overdueDefects: number;
  openIssuesCount: number;
  activeProjects: number;
}) {
  const today = new Date();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 rounded-xl bg-card border border-border/60">
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {format(today, 'EEEE, MMMM d')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Vacant units */}
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
          vacantUnits > 0
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50"
            : "bg-success/10 text-success border-success/20"
        )}>
          <Circle className="h-1.5 w-1.5 fill-current" />
          {vacantUnits} vacant
        </span>

        {/* Overdue defects */}
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
          overdueDefects > 0
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : "bg-success/10 text-success border-success/20"
        )}>
          <Circle className="h-1.5 w-1.5 fill-current" />
          {overdueDefects} overdue defects
        </span>

        {/* Open issues */}
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
          openIssuesCount > 5
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : openIssuesCount > 0
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50"
            : "bg-success/10 text-success border-success/20"
        )}>
          <Circle className="h-1.5 w-1.5 fill-current" />
          {openIssuesCount} open issues
        </span>

        {/* Active projects */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground border-border/50">
          <Circle className="h-1.5 w-1.5 fill-current" />
          {activeProjects} active projects
        </span>
      </div>
    </div>
  );
}

// ── Priority config for dashboard ─────────────────────────────────────────
const DASH_PRIORITY = {
  urgent: { dot: 'bg-red-500', label: 'Urgent' },
  high:   { dot: 'bg-orange-500', label: 'High' },
  medium: { dot: 'bg-blue-500', label: 'Medium' },
  low:    { dot: 'bg-slate-400', label: 'Low' },
} as const;

const DASH_STATUS = {
  todo:        { label: 'To Do',       cls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  in_review:   { label: 'In Review',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  done:        { label: 'Done',        cls: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-muted text-muted-foreground' },
} as const;

function getDueBadge(dueDate: string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate + 'T00:00:00');
  if (isPast(d) && !isToday(d)) return { label: 'Overdue', cls: 'text-destructive font-bold' };
  if (isToday(d)) return { label: 'Today', cls: 'text-orange-600 dark:text-orange-400 font-semibold' };
  if (isTomorrow(d)) return { label: 'Tomorrow', cls: 'text-amber-600 dark:text-amber-400' };
  const diff = differenceInDays(d, new Date());
  return {
    label: `${format(d, 'MMM d')}`,
    cls: diff <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
  };
}

function MyTasksSection({
  tasks,
  isLoading,
  showCompleted,
  onToggleCompleted,
  onNavigateToProject,
}: {
  tasks: ActionItem[];
  isLoading: boolean;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  onNavigateToProject: (id: string) => void;
}) {
  const activeTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aOverdue = a.due_date && isPast(new Date(a.due_date + 'T00:00:00')) && !isToday(new Date(a.due_date + 'T00:00:00'));
      const bOverdue = b.due_date && isPast(new Date(b.due_date + 'T00:00:00')) && !isToday(new Date(b.due_date + 'T00:00:00'));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }, [tasks]);

  const PREVIEW_COUNT = 5;
  const shownTasks = activeTasks.slice(0, PREVIEW_COUNT);
  const remaining = activeTasks.length - PREVIEW_COUNT;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">My Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {activeTasks.length === 0
                ? 'All caught up!'
                : `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} assigned to you`}
            </p>
          </div>
        </div>
      </div>

      {activeTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 py-10 flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="font-medium text-sm">No tasks assigned to you</p>
          <p className="text-xs text-muted-foreground">Tasks assigned to you from projects will appear here</p>
        </div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {shownTasks.map(task => {
              const pCfg = DASH_PRIORITY[task.priority];
              const sCfg = DASH_STATUS[task.status];
              const due = getDueBadge(task.due_date);
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors group',
                    isDone && 'opacity-60'
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', pCfg.dot)} title={pCfg.label} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>
                      {task.title}
                    </p>
                    {task.project && (
                      <button
                        onClick={() => onNavigateToProject(task.project!.id)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-full text-left"
                      >
                        {task.project.name}
                      </button>
                    )}
                  </div>
                  {due && (
                    <span className={cn('text-xs shrink-0 flex items-center gap-1', due.cls)}>
                      <Clock className="h-3 w-3" />
                      {due.label}
                    </span>
                  )}
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0', sCfg.cls)}>
                    {sCfg.label}
                  </span>
                  {task.project && (
                    <button
                      onClick={() => onNavigateToProject(task.project!.id)}
                      className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {remaining > 0 && (
            <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">+{remaining} more task{remaining !== 1 ? 's' : ''}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Status color map for "assigned by me" live tracking ───────────────────
const STATUS_RING = {
  todo:        { ring: 'border-l-muted-foreground/30', dot: 'bg-muted-foreground/40', label: 'To Do' },
  in_progress: { ring: 'border-l-blue-500',            dot: 'bg-blue-500',             label: 'In Progress' },
  in_review:   { ring: 'border-l-amber-500',           dot: 'bg-amber-500',            label: 'In Review' },
  done:        { ring: 'border-l-emerald-500',         dot: 'bg-emerald-500',          label: 'Done' },
  cancelled:   { ring: 'border-l-muted-foreground/40', dot: 'bg-muted-foreground/30',  label: 'Cancelled' },
} as const;

function AssignedByMeSection({
  tasks,
  isLoading,
  onNavigateToProject,
}: {
  tasks: ActionItem[];
  isLoading: boolean;
  onNavigateToProject: (id: string) => void;
}) {
  const PREVIEW_COUNT = 6;

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aActive = a.status !== 'done' && a.status !== 'cancelled';
      const bActive = b.status !== 'done' && b.status !== 'cancelled';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      const aOverdue = a.due_date && isPast(new Date(a.due_date + 'T00:00:00')) && !isToday(new Date(a.due_date + 'T00:00:00'));
      const bOverdue = b.due_date && isPast(new Date(b.due_date + 'T00:00:00')) && !isToday(new Date(b.due_date + 'T00:00:00'));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }, [tasks]);

  const shownTasks = sortedTasks.slice(0, PREVIEW_COUNT);
  const remaining = sortedTasks.length - PREVIEW_COUNT;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) return null;

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const activeCount = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Tasks I've Assigned</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount} active · {doneCount} completed across all projects
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
          {shownTasks.map(task => {
            const pCfg = DASH_PRIORITY[task.priority];
            const sCfg = STATUS_RING[task.status];
            const due = getDueBadge(task.due_date);
            const isDone = task.status === 'done' || task.status === 'cancelled';
            const assigneeName = task.assignee?.full_name || task.assignee?.email || 'Unassigned';
            const assigneeInitial = assigneeName.charAt(0).toUpperCase();

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors group',
                  'border-l-4',
                  sCfg.ring,
                  isDone && 'opacity-55'
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', pCfg.dot)} title={pCfg.label} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  {task.project && (
                    <button
                      onClick={() => onNavigateToProject(task.project!.id)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-full text-left"
                    >
                      {task.project.name}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Avatar className="h-5 w-5">
                    {task.assignee?.avatar_url && <AvatarImage src={task.assignee.avatar_url} />}
                    <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                      {assigneeInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground hidden sm:inline max-w-[80px] truncate">
                    {assigneeName.split(' ')[0]}
                  </span>
                </div>
                {due && (
                  <span className={cn('text-xs shrink-0 flex items-center gap-1', due.cls)}>
                    <Clock className="h-3 w-3" />
                    {due.label}
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', sCfg.dot, isDone && 'animate-none')} />
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                    DASH_STATUS[task.status].cls
                  )}>
                    {sCfg.label}
                  </span>
                </div>
                {task.project && (
                  <button
                    onClick={() => onNavigateToProject(task.project!.id)}
                    className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {remaining > 0 && (
          <div className="px-5 py-3 border-t bg-muted/20">
            <span className="text-xs text-muted-foreground">+{remaining} more task{remaining !== 1 ? 's' : ''}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

function UrgentItem({ 
  title, 
  subtitle, 
  timeRemaining, 
  severity 
}: { 
  title: string; 
  subtitle: string; 
  timeRemaining: string; 
  severity: 'severe' | 'moderate' | 'low';
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 transition-all hover:bg-muted/50">
      <div className="flex items-center gap-2.5">
        <SeverityBadge severity={severity} />
        <div>
          <p className="text-xs font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <span className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded",
        severity === 'severe' ? "bg-destructive/10 text-[hsl(var(--destructive))]" : "bg-muted text-muted-foreground"
      )}>
        {timeRemaining}
      </span>
    </div>
  );
}

// ── Severity border class helper for issues table ─────────────────────────
function issueSeverityBorder(severity: string) {
  if (severity === 'severe') return 'border-l-[hsl(var(--destructive))]';
  if (severity === 'moderate') return 'border-l-[hsl(var(--warning))]';
  return 'border-l-border/40';
}

function issueStatusBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    open: 'bg-destructive/10 text-[hsl(var(--destructive))]',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    resolved: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    verified: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  };
  const label: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', verified: 'Verified',
  };
  return { cls: map[status] || 'bg-muted text-muted-foreground', label: label[status] || status };
}

export default function Dashboard() {
  const { isModuleEnabled } = useModules();
  const { user } = useAuth();
  const { shouldShowOnboarding } = useOnboarding();
  const navigate = useNavigate();
  
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const { data: allPropertiesUtility } = useAllPropertiesUtilitySummary();
  const { data: units = [] } = useUnitsByProperty(selectedPropertyId || null);
  const { data: issues = [], isLoading: loadingIssues } = useIssuesByProperty(selectedPropertyId || null);
  const { data: defects = [] } = useDefects();
  const { data: openDefects = [] } = useOpenDefects();
  const { data: projects = [] } = useProjectsByProperty(selectedPropertyId || null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const { data: myTasks = [], isLoading: tasksLoading } = useMyActionItems();
  const { data: assignedByMeTasks = [], isLoading: assignedLoading } = useAssignedByMe();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const actionNotifications = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return notifications.filter((n) => 
      (n.type === 'mention' || n.type === 'assignment') &&
      new Date(n.created_at) > sevenDaysAgo
    );
  }, [notifications]);

  const unreadActionCount = actionNotifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!selectedPropertyId && properties && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const handleOnboardingComplete = () => {
    window.location.reload();
  };

  const scopedDefects = useMemo(
    () => defects.filter(d => d.inspection?.property_id === selectedPropertyId),
    [defects, selectedPropertyId]
  );
  const scopedOpenDefects = useMemo(
    () => openDefects.filter(d => d.inspection?.property_id === selectedPropertyId),
    [openDefects, selectedPropertyId]
  );

  const openIssues = issues.filter(i => i.status !== 'resolved' && i.status !== 'verified');
  const urgentDefects = scopedOpenDefects.filter(d => d.severity === 'severe').slice(0, 3);

  const unitStats = useMemo(() => {
    const total = units.length;
    const occupied = units.filter(u => u.status === 'occupied').length;
    const vacant = units.filter(u => u.status === 'vacant').length;
    const maintenance = units.filter(u => u.status === 'maintenance').length;
    return {
      total, occupied, vacant, maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }, [units]);

  const defectStats = useMemo(() => {
    const open = scopedDefects.filter(d => !d.repaired_at);
    const severe = open.filter(d => d.severity === 'severe').length;
    const moderate = open.filter(d => d.severity === 'moderate').length;
    const low = open.filter(d => d.severity === 'low').length;
    const resolved = scopedDefects.filter(d => d.repaired_at).length;
    const verified = scopedDefects.filter(d => d.repair_verified).length;
    return { severe, moderate, low, resolved, verified, total: scopedDefects.length };
  }, [scopedDefects]);

  const projectStats = useMemo(() => {
    const active = projects.filter(p => p.status === 'active').length;
    const planning = projects.filter(p => p.status === 'planning').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    const completed = projects.filter(p => p.status === 'completed' || p.status === 'closed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
    return { active, planning, onHold, completed, totalBudget, totalSpent, total: projects.length };
  }, [projects]);

  const complianceRate = issues && issues.length > 0 
    ? Math.round((issues.filter(i => i.status === 'resolved' || i.status === 'verified').length / issues.length) * 100)
    : 100;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const hour = new Date().getHours();
  const greetingBase = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0] ?? '';
  const greeting = firstName ? `${greetingBase}, ${firstName}` : greetingBase;

  const hasNspire = isModuleEnabled('nspireEnabled');
  const hasDailyGrounds = isModuleEnabled('dailyGroundsEnabled');
  const hasProjects = isModuleEnabled('projectsEnabled');
  const hasAnyModule = hasNspire || hasDailyGrounds || hasProjects;

  // Overdue defects: repair deadline in the past
  const overdueDefectsCount = scopedOpenDefects.filter(d => {
    return d.repair_deadline && isPast(new Date(d.repair_deadline));
  }).length;

  // ── "Your Attention" derived data ─────────────────────────────────────────
  const dashboardToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const attentionItems = useMemo(() => {
    const items: { label: string; sub: string; urgency: 'red' | 'amber' | 'blue'; to: string }[] = [];

    // Overdue open issues
    openIssues
      .filter(i => i.deadline && new Date(i.deadline) < dashboardToday)
      .slice(0, 4)
      .forEach(i => items.push({
        label: i.severity === 'severe' ? 'Severe Issue' : 'Issue',
        sub: i.title,
        urgency: 'red',
        to: '/issues',
      }));

    // Overdue defects
    scopedOpenDefects
      .filter(d => d.repair_deadline && new Date(d.repair_deadline) < dashboardToday)
      .slice(0, 3)
      .forEach(d => items.push({
        label: 'Defect Overdue',
        sub: d.item_name,
        urgency: 'red',
        to: '/inspections/history',
      }));

    // Unread mentions / assignments from the last 7 days
    actionNotifications
      .filter(n => !n.is_read)
      .slice(0, 3)
      .forEach(n => items.push({
        label: n.type === 'mention' ? '@Mention' : 'Assignment',
        sub: n.title,
        urgency: 'blue',
        to: n.entity_type === 'project' && n.entity_id ? `/projects/${n.entity_id}` : '/issues',
      }));

    // Overdue tasks (my tasks)
    myTasks
      .filter(t => !['done', 'cancelled'].includes(t.status) && t.due_date && isPast(new Date(t.due_date + 'T00:00:00')) && !isToday(new Date(t.due_date + 'T00:00:00')))
      .slice(0, 3)
      .forEach(t => items.push({
        label: 'Task Overdue',
        sub: t.title,
        urgency: 'amber',
        to: t.project ? `/projects/${t.project.id}` : '/projects',
      }));

    return items;
  }, [openIssues, scopedOpenDefects, actionNotifications, myTasks, dashboardToday]);

  const dashboardAllClear = attentionItems.length === 0;

  return (
    <>
      {shouldShowOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}
      
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-fade-in">

          {/* ── Greeting + Property Selector ─────────────────────────────── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
              <p className="text-sm text-muted-foreground">
                Here's what's happening across your property portfolio today.
              </p>
            </div>
            <div className="w-full sm:w-[240px]">
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Today at a Glance ─────────────────────────────────────────── */}
          <TodayGlanceBar
            vacantUnits={unitStats.vacant}
            overdueDefects={overdueDefectsCount}
            openIssuesCount={openIssues.length}
            activeProjects={projectStats.active}
          />

          {/* ── Core Metrics ──────────────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {loadingProperties ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl bg-card p-5 border border-border/50">
                    <Skeleton className="h-3 w-20 mb-3" />
                    <Skeleton className="h-9 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <MetricCard
                  title="Properties"
                  value={properties?.length || 0}
                  subtitle={`${properties?.filter(p => p.status === 'active').length || 0} active`}
                  icon={Building}
                  trend="neutral"
                  to="/properties"
                  accentColor="border-l-[hsl(var(--primary))]"
                  iconColor="text-[hsl(var(--primary))]"
                />
                <MetricCard
                  title="Total Units"
                  value={unitStats?.total || 0}
                  subtitle={`${unitStats?.occupancyRate || 0}% occupancy`}
                  icon={DoorOpen}
                  trend="up"
                  to="/units"
                  accentColor="border-l-[hsl(var(--accent))]"
                  iconColor="text-[hsl(var(--accent))]"
                />
                <MetricCard
                  title="Open Issues"
                  value={openIssues?.length || 0}
                  subtitle={`${openIssues?.filter(i => i.severity === 'severe').length || 0} need attention`}
                  icon={AlertTriangle}
                  to="/issues"
                  accentColor="border-l-[hsl(var(--destructive))]"
                  iconColor="text-[hsl(var(--destructive))]"
                />
                <MetricCard
                  title="Compliance"
                  value={`${complianceRate}%`}
                  subtitle="Resolution rate"
                  icon={CheckCircle2}
                  trend={complianceRate >= 90 ? 'up' : 'neutral'}
                  to="/inspections/history"
                  accentColor="border-l-[hsl(var(--success))]"
                  iconColor="text-[hsl(var(--success))]"
                />
              </>
            )}
          </div>

          {/* ── YOUR ATTENTION ─────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className={cn(
                'h-6 w-6 rounded-md flex items-center justify-center',
                dashboardAllClear ? 'bg-[hsl(var(--success)/0.1)]' : attentionItems.some(i => i.urgency === 'red') ? 'bg-destructive/10' : 'bg-warning/10'
              )}>
                <Bell className={cn('h-3.5 w-3.5',
                  dashboardAllClear ? 'text-[hsl(var(--success))]' :
                  attentionItems.some(i => i.urgency === 'red') ? 'text-destructive' : 'text-warning'
                )} />
              </div>
              <span className="text-sm font-semibold">Your Attention</span>
              {!dashboardAllClear && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1',
                  attentionItems.some(i => i.urgency === 'red')
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                )}>
                  {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {dashboardAllClear ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                <CheckCircle2 className="h-4 w-4" />
                You're all caught up — nothing needs your attention right now.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {attentionItems.map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-colors',
                      item.urgency === 'red'   && 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10',
                      item.urgency === 'amber' && 'border-warning/20 bg-warning/5 hover:bg-warning/10',
                      item.urgency === 'blue'  && 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10',
                    )}
                  >
                    {item.urgency === 'blue'  && <MessageCircle className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    {item.urgency === 'red'   && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    {item.urgency === 'amber' && <Clock className="h-3.5 w-3.5 text-warning shrink-0" />}
                    <div>
                      <span className={cn(
                        'text-xs font-semibold block leading-tight',
                        item.urgency === 'red'   && 'text-destructive',
                        item.urgency === 'amber' && 'text-warning',
                        item.urgency === 'blue'  && 'text-blue-400',
                      )}>{item.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-none">{item.sub}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Task Workspace ─────────────────────────────────────────────── */}
          <div className="grid gap-8 lg:grid-cols-2">
            <MyTasksSection
              tasks={myTasks}
              isLoading={tasksLoading}
              showCompleted={showCompletedTasks}
              onToggleCompleted={() => setShowCompletedTasks(v => !v)}
              onNavigateToProject={(projectId) => navigate(`/projects/${projectId}`)}
            />
            <AssignedByMeSection
              tasks={assignedByMeTasks}
              isLoading={assignedLoading}
              onNavigateToProject={(projectId) => navigate(`/projects/${projectId}`)}
            />
          </div>

          {/* ── Operations (Active Modules) ───────────────────────────────── */}
          {hasAnyModule && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold tracking-tight text-foreground">Operations</h2>

              <div className={cn(
                "grid gap-4",
                hasNspire && hasDailyGrounds && hasProjects ? "lg:grid-cols-3" :
                (hasNspire && hasDailyGrounds) || (hasNspire && hasProjects) || (hasDailyGrounds && hasProjects) ? "lg:grid-cols-2" :
                "lg:grid-cols-1 max-w-xl"
              )}>
                {/* Daily Grounds */}
                {hasDailyGrounds && (
                  <ModuleCommandCard
                    title="Daily Grounds"
                    icon={TreePine}
                    to="/inspections/daily"
                    accentClass="border-l-emerald-500"
                    statusBadge={`${properties?.filter(p => p.daily_grounds_enabled).length || 0} properties`}
                    stats={[
                      { label: 'Properties active', value: properties?.filter(p => p.daily_grounds_enabled).length || 0 },
                    ]}
                    actions={[
                      { label: "Start inspection", to: "/inspections/daily", icon: Calendar },
                    ]}
                  />
                )}

                {/* NSPIRE Compliance */}
                {hasNspire && (
                  <ModuleCommandCard
                    title="NSPIRE Compliance"
                    icon={ClipboardCheck}
                    to="/inspections"
                    accentClass="border-l-[hsl(var(--module-inspections))]"
                    statusBadge={`${(defectStats?.severe || 0) + (defectStats?.moderate || 0) + (defectStats?.low || 0)} open`}
                    stats={[
                      { label: 'Resolved', value: defectStats?.resolved || 0 },
                      { label: 'Open', value: (defectStats?.severe || 0) + (defectStats?.moderate || 0) + (defectStats?.low || 0) },
                      { label: 'Urgent', value: defectStats?.severe || 0 },
                    ]}
                    actions={[
                      { label: "View inspections", to: "/inspections" },
                    ]}
                  >
                    {urgentDefects && urgentDefects.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Requires immediate attention
                        </p>
                        {urgentDefects.slice(0, 2).map((defect) => {
                          const deadline = new Date(defect.repair_deadline);
                          const now = new Date();
                          const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
                          return (
                            <UrgentItem
                              key={defect.id}
                              title={defect.item_name}
                              subtitle={defect.inspection?.property?.name || 'Unknown property'}
                              timeRemaining={hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Overdue'}
                              severity="severe"
                            />
                          );
                        })}
                      </div>
                    )}
                  </ModuleCommandCard>
                )}

                {/* Projects */}
                {hasProjects && (
                  <ModuleCommandCard
                    title="Projects"
                    icon={FolderKanban}
                    to="/projects"
                    accentClass="border-l-[hsl(var(--module-projects))]"
                    statusBadge={`${projectStats?.active || 0} active`}
                    stats={[
                      { label: 'Active', value: projectStats?.active || 0 },
                      { label: 'Planning', value: projectStats?.planning || 0 },
                      { label: 'Budget', value: projectStats ? formatCurrency(projectStats.totalBudget) : '$0' },
                    ]}
                    actions={[
                      { label: "Daily report", to: "/projects", icon: FileText },
                    ]}
                  />
                )}
              </div>
            </div>
          )}

          {/* No modules state */}
          {!hasAnyModule && (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No modules activated</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Enable modules in Settings to start managing inspections, projects, and more.
                </p>
                <Button asChild>
                  <Link to="/settings">
                    Go to Settings
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Action Required (Notifications) ──────────────────────────── */}
          {actionNotifications.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AtSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Action Required</h2>
                    <p className="text-xs text-muted-foreground">
                      {unreadActionCount > 0 
                        ? `${unreadActionCount} new · ${actionNotifications.length} total this week`
                        : `${actionNotifications.length} item${actionNotifications.length !== 1 ? 's' : ''} this week`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {actionNotifications.slice(0, 5).map((n) => (
                  <Link
                    key={n.id}
                    to={n.entity_type === 'project' && n.entity_id ? `/projects/${n.entity_id}` : '#'}
                    onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl bg-card border hover:shadow-md transition-all group",
                      !n.is_read ? "border-primary/30 bg-primary/5" : "border-border/50"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      !n.is_read ? "bg-primary/15" : "bg-muted/50"
                    )}>
                      {n.type === 'mention' ? (
                        <AtSign className={cn("h-4 w-4", !n.is_read ? "text-primary" : "text-muted-foreground")} />
                      ) : (
                        <MessageSquare className={cn("h-4 w-4", !n.is_read ? "text-primary" : "text-muted-foreground")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !n.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>}
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Portfolio Utility Costs (only shown when 2+ properties have data) ── */}
          {allPropertiesUtility && allPropertiesUtility.length >= 2 && (() => {
            const maxCost = Math.max(...allPropertiesUtility.map(p => p.ytd_total), 1);
            return (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">YTD Utility Costs by Property</h2>
                  <p className="text-xs text-muted-foreground">Which property is costing the most to operate this year?</p>
                </div>
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    {allPropertiesUtility.map((prop) => (
                      <div key={prop.property_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <button
                            type="button"
                            className="font-medium hover:text-primary transition-colors text-left truncate max-w-[55%]"
                            onClick={() => navigate(`/properties/${prop.property_id}/analytics`)}
                          >
                            {prop.property_name}
                          </button>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-semibold">
                              ${prop.ytd_total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                            {prop.cost_per_unit != null && (
                              <span className="text-xs text-muted-foreground">
                                ${prop.cost_per_unit.toFixed(0)}/unit
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                              onClick={() => navigate(`/properties/${prop.property_id}/analytics`)}
                            >
                              Details →
                            </Button>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(prop.ytd_total / maxCost) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* ── Recent Issues ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Recent Issues</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" asChild>
                <Link to="/issues">View All</Link>
              </Button>
            </div>

            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                {loadingIssues ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : issues && issues.length > 0 ? (
                  <div className="divide-y divide-border/40">
                    {issues.slice(0, 5).map((issue) => {
                      const statusBadge = issueStatusBadge(issue.status);
                      return (
                        <Link 
                          key={issue.id}
                          to="/issues"
                          className={cn(
                            "flex items-center justify-between px-5 py-4",
                            "border-l-4",
                            issueSeverityBorder(issue.severity),
                            "hover:bg-muted/20 transition-colors group"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <SeverityBadge severity={issue.severity} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{issue.title}</p>
                              <p className="text-xs text-muted-foreground">{issue.property?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                              {issue.source_module === 'daily_grounds' ? 'GROUNDS' : issue.source_module?.toUpperCase()}
                            </span>
                            {statusBadge && (
                              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusBadge.cls)}>
                                {statusBadge.label}
                              </span>
                            )}
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14">
                    <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--success)/0.1)] flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
                    </div>
                    <p className="font-medium text-sm">All clear</p>
                    <p className="text-xs text-muted-foreground mt-1">No issues to report</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
