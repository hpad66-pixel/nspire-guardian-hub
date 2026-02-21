import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, AtSign, Download } from 'lucide-react';
import { useIssuesByProperty, Issue } from '@/hooks/useIssues';
import { useMyMentionedIssueIds } from '@/hooks/useIssueMentions';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { IssueDetailSheet } from '@/components/issues/IssueDetailSheet';
import { IssueDialog } from '@/components/issues/IssueDialog';
import { IssueFilterPopover, type IssueFilters } from '@/components/issues/IssueFilterPopover';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataExport } from '@/hooks/useDataExport';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useSearchParams } from 'react-router-dom';
import { useManagedProperties } from '@/hooks/useProperties';

export default function IssuesPage() {
  const { data: mentionedIssueIds = [] } = useMyMentionedIssueIds();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { canCreate } = useUserPermissions();
  const { data: properties = [] } = useManagedProperties();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<IssueFilters>({
    statuses: [],
    severities: [],
    sources: [],
    propertyId: null,
  });

  const { data: issues, isLoading, error } = useIssuesByProperty(filters.propertyId);

  useEffect(() => {
    if (!filters.propertyId && properties.length > 0) {
      setFilters((prev) => ({ ...prev, propertyId: properties[0].id }));
    }
  }, [properties, filters.propertyId]);

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

  // Calculate stats including attention count
  const needsAttentionCount = issues ? issues.filter(i => 
    i.status !== 'resolved' && 
    (i.assigned_to === user?.id || mentionedIssueIds.includes(i.id))
  ).length : 0;

  const stats = issues ? {
    severe: issues.filter(i => i.severity === 'severe' && i.status !== 'resolved').length,
    moderate: issues.filter(i => i.severity === 'moderate' && i.status !== 'resolved').length,
    low: issues.filter(i => i.severity === 'low' && i.status !== 'resolved').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    needsAttention: needsAttentionCount,
  } : { severe: 0, moderate: 0, low: 0, resolved: 0, needsAttention: 0 };

  // Filter issues based on all active filters
  const displayedIssues = issues?.filter(issue => {
    // Needs attention filter
    if (filterNeedsAttention) {
      if (issue.status === 'resolved') return false;
      if (issue.assigned_to !== user?.id && !mentionedIssueIds.includes(issue.id)) return false;
    }
    
    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(issue.status || 'open')) {
      return false;
    }
    
    // Severity filter
    if (filters.severities.length > 0 && !filters.severities.includes(issue.severity)) {
      return false;
    }
    
    // Source filter
    if (filters.sources.length > 0 && !filters.sources.includes(issue.source_module)) {
      return false;
    }
    
    // Property filter
    if (filters.propertyId && issue.property_id !== filters.propertyId) {
      return false;
    }
    
    return true;
  }) || [];

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setPage,
    setPageSize,
  } = usePagination(displayedIssues, { initialPageSize: 10 });

  const { exportToCSV } = useDataExport();

  const handleExport = () => {
    const exportData = displayedIssues.map(issue => ({
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      source_module: issue.source_module,
      property: issue.property?.name || '',
      unit: issue.unit?.unit_number || '',
      deadline: issue.deadline,
      created_at: issue.created_at,
    }));

    exportToCSV(exportData, {
      filename: 'issues',
      headers: ['title', 'description', 'severity', 'status', 'source_module', 'property', 'unit', 'deadline', 'created_at'],
      dateFields: ['deadline', 'created_at'],
    });
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setSheetOpen(true);
  };

  useEffect(() => {
    const issueId = searchParams.get('issueId');
    if (!issueId || !issues || issues.length === 0) return;

    const match = issues.find((i) => i.id === issueId);
    if (match) {
      setSelectedIssue(match);
      setSheetOpen(true);
    }
  }, [issues, searchParams]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Failed to load issues: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Issues</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Cross-module issue tracking • Unified view of all property issues
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsAttentionCount > 0 && (
            <Button 
              variant={filterNeedsAttention ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterNeedsAttention(!filterNeedsAttention)}
              className="gap-2 h-9"
            >
              <AtSign className="h-4 w-4" />
              <span className="hidden sm:inline">Needs Your Attention</span>
              <span className="sm:hidden">Attention</span>
              <Badge variant="secondary" className="ml-1">
                {needsAttentionCount}
              </Badge>
            </Button>
          )}
          <IssueFilterPopover filters={filters} onFiltersChange={setFilters} />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={displayedIssues.length === 0}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          {canCreate('issues') && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Issue</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
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
          <CardTitle>
            {filterNeedsAttention ? 'Issues Needing Your Attention' : 'All Issues'}
          </CardTitle>
          <CardDescription>
            {filterNeedsAttention 
              ? 'Issues assigned to you or where you were mentioned'
              : 'Sorted by severity and deadline'}
          </CardDescription>
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
          ) : paginatedData && paginatedData.length > 0 ? (
            <div className="space-y-3">
                  {paginatedData.map((issue) => {
                    const isAssigned = issue.assigned_to === user?.id && issue.status !== 'resolved';
                    const isMentioned = mentionedIssueIds.includes(issue.id) && issue.status !== 'resolved';
                    const needsAttention = isAssigned || isMentioned;
                    
                    return (
                      <div 
                        key={issue.id} 
                        onClick={() => handleIssueClick(issue)}
                        className={cn(
                          "p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer",
                          needsAttention && "border-l-4 border-l-primary"
                        )}
                      >
                        {/* Mobile: stacked layout */}
                        <div className="flex items-start gap-3">
                          <SeverityBadge severity={issue.severity as 'low' | 'moderate' | 'severe'} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm leading-snug">{issue.title}</p>
                              <Badge variant={issue.status === 'open' ? 'outline' : issue.status === 'in_progress' ? 'secondary' : 'default'} className="shrink-0 text-xs">
                                {issue.status === 'open' ? 'Open' : issue.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {issue.property?.name || 'Unknown property'}
                              {issue.unit?.unit_number && ` • Unit ${issue.unit.unit_number}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {isAssigned && (
                                <Badge variant="default" className="text-xs">Assigned to You</Badge>
                              )}
                              {isMentioned && !isAssigned && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <AtSign className="h-3 w-3" />Mentioned
                                </Badge>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded ${sourceColors[issue.source_module] || sourceColors.core}`}>
                                {sourceLabels[issue.source_module] || 'Core'}
                              </span>
                              {issue.proof_required && (
                                <span className="text-xs text-warning">Proof req.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          
          {displayedIssues.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={displayedIssues.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Sheet */}
      <IssueDetailSheet 
        issue={selectedIssue} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
      />
      
      {/* Create Issue Dialog */}
      <IssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
