import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Building2, Briefcase, Calendar, DollarSign, Edit, FolderKanban,
  TrendingUp, Clock, MessageSquareText, Activity, CheckSquare, FileText,
  AlertCircle, ShieldCheck, Package, BarChart3, Award, Send, Layers,
  CalendarDays, ClipboardList, Wallet, ListChecks, PenSquare, FileBarChart2,
  MoreHorizontal, Archive, Trash2,
} from 'lucide-react';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useUpdateProject } from '@/hooks/useProjects';
import { DiscussionPanel } from '@/components/projects/DiscussionPanel';
import { ActivityFeedPanel } from '@/components/projects/ActivityFeedPanel';
import { ActionItemsPanel } from '@/components/projects/ActionItemsPanel';
import { ReportGeneratorDialog } from '@/components/projects/ReportGeneratorDialog';

import { useProject } from '@/hooks/useProjects';
import { useMilestonesByProject } from '@/hooks/useMilestones';
import { useDailyReportsByProject } from '@/hooks/useDailyReports';
import { useChangeOrdersByProject } from '@/hooks/useChangeOrders';
import { useRFIStats } from '@/hooks/useRFIs';
import { usePunchItemStats } from '@/hooks/usePunchItems';
import { useActionItemsByProject } from '@/hooks/useActionItems';
import { MilestoneTimeline } from '@/components/projects/MilestoneTimeline';
import { GanttChart } from '@/components/projects/GanttChart';
import { DailyReportsList } from '@/components/projects/DailyReportsList';
import { ChangeOrdersList } from '@/components/projects/ChangeOrdersList';
import { ProjectFinancials } from '@/components/projects/ProjectFinancials';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { RFIList } from '@/components/projects/RFIList';
import { PunchListTab } from '@/components/projects/PunchListTab';
import { ProposalList } from '@/components/proposals/ProposalList';
import { SubmittalsTab } from '@/components/projects/SubmittalsTab';
import { SafetyTab } from '@/components/projects/SafetyTab';
import { ProcurementTab } from '@/components/projects/ProcurementTab';
import { ProgressTab } from '@/components/projects/ProgressTab';
import { CloseoutTab } from '@/components/projects/CloseoutTab';
import { MeetingsTab } from '@/components/projects/MeetingsTab';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; class: string; dot: string }> = {
  planning:  { label: 'Planning',   class: 'bg-blue-500/10 text-blue-600 border-blue-500/20',   dot: 'bg-blue-500' },
  active:    { label: 'Active',     class: 'bg-success/10 text-success border-success/20',       dot: 'bg-success' },
  on_hold:   { label: 'On Hold',    class: 'bg-warning/10 text-warning border-warning/20',       dot: 'bg-warning' },
  completed: { label: 'Completed',  class: 'bg-muted text-muted-foreground border-border',       dot: 'bg-muted-foreground' },
  closed:    { label: 'Closed',     class: 'bg-muted text-muted-foreground border-border',       dot: 'bg-muted-foreground' },
};

// Lifecycle-ordered tabs
const TABS = [
  { value: 'overview',    label: 'Overview',    icon: Layers },
  { value: 'schedule',    label: 'Schedule',    icon: CalendarDays },
  { value: 'daily-logs',  label: 'Daily Logs',  icon: ClipboardList },
  { value: 'financials',  label: 'Financials',  icon: Wallet },
  { value: 'rfis',        label: 'RFIs',        icon: AlertCircle,   badge: true, badgeKey: 'rfi' },
  { value: 'submittals',  label: 'Submittals',  icon: FileText },
  { value: 'punch-list',  label: 'Punch List',  icon: ListChecks,    badge: true, badgeKey: 'punch' },
  { value: 'progress',    label: 'Progress',    icon: BarChart3 },
  { value: 'procurement', label: 'Procurement', icon: Package },
  { value: 'safety',      label: 'Safety',      icon: ShieldCheck },
  { value: 'meetings',    label: 'Meetings',    icon: MessageSquareText },
  { value: 'closeout',    label: 'Closeout',    icon: Award },
  { value: 'proposals',   label: 'Proposals',   icon: Send },
] as const;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discussionsPanelOpen, setDiscussionsPanelOpen] = useState(false);
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);
  const [actionItemsOpen, setActionItemsOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: project, isLoading: projectLoading } = useProject(id ?? null);
  const { data: milestones } = useMilestonesByProject(id ?? null);
  const { data: dailyReports } = useDailyReportsByProject(id ?? null);
  const { data: changeOrders } = useChangeOrdersByProject(id ?? null);
  const { data: rfiStats } = useRFIStats(id ?? null);
  const { data: punchStats } = usePunchItemStats(id ?? null);
  const { data: actionItems = [] } = useActionItemsByProject(id ?? null);
  const openTaskCount = actionItems.filter(i => i.status !== 'done' && i.status !== 'cancelled').length;
  const { isAdmin } = useUserPermissions();
  const updateProject = useUpdateProject();

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/projects')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Projects</Button>
        </div>
      </div>
    );
  }

  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const spentProgress = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const daysRemaining = project.target_end_date ? differenceInDays(new Date(project.target_end_date), new Date()) : null;
  const approvedCOAmount = changeOrders?.filter(co => co.status === 'approved').reduce((sum, co) => sum + (Number(co.amount) || 0), 0) || 0;
  const status = statusConfig[project.status] ?? statusConfig.planning;
  const isClientProject = (project as any).project_type === 'client';

  const getBadgeCount = (key: string) => {
    if (key === 'rfi') return rfiStats?.open ?? 0;
    if (key === 'punch') return (punchStats?.open ?? 0) + (punchStats?.inProgress ?? 0);
    return 0;
  };

  return (
    <div className="relative flex flex-col md:flex-row md:h-[calc(100vh-3.5rem)] md:overflow-hidden">
      <div className="flex-1 md:overflow-auto min-w-0">
        {/* ── Hero Header ── */}
        <div className="relative border-b bg-gradient-to-br from-background via-background to-module-projects/5 px-6 pt-4 pb-6">
          {/* Purple accent glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-module-projects/8 blur-3xl" />
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-4 -ml-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Projects
          </Button>

          <div className="flex items-start justify-between gap-4 relative">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-module-projects flex items-center justify-center shadow-lg shadow-module-projects/20 shrink-0">
                <FolderKanban className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5">{project.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status pill with pulsing dot */}
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', status.class)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                    {status.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground bg-muted/50">
                    {isClientProject ? <Briefcase className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {isClientProject
                      ? ((project as any).client?.name || 'Standalone Client')
                      : (project.property?.name || 'No Property')}
                  </span>
                  {project.start_date && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground bg-muted/50">
                      <Calendar className="h-3 w-3" />
                      Started {format(new Date(project.start_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={activityFeedOpen ? 'secondary' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setActivityFeedOpen(!activityFeedOpen);
                  if (discussionsPanelOpen) setDiscussionsPanelOpen(false);
                  if (actionItemsOpen) setActionItemsOpen(false);
                }}
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </Button>
              <Button
                variant={discussionsPanelOpen ? 'secondary' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setDiscussionsPanelOpen(!discussionsPanelOpen);
                  if (activityFeedOpen) setActivityFeedOpen(false);
                  if (actionItemsOpen) setActionItemsOpen(false);
                }}
              >
                <MessageSquareText className="h-4 w-4" />
                <span className="hidden sm:inline">Discuss</span>
              </Button>
              <Button
                variant={actionItemsOpen ? 'secondary' : 'outline'}
                size="sm"
                className="gap-1.5 relative"
                onClick={() => {
                  setActionItemsOpen(!actionItemsOpen);
                  if (activityFeedOpen) setActivityFeedOpen(false);
                  if (discussionsPanelOpen) setDiscussionsPanelOpen(false);
                }}
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
                {openTaskCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold shadow-sm">
                    {openTaskCount > 9 ? '9+' : openTaskCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setReportDialogOpen(true)}
              >
                <FileBarChart2 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </Button>
              <Button size="sm" className="gap-1.5 bg-module-projects hover:bg-module-projects/90 text-white shadow-sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateProject.mutate({ id: project.id, status: 'closed' })}>
                    <Archive className="h-4 w-4 mr-2" />Archive Project
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />Delete Project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {/* Budget */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Budget</p>
                    <p className="text-xl font-bold leading-none mt-0.5">{formatCurrency(budget)}</p>
                  </div>
                </div>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                  spentProgress > 90 ? 'bg-destructive/10 text-destructive' :
                  spentProgress > 70 ? 'bg-warning/10 text-warning' :
                  'bg-success/10 text-success'
                )}>{spentProgress}%</span>
              </div>
              <div>
                <Progress value={spentProgress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(spent)} spent</p>
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Progress</p>
                    <p className="text-xl font-bold leading-none mt-0.5">{milestoneProgress}%</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{completedMilestones}/{totalMilestones}</span>
              </div>
              <div>
                <Progress value={milestoneProgress} className="h-1.5 [&>div]:bg-success" />
                <p className="text-[10px] text-muted-foreground mt-1">milestones complete</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center',
                  daysRemaining !== null && daysRemaining < 0 ? 'bg-destructive/10' :
                  daysRemaining !== null && daysRemaining < 14 ? 'bg-warning/10' : 'bg-warning/10'
                )}>
                  <Clock className={cn('h-4 w-4',
                    daysRemaining !== null && daysRemaining < 0 ? 'text-destructive' : 'text-warning'
                  )} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Timeline</p>
                  {daysRemaining !== null ? (
                    <p className={cn('text-xl font-bold leading-none mt-0.5',
                      daysRemaining < 0 ? 'text-destructive' :
                      daysRemaining < 14 ? 'text-warning' : ''
                    )}>
                      {daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)}d over`}
                    </p>
                  ) : (
                    <p className="text-xl font-bold leading-none mt-0.5 text-muted-foreground">No date</p>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {project.target_end_date ? `Target: ${format(new Date(project.target_end_date), 'MMM d, yyyy')}` : 'Set a target end date'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab Section ── */}
        <div className="px-6 pt-4 pb-8 space-y-6 animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Custom tab bar — horizontally scrollable on mobile */}
            <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
              <div className="flex gap-1 min-w-max">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const badgeCount = (tab as any).badge ? getBadgeCount((tab as any).badgeKey) : 0;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                        isActive
                          ? 'bg-module-projects text-white shadow-sm shadow-module-projects/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {tab.label}
                      {badgeCount > 0 && (
                        <span className={cn(
                          'ml-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          isActive ? 'bg-white/25 text-white' : 'bg-destructive text-white'
                        )}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab contents */}
            <TabsContent value="overview" className="space-y-6 mt-2">
              <GanttChart milestones={milestones || []} projectStart={project.start_date} projectEnd={project.target_end_date} />

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Scope of Work */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-module-projects/10 flex items-center justify-center">
                      <PenSquare className="h-3.5 w-3.5 text-module-projects" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Scope of Work</h3>
                      <p className="text-[10px] text-muted-foreground">Project description & scope</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-1">
                    {project.description && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Description</p>
                        <p className="text-sm text-foreground/80 leading-relaxed">{project.description}</p>
                      </div>
                    )}
                    {project.scope && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Scope Details</p>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.scope}</p>
                      </div>
                    )}
                    {!project.description && !project.scope && (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">No scope defined yet.</p>
                    )}
                  </div>
                </div>

                {/* Key Dates */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                      <CalendarDays className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Key Dates</h3>
                      <p className="text-[10px] text-muted-foreground">Project timeline</p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    {[
                      { label: 'Start Date', value: project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set' },
                      { label: 'Target End', value: project.target_end_date ? format(new Date(project.target_end_date), 'MMM d, yyyy') : 'Not set' },
                      { label: 'Actual End', value: project.actual_end_date ? format(new Date(project.actual_end_date), 'MMM d, yyyy') : 'In progress' },
                      { label: 'Created', value: format(new Date(project.created_at), 'MMM d, yyyy') },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                  { label: 'Milestones', value: totalMilestones, icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Daily Reports', value: dailyReports?.length || 0, icon: ClipboardList, color: 'text-module-projects', bg: 'bg-module-projects/10' },
                  { label: 'Change Orders', value: changeOrders?.length || 0, icon: FileText, color: 'text-warning', bg: 'bg-warning/10' },
                  { label: 'Approved COs', value: formatCurrency(approvedCOAmount), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
                      <Icon className={cn('h-4.5 w-4.5', color)} />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-none">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schedule"><MilestoneTimeline projectId={id!} milestones={milestones || []} /></TabsContent>
            <TabsContent value="daily-logs"><DailyReportsList projectId={id!} reports={dailyReports || []} /></TabsContent>
            <TabsContent value="financials"><ProjectFinancials project={project} changeOrders={changeOrders || []} /></TabsContent>
            <TabsContent value="rfis"><RFIList projectId={id!} /></TabsContent>
            <TabsContent value="submittals"><SubmittalsTab projectId={id!} /></TabsContent>
            <TabsContent value="punch-list"><PunchListTab projectId={id!} /></TabsContent>
            <TabsContent value="progress"><ProgressTab projectId={id!} /></TabsContent>
            <TabsContent value="procurement"><ProcurementTab projectId={id!} /></TabsContent>
            <TabsContent value="safety"><SafetyTab projectId={id!} /></TabsContent>
            <TabsContent value="meetings"><MeetingsTab projectId={id!} /></TabsContent>
            <TabsContent value="closeout"><CloseoutTab projectId={id!} /></TabsContent>
            <TabsContent value="proposals"><ProposalList projectId={id!} /></TabsContent>
          </Tabs>
        </div>

        <ProjectDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} project={project} />
        <ReportGeneratorDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          projectId={id!}
          projectName={project.name}
        />
      </div>

      {/* Overlay panels — slide in from right, sit OVER content (no pushing) */}
      <AnimatePresence>
        {activityFeedOpen && id && (
          <motion.div
            key="activity"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute right-0 top-0 h-full w-[390px] z-20 shadow-2xl"
          >
            <ActivityFeedPanel projectId={id} open={activityFeedOpen} onClose={() => setActivityFeedOpen(false)} />
          </motion.div>
        )}
        {discussionsPanelOpen && id && (
          <motion.div
            key="discussion"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute right-0 top-0 h-full w-[420px] z-20 shadow-2xl"
          >
            <DiscussionPanel projectId={id} open={discussionsPanelOpen} onClose={() => setDiscussionsPanelOpen(false)} />
          </motion.div>
        )}
        {actionItemsOpen && id && (
          <motion.div
            key="action-items"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute right-0 top-0 h-full w-[420px] z-20 shadow-2xl"
          >
            <ActionItemsPanel projectId={id} open={actionItemsOpen} onClose={() => setActionItemsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete dialog */}
      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectId={project.id}
        projectName={project.name}
        navigateAfter
      />
    </div>
  );
}

