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

export default function Dashboard() {
  const { isModuleEnabled } = useModules();

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
        <StatCard
          title="Properties"
          value={12}
          subtitle="3 require attention"
          icon={Building}
        />
        <StatCard
          title="Total Units"
          value={847}
          subtitle="94% occupancy"
          icon={DoorOpen}
        />
        <StatCard
          title="Open Issues"
          value={23}
          subtitle="8 due this week"
          icon={AlertTriangle}
          variant="moderate"
        />
        <StatCard
          title="Compliance Rate"
          value="96%"
          subtitle="Annual target: 98%"
          icon={CheckCircle2}
          variant="success"
        />
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
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>

              {/* Critical Defects */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-severity-severe" />
                  Urgent Repairs Required
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity="severe" />
                      <div>
                        <p className="text-sm font-medium">GFCI Not Functioning</p>
                        <p className="text-xs text-muted-foreground">Unit 204 • Oak Ridge Apts</p>
                      </div>
                    </div>
                    <span className="text-xs text-destructive font-medium">Due in 6h</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity="severe" />
                      <div>
                        <p className="text-sm font-medium">Smoke Detector Missing</p>
                        <p className="text-xs text-muted-foreground">Unit 112 • Maple Commons</p>
                      </div>
                    </div>
                    <span className="text-xs text-destructive font-medium">Due in 18h</span>
                  </div>
                </div>
              </div>

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
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Planning</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">$2.4M</p>
                  <p className="text-xs text-muted-foreground">Budget</p>
                </div>
              </div>

              {/* Active Projects */}
              <div>
                <h4 className="text-sm font-medium mb-3">Active Projects</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">Roof Replacement</p>
                      <p className="text-xs text-muted-foreground">Oak Ridge Apts • Phase 2</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-3/4 bg-module-projects rounded-full" />
                      </div>
                      <span className="text-xs text-muted-foreground">75%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">HVAC Upgrade</p>
                      <p className="text-xs text-muted-foreground">Maple Commons • All Units</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-1/3 bg-module-projects rounded-full" />
                      </div>
                      <span className="text-xs text-muted-foreground">33%</span>
                    </div>
                  </div>
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
          <div className="space-y-3">
            {[
              { title: 'Blocked emergency exit', area: 'inside' as const, severity: 'severe' as const, source: 'NSPIRE', property: 'Oak Ridge Apts' },
              { title: 'Water heater leaking', area: 'unit' as const, severity: 'moderate' as const, source: 'NSPIRE', property: 'Maple Commons' },
              { title: 'Parking lot drainage issue', area: 'outside' as const, severity: 'moderate' as const, source: 'Core', property: 'Pine View' },
              { title: 'Elevator inspection overdue', area: 'inside' as const, severity: 'low' as const, source: 'Core', property: 'Cedar Heights' },
            ].map((issue, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <SeverityBadge severity={issue.severity} />
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-sm text-muted-foreground">{issue.property}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AreaBadge area={issue.area} />
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                    {issue.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
