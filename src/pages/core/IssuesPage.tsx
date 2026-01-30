import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Filter, Loader2 } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';
import { Skeleton } from '@/components/ui/skeleton';

export default function IssuesPage() {
  const { data: issues, isLoading, error } = useIssues();

  const sourceLabels: Record<string, string> = {
    core: 'Core',
    nspire: 'NSPIRE',
    projects: 'Projects',
  };

  const sourceColors: Record<string, string> = {
    core: 'bg-muted text-muted-foreground',
    nspire: 'bg-module-inspections/10 text-cyan-700',
    projects: 'bg-module-projects/10 text-violet-700',
  };

  // Calculate stats
  const stats = issues ? {
    severe: issues.filter(i => i.severity === 'severe' && i.status !== 'resolved').length,
    moderate: issues.filter(i => i.severity === 'moderate' && i.status !== 'resolved').length,
    low: issues.filter(i => i.severity === 'low' && i.status !== 'resolved').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  } : { severe: 0, moderate: 0, low: 0, resolved: 0 };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Failed to load issues: {error.message}</div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold text-destructive">{stats.severe}</div>
            <p className="text-sm text-muted-foreground">Severe (24hr)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.moderate}</div>
            <p className="text-sm text-muted-foreground">Moderate (30 day)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.low}</div>
            <p className="text-sm text-muted-foreground">Low (60 day)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            <p className="text-sm text-muted-foreground">Resolved</p>
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
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-16" />
                    <div>
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : issues && issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <SeverityBadge severity={issue.severity as 'low' | 'moderate' | 'severe'} />
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {issue.property?.name || 'Unknown property'}
                        {issue.unit?.unit_number && ` • Unit ${issue.unit.unit_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {issue.area && <AreaBadge area={issue.area as 'outside' | 'inside' | 'unit'} />}
                    <span className={`text-xs px-2 py-1 rounded ${sourceColors[issue.source_module] || sourceColors.core}`}>
                      {sourceLabels[issue.source_module] || 'Core'}
                    </span>
                    <Badge variant={issue.status === 'open' ? 'outline' : issue.status === 'in_progress' ? 'secondary' : 'default'}>
                      {issue.status === 'open' ? 'Open' : issue.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                    </Badge>
                    {issue.proof_required && (
                      <span className="text-xs text-warning">Proof required</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No issues yet</h3>
                  <p className="text-muted-foreground">Issues will appear here as they're created from inspections or manually</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
