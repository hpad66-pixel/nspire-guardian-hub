import { useMemo, useEffect, useState } from 'react';
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
  CheckSquare,
  Circle,
  Check,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useProperties } from '@/hooks/useProperties';
import { useUnitsByProperty } from '@/hooks/useUnits';
import { useIssuesByProperty } from '@/hooks/useIssues';
import { useDefects, useOpenDefects } from '@/hooks/useDefects';
import { useProjectsByProperty } from '@/hooks/useProjects';
import { useNotifications, useMarkNotificationRead, type Notification } from '@/hooks/useNotifications';
import { useMyActionItems, useUpdateActionItem, type ActionItem } from '@/hooks/useActionItems';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Apple-inspired metric card
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className,
  to,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  to?: string;
}) {
  const content = (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card p-6 transition-all duration-300",
      "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
      "border border-border/50",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
              {subtitle}
            </p>
          )}
        </div>
        <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center transition-transform group-hover:scale-110">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}

// Module action card with gradient
function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  to, 
  gradient,
  stats,
  actions,
  children,
}: { 
  title: string; 
  description: string; 
  icon: React.ElementType;
  to: string;
  gradient: string;
  stats?: { label: string; value: string | number }[];
  actions?: { label: string; to: string }[];
  children?: React.ReactNode;
}) {
  return (
    <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-card">
      {/* Gradient header */}
      <Link to={to} className={cn("block p-6 pb-4", gradient)}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/80">{description}</p>
          </div>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="p-6 space-y-5">
        {/* Stats row */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Custom content */}
        {children}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-11 rounded-xl border-border/50 hover:bg-muted/50" 
            asChild
          >
            <Link to={to}>
              Open Module
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
  // Separate active from done
  const activeTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Overdue first
      const aOverdue = a.due_date && isPast(new Date(a.due_date + 'T00:00:00')) && !isToday(new Date(a.due_date + 'T00:00:00'));
      const bOverdue = b.due_date && isPast(new Date(b.due_date + 'T00:00:00')) && !isToday(new Date(b.due_date + 'T00:00:00'));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      // Then by due date
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      // Then priority
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
        <div className="rounded-2xl border border-dashed bg-card/50 py-10 flex flex-col items-center gap-2">
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
                  {/* Priority dot */}
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', pCfg.dot)} title={pCfg.label} />

                  {/* Main content */}
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

                  {/* Due date */}
                  {due && (
                    <span className={cn('text-xs shrink-0 flex items-center gap-1', due.cls)}>
                      <Clock className="h-3 w-3" />
                      {due.label}
                    </span>
                  )}

                  {/* Status pill */}
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0', sCfg.cls)}>
                    {sCfg.label}
                  </span>

                  {/* Arrow to project */}
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
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 transition-all hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <SeverityBadge severity={severity} />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <span className={cn(
        "text-xs font-medium px-2 py-1 rounded-md",
        severity === 'severe' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
      )}>
        {timeRemaining}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { isModuleEnabled } = useModules();
  const { shouldShowOnboarding } = useOnboarding();
  const navigate = useNavigate();
  
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const { data: units = [] } = useUnitsByProperty(selectedPropertyId || null);
  const { data: issues = [], isLoading: loadingIssues } = useIssuesByProperty(selectedPropertyId || null);
  const { data: defects = [] } = useDefects();
  const { data: openDefects = [] } = useOpenDefects();
  const { data: projects = [] } = useProjectsByProperty(selectedPropertyId || null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const { data: myTasks = [], isLoading: tasksLoading } = useMyActionItems();
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
    // Force reload to refresh data after onboarding
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
      total,
      occupied,
      vacant,
      maintenance,
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
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // Get current time greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Check which modules are enabled
  const hasNspire = isModuleEnabled('nspireEnabled');
  const hasDailyGrounds = isModuleEnabled('dailyGroundsEnabled');
  const hasProjects = isModuleEnabled('projectsEnabled');
  const hasAnyModule = hasNspire || hasDailyGrounds || hasProjects;

  return (
    <>
      {/* Onboarding Wizard Modal */}
      {shouldShowOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}
      
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-10 animate-fade-in">
        {/* Hero Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">{greeting}</h1>
            <p className="text-lg text-muted-foreground">
              Here's what's happening across your property portfolio today.
            </p>
          </div>
          <div className="w-full sm:w-[260px]">
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

        {/* Core Metrics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {loadingProperties ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-card p-6 border border-border/50">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-8 w-16 mb-2" />
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
              />
              <MetricCard
                title="Total Units"
                value={unitStats?.total || 0}
                subtitle={`${unitStats?.occupancyRate || 0}% occupancy`}
                icon={DoorOpen}
                trend="up"
                to="/units"
              />
              <MetricCard
                title="Open Issues"
                value={openIssues?.length || 0}
                subtitle={`${openIssues?.filter(i => i.severity === 'severe').length || 0} need attention`}
                icon={AlertTriangle}
                to="/issues"
              />
              <MetricCard
                title="Compliance"
                value={`${complianceRate}%`}
                subtitle="Resolution rate"
                icon={CheckCircle2}
                trend={complianceRate >= 90 ? 'up' : 'neutral'}
                to="/inspections/history"
              />
            </>
          )}
        </div>

        {/* ── My Tasks Section ── */}
        <MyTasksSection
          tasks={myTasks}
          isLoading={tasksLoading}
          showCompleted={showCompletedTasks}
          onToggleCompleted={() => setShowCompletedTasks(v => !v)}
          onNavigateToProject={(projectId) => navigate(`/projects/${projectId}`)}
        />

        {/* Active Modules Section */}
        {hasAnyModule && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Your Modules</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Quick access to your active workspaces
                </p>
              </div>
            </div>

            <div className={cn(
              "grid gap-6",
              hasNspire && hasDailyGrounds && hasProjects ? "lg:grid-cols-3" :
              (hasNspire && hasDailyGrounds) || (hasNspire && hasProjects) || (hasDailyGrounds && hasProjects) ? "lg:grid-cols-2" :
              "lg:grid-cols-1 max-w-xl"
            )}>
              {/* Daily Grounds Module */}
              {hasDailyGrounds && (
                <ModuleCard
                  title="Daily Grounds"
                  description="Exterior & asset inspections"
                  icon={TreePine}
                  to="/inspections/daily"
                  gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                  stats={[
                    { label: 'Today', value: new Date().toLocaleDateString('en-US', { weekday: 'short' }) },
                    { label: 'Properties', value: properties?.filter(p => p.daily_grounds_enabled).length || 0 },
                    { label: 'Assets', value: '—' },
                  ]}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" asChild>
                    <Link to="/inspections/daily">
                      <Calendar className="h-4 w-4 mr-2" />
                      Start today's inspection
                    </Link>
                  </Button>
                </ModuleCard>
              )}

              {/* NSPIRE Module */}
              {hasNspire && (
                <ModuleCard
                  title="NSPIRE Compliance"
                  description="HUD inspection standards"
                  icon={ClipboardCheck}
                  to="/inspections"
                  gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
                  stats={[
                    { label: 'Resolved', value: defectStats?.resolved || 0 },
                    { label: 'Open', value: (defectStats?.severe || 0) + (defectStats?.moderate || 0) + (defectStats?.low || 0) },
                    { label: 'Urgent', value: defectStats?.severe || 0 },
                  ]}
                >
                  {urgentDefects && urgentDefects.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
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
                </ModuleCard>
              )}

              {/* Projects Module */}
              {hasProjects && (
                <ModuleCard
                  title="Projects"
                  description="Capital improvements"
                  icon={FolderKanban}
                  to="/projects"
                  gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                  stats={[
                    { label: 'Active', value: projectStats?.active || 0 },
                    { label: 'Planning', value: projectStats?.planning || 0 },
                    { label: 'Budget', value: projectStats ? formatCurrency(projectStats.totalBudget) : '$0' },
                  ]}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" asChild>
                    <Link to="/projects">
                      <FileText className="h-4 w-4 mr-2" />
                      Submit daily report
                    </Link>
                  </Button>
                </ModuleCard>
              )}
            </div>
          </div>
        )}

        {/* No modules enabled state */}
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

        {/* Action Items — Discussion Mentions & Assignments */}
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

        {/* Recent Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Recent Issues</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cross-module issue tracking
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/issues">View All</Link>
            </Button>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              {loadingIssues ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : issues && issues.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {issues.slice(0, 5).map((issue) => (
                    <Link 
                      key={issue.id}
                      to="/issues"
                      className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <SeverityBadge severity={issue.severity} />
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-sm text-muted-foreground">{issue.property?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg bg-muted/50 font-medium">
                          {issue.source_module === 'daily_grounds' ? 'GROUNDS' : issue.source_module.toUpperCase()}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <p className="font-medium">All clear</p>
                  <p className="text-sm text-muted-foreground mt-1">No issues to report</p>
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
