import { useState } from 'react';
import { useModules } from '@/contexts/ModuleContext';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { 
  Building, 
  DoorOpen, 
  AlertTriangle, 
  ClipboardCheck, 
  FolderKanban,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import { useUnitStats } from '@/hooks/useUnits';
import { useIssues } from '@/hooks/useIssues';
import { useDefectStats, useOpenDefects } from '@/hooks/useDefects';
import { useProjectStats } from '@/hooks/useProjects';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { isModuleEnabled } = useModules();
  
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const { data: unitStats } = useUnitStats();
  const { data: issues, isLoading: loadingIssues } = useIssues();
  const { data: defectStats } = useDefectStats();
  const { data: openDefects } = useOpenDefects();
  const { data: projectStats } = useProjectStats();

  const openIssues = issues?.filter(i => i.status !== 'resolved' && i.status !== 'verified');
  const urgentDefects = openDefects?.filter(d => d.severity === 'severe').slice(0, 2);

  // Calculate compliance rate (resolved issues / total issues)
  const complianceRate = issues && issues.length > 0 
    ? Math.round((issues.filter(i => i.status === 'resolved' || i.status === 'verified').length / issues.length) * 100)
    : 100;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's an overview of your property portfolio.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingProperties ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Properties"
              value={properties?.length || 0}
              subtitle={`${properties?.filter(p => p.nspire_enabled).length || 0} NSPIRE enabled`}
              icon={Building}
            />
            <StatCard
              title="Total Units"
              value={unitStats?.total || 0}
              subtitle={`${unitStats?.occupancyRate || 0}% occupancy`}
              icon={DoorOpen}
            />
            <StatCard
              title="Open Issues"
              value={openIssues?.length || 0}
              subtitle={`${openIssues?.filter(i => i.severity === 'severe').length || 0} severe`}
              icon={AlertTriangle}
              variant={openIssues && openIssues.length > 0 ? 'moderate' : undefined}
            />
            <StatCard
              title="Compliance Rate"
              value={`${complianceRate}%`}
              subtitle="Based on resolved issues"
              icon={CheckCircle2}
              variant={complianceRate >= 90 ? 'success' : 'moderate'}
            />
          </>
        )}
      </div>

      {/* Module Workspaces */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inspections Module */}
        {isModuleEnabled('nspireEnabled') && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-module-inspections flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>NSPIRE Inspections</CardTitle>
                  <CardDescription>Compliance & defect tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Inspection Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{defectStats?.resolved || 0}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{(defectStats?.severe || 0) + (defectStats?.moderate || 0) + (defectStats?.low || 0)}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{defectStats?.severe || 0}</p>
                  <p className="text-xs text-muted-foreground">Urgent</p>
                </div>
              </div>

              {/* Critical Defects */}
              {urgentDefects && urgentDefects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-severity-severe" />
                    Urgent Repairs Required
                  </h4>
                  <div className="space-y-2">
                    {urgentDefects.map((defect) => {
                      const deadline = new Date(defect.repair_deadline);
                      const now = new Date();
                      const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
                      
                      return (
                        <div key={defect.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <SeverityBadge severity="severe" />
                            <div>
                              <p className="text-sm font-medium">{defect.item_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {defect.inspection?.unit?.unit_number ? `Unit ${defect.inspection.unit.unit_number}` : ''} • {defect.inspection?.property?.name}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-destructive font-medium">
                            {hoursRemaining > 0 ? `Due in ${hoursRemaining}h` : 'Overdue'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/inspections">
                    View All Inspections
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Module */}
        {isModuleEnabled('projectsEnabled') && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>Capital improvements & renovations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Project Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{projectStats?.active || 0}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{projectStats?.planning || 0}</p>
                  <p className="text-xs text-muted-foreground">Planning</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">
                    {projectStats ? formatCurrency(projectStats.totalBudget) : '$0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Budget</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/projects">
                    View All Projects
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issues Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Issues</CardTitle>
              <CardDescription>Cross-module issue tracking</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/issues">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingIssues ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : issues && issues.length > 0 ? (
            <div className="space-y-3">
              {issues.slice(0, 5).map((issue) => (
                <div 
                  key={issue.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <SeverityBadge severity={issue.severity} />
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      <p className="text-sm text-muted-foreground">{issue.property?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {issue.area && <AreaBadge area={issue.area} />}
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                      {issue.source_module.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="font-medium">No issues</p>
              <p className="text-sm text-muted-foreground">Everything is running smoothly</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
