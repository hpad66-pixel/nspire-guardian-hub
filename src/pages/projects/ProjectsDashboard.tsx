import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FolderKanban, 
  Plus, 
  Calendar,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useProjects, useProjectStats } from '@/hooks/useProjects';
import { usePendingChangeOrders, useChangeOrderStats } from '@/hooks/useChangeOrders';
import { useUpcomingMilestones } from '@/hooks/useMilestones';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/usePermissions';

export default function ProjectsDashboard() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: projects, isLoading } = useProjects();
  const { data: stats } = useProjectStats();
  const { data: pendingChangeOrders } = usePendingChangeOrders();
  const { data: changeOrderStats } = useChangeOrderStats();
  const { data: upcomingMilestones } = useUpcomingMilestones(7);
  const { canCreate } = useUserPermissions();
  const canCreateProjects = canCreate('projects');

  const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'planning');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          </div>
          <p className="text-muted-foreground">
            Capital improvements, renovations, and construction project management
          </p>
        </div>
        {canCreateProjects && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={stats?.active || 0}
          subtitle={`${stats?.planning || 0} in planning`}
          icon={FolderKanban}
        />
        <StatCard
          title="Total Budget"
          value={stats ? formatCurrency(stats.totalBudget) : '$0'}
          subtitle={stats ? `${formatCurrency(stats.totalSpent)} spent` : '$0 spent'}
          icon={DollarSign}
        />
        <StatCard
          title="On Schedule"
          value={stats?.active || 0}
          subtitle={`${stats?.onHold || 0} on hold`}
          icon={Calendar}
          variant="success"
        />
        <StatCard
          title="Open Change Orders"
          value={changeOrderStats?.pendingCount || 0}
          subtitle={changeOrderStats ? formatCurrency(changeOrderStats.pendingAmount) + ' pending' : '$0 pending'}
          icon={FileText}
          variant="moderate"
        />
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>Currently in progress</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : activeProjects && activeProjects.length > 0 ? (
            <div className="space-y-4">
              {activeProjects.map((project) => {
                const progress = project.budget && project.spent 
                  ? Math.round((Number(project.spent) / Number(project.budget)) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={project.id} 
                    className="p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{project.name}</h4>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status === 'active' ? 'Active' : project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.property?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {project.spent ? formatCurrency(Number(project.spent)) : '$0'} / {project.budget ? formatCurrency(Number(project.budget)) : '$0'}
                        </p>
                        {project.target_end_date && (
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(project.target_end_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      {project.milestones && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">{project.milestones.length} milestones</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active projects</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Daily Reports</h3>
                <p className="text-sm text-muted-foreground">Submit field reports</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Change Orders</h3>
                <p className="text-sm text-muted-foreground">
                  {changeOrderStats?.pendingCount || 0} pending approval
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Milestones</h3>
                <p className="text-sm text-muted-foreground">
                  {upcomingMilestones?.length || 0} due this week
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {canCreateProjects && (
        <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </div>
  );
}
