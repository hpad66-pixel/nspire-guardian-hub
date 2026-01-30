import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  History,
  Search,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  User,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  useActivityLog,
  useActivityLogStats,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
  type ActivityLogEntry,
} from '@/hooks/useActivityLog';
import { cn } from '@/lib/utils';

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-success" />,
  update: <Edit className="h-4 w-4 text-blue-500" />,
  delete: <Trash2 className="h-4 w-4 text-destructive" />,
};

export default function ActivityLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [limit, setLimit] = useState(50);
  
  const { data: logs, isLoading, refetch } = useActivityLog({
    entityType: entityFilter || undefined,
    action: actionFilter || undefined,
    limit,
  });
  const { data: stats } = useActivityLogStats();
  
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <History className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          </div>
          <p className="text-muted-foreground">
            Audit trail of all system changes and actions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats?.actions?.create || 0}</div>
            <p className="text-sm text-muted-foreground">Creates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats?.actions?.update || 0}</div>
            <p className="text-sm text-muted-foreground">Updates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats?.actions?.delete || 0}</div>
            <p className="text-sm text-muted-foreground">Deletes</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Entity Type</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All entities</SelectItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Show</Label>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 entries</SelectItem>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="200">200 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {logs?.length || 0} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((entry) => (
                <ActivityLogItem key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No activity found</h3>
              <p className="text-muted-foreground">
                {entityFilter || actionFilter
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as changes are made'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const entityLabel = ENTITY_TYPE_LABELS[entry.entity_type] || entry.entity_type;
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;
  const actionIcon = actionIcons[entry.action] || <Edit className="h-4 w-4" />;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                {actionIcon}
              </div>
              <div>
                <p className="font-medium">
                  {actionLabel} {entityLabel}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{entityLabel}</Badge>
              {entry.changes && (
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        {entry.changes && (
          <CollapsibleContent>
            <div className="mt-4 p-3 rounded bg-muted/50 text-sm">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Changes</p>
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(entry.changes, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
