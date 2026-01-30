import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Filter } from 'lucide-react';
import { IssueSource, InspectionArea, SeverityLevel } from '@/types/modules';

interface IssueItem {
  id: string;
  title: string;
  description: string;
  sourceModule: IssueSource;
  property: string;
  unit?: string;
  area?: InspectionArea;
  severity: SeverityLevel;
  deadline: string;
  status: 'open' | 'in_progress' | 'resolved';
  proofRequired: boolean;
}

export default function IssuesPage() {
  const issues: IssueItem[] = [
    { id: '1', title: 'Blocked emergency exit', description: 'Door not functioning properly', sourceModule: 'nspire', property: 'Oak Ridge Apts', area: 'inside', severity: 'severe', deadline: '2024-01-30', status: 'open', proofRequired: true },
    { id: '2', title: 'GFCI not functioning', description: 'Kitchen outlet needs replacement', sourceModule: 'nspire', property: 'Oak Ridge Apts', unit: 'Unit 204', area: 'unit', severity: 'severe', deadline: '2024-01-30', status: 'open', proofRequired: true },
    { id: '3', title: 'Water heater leaking', description: 'Minor leak detected at base', sourceModule: 'nspire', property: 'Maple Commons', unit: 'Unit 305', area: 'unit', severity: 'moderate', deadline: '2024-02-28', status: 'in_progress', proofRequired: false },
    { id: '4', title: 'Parking lot drainage issue', description: 'Standing water after rain', sourceModule: 'core', property: 'Pine View', area: 'outside', severity: 'moderate', deadline: '2024-02-28', status: 'open', proofRequired: false },
    { id: '5', title: 'Elevator inspection overdue', description: 'Annual inspection needed', sourceModule: 'core', property: 'Cedar Heights', area: 'inside', severity: 'low', deadline: '2024-03-30', status: 'open', proofRequired: false },
    { id: '6', title: 'Roof repair needed', description: 'Related to renovation project', sourceModule: 'projects', property: 'Oak Ridge Apts', severity: 'moderate', deadline: '2024-02-15', status: 'in_progress', proofRequired: false },
  ];

  const sourceLabels: Record<IssueSource, string> = {
    core: 'Core',
    nspire: 'NSPIRE',
    projects: 'Projects',
  };

  const sourceColors: Record<IssueSource, string> = {
    core: 'bg-muted text-muted-foreground',
    nspire: 'bg-module-inspections/10 text-cyan-700',
    projects: 'bg-module-projects/10 text-violet-700',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Issues</h1>
          </div>
          <p className="text-muted-foreground">
            Cross-module issue tracking • Unified view of all property issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Issue
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">4</div>
            <p className="text-sm text-muted-foreground">Severe (24hr)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">12</div>
            <p className="text-sm text-muted-foreground">Moderate (30 day)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">7</div>
            <p className="text-sm text-muted-foreground">Low (60 day)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">156</div>
            <p className="text-sm text-muted-foreground">Resolved (30 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>All Issues</CardTitle>
          <CardDescription>Sorted by severity and deadline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <SeverityBadge severity={issue.severity} />
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {issue.property}
                      {issue.unit && ` • ${issue.unit}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {issue.area && <AreaBadge area={issue.area} />}
                  <span className={`text-xs px-2 py-1 rounded ${sourceColors[issue.sourceModule]}`}>
                    {sourceLabels[issue.sourceModule]}
                  </span>
                  <Badge variant={issue.status === 'open' ? 'outline' : issue.status === 'in_progress' ? 'secondary' : 'default'}>
                    {issue.status === 'open' ? 'Open' : issue.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                  </Badge>
                  {issue.proofRequired && (
                    <span className="text-xs text-warning">Proof required</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
