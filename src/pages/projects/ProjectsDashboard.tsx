import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FolderKanban, 
  Plus, 
  Calendar,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectsDashboard() {
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={8}
          subtitle="Across 5 properties"
          icon={FolderKanban}
        />
        <StatCard
          title="Total Budget"
          value="$2.4M"
          subtitle="$1.8M spent"
          icon={DollarSign}
        />
        <StatCard
          title="On Schedule"
          value="6"
          subtitle="2 delayed"
          icon={Calendar}
          variant="success"
        />
        <StatCard
          title="Open Change Orders"
          value={5}
          subtitle="$124K pending"
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
          <div className="space-y-4">
            {[
              { 
                name: 'Roof Replacement - Phase 2', 
                property: 'Oak Ridge Apartments', 
                status: 'active',
                progress: 75,
                budget: '$450,000',
                spent: '$337,500',
                dueDate: '2024-03-15',
                team: 4,
                issues: 1,
              },
              { 
                name: 'HVAC System Upgrade', 
                property: 'Maple Commons', 
                status: 'active',
                progress: 33,
                budget: '$680,000',
                spent: '$224,400',
                dueDate: '2024-05-20',
                team: 6,
                issues: 0,
              },
              { 
                name: 'Parking Lot Resurfacing', 
                property: 'Pine View Residences', 
                status: 'on_hold',
                progress: 45,
                budget: '$185,000',
                spent: '$83,250',
                dueDate: '2024-04-01',
                team: 3,
                issues: 2,
              },
              { 
                name: 'Common Area Renovation', 
                property: 'Cedar Heights', 
                status: 'active',
                progress: 90,
                budget: '$120,000',
                spent: '$108,000',
                dueDate: '2024-02-10',
                team: 2,
                issues: 0,
              },
            ].map((project, i) => (
              <div key={i} className="p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{project.name}</h4>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status === 'active' ? 'Active' : 'On Hold'}
                      </Badge>
                      {project.issues > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {project.issues}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{project.property}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{project.spent} / {project.budget}</p>
                    <p className="text-xs text-muted-foreground">Due {project.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">{project.team}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <p className="text-sm text-muted-foreground">5 pending approval</p>
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
                <p className="text-sm text-muted-foreground">3 due this week</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
