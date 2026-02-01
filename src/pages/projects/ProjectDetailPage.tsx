import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Edit,
  FolderKanban,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useMilestonesByProject } from '@/hooks/useMilestones';
import { useDailyReportsByProject } from '@/hooks/useDailyReports';
import { useChangeOrdersByProject } from '@/hooks/useChangeOrders';
import { useRFIStats } from '@/hooks/useRFIs';
import { usePunchItemStats } from '@/hooks/usePunchItems';
import { MilestoneTimeline } from '@/components/projects/MilestoneTimeline';
import { DailyReportsList } from '@/components/projects/DailyReportsList';
import { ChangeOrdersList } from '@/components/projects/ChangeOrdersList';
import { ProjectFinancials } from '@/components/projects/ProjectFinancials';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { RFIList } from '@/components/projects/RFIList';
import { PunchListTab } from '@/components/projects/PunchListTab';
import { ProposalList } from '@/components/proposals/ProposalList';
import { useAuth } from '@/hooks/useAuth';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  on_hold: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  completed: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  closed: 'Closed',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id ?? null);
  const { data: milestones } = useMilestonesByProject(id ?? null);
  const { data: dailyReports } = useDailyReportsByProject(id ?? null);
  const { data: changeOrders } = useChangeOrdersByProject(id ?? null);
  const { data: rfiStats } = useRFIStats(id ?? null);
  const { data: punchStats } = usePunchItemStats(id ?? null);

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
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

  const daysRemaining = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null;

  const approvedCOAmount = changeOrders
    ?.filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (Number(co.amount) || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{project.property?.name}</span>
                <Badge variant="outline" className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(budget)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(spent)} spent ({spentProgress}%)
                </p>
              </div>
            </div>
            <Progress value={spentProgress} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{milestoneProgress}%</p>
                <p className="text-xs text-muted-foreground">
                  {completedMilestones} of {totalMilestones} milestones
                </p>
              </div>
            </div>
            <Progress value={milestoneProgress} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Timeline</p>
                {daysRemaining !== null ? (
                  <>
                    <p className="text-2xl font-bold">
                      {daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? 'Due Today' : 'Overdue'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {format(new Date(project.target_end_date!), 'MMM d, yyyy')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">No deadline</p>
                    <p className="text-xs text-muted-foreground">Set a target end date</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="rfis" className="gap-1">
            RFIs
            {(rfiStats?.open ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {rfiStats?.open}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="punch-list" className="gap-1">
            Punch List
            {(punchStats?.open ?? 0) + (punchStats?.inProgress ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {(punchStats?.open ?? 0) + (punchStats?.inProgress ?? 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scope */}
            <Card>
              <CardHeader>
                <CardTitle>Scope of Work</CardTitle>
                <CardDescription>Project description and scope</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  )}
                  {project.scope && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Scope Details</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.scope}</p>
                    </div>
                  )}
                  {!project.description && !project.scope && (
                    <p className="text-sm text-muted-foreground italic">No scope defined yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Key Dates</CardTitle>
                <CardDescription>Project timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Start Date</span>
                    <span className="text-sm font-medium">
                      {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Target End Date</span>
                    <span className="text-sm font-medium">
                      {project.target_end_date ? format(new Date(project.target_end_date), 'MMM d, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Actual End Date</span>
                    <span className="text-sm font-medium">
                      {project.actual_end_date ? format(new Date(project.actual_end_date), 'MMM d, yyyy') : 'In progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium">
                      {format(new Date(project.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{totalMilestones}</p>
                <p className="text-sm text-muted-foreground">Milestones</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{dailyReports?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Daily Reports</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{changeOrders?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Change Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{formatCurrency(approvedCOAmount)}</p>
                <p className="text-sm text-muted-foreground">Approved COs</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <MilestoneTimeline projectId={id!} milestones={milestones || []} />
        </TabsContent>

        <TabsContent value="daily-logs">
          <DailyReportsList projectId={id!} reports={dailyReports || []} />
        </TabsContent>

        <TabsContent value="financials">
          <ProjectFinancials
            project={project}
            changeOrders={changeOrders || []}
          />
        </TabsContent>

        <TabsContent value="rfis">
          <RFIList projectId={id!} />
        </TabsContent>

        <TabsContent value="punch-list">
          <PunchListTab projectId={id!} />
        </TabsContent>

        <TabsContent value="proposals">
          <ProposalList projectId={id!} />
        </TabsContent>
      </Tabs>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />
    </div>
  );
}
