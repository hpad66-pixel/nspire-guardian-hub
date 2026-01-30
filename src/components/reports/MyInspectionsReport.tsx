import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, TreePine, Building, DoorOpen, AlertTriangle } from 'lucide-react';
import { useMyInspectionsReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface MyInspectionsReportProps {
  dateRange?: DateRange;
}

export function MyInspectionsReport({ dateRange }: MyInspectionsReportProps) {
  const { data, isLoading } = useMyInspectionsReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>My Inspections</CardTitle>
            <CardDescription>Inspections you've conducted</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.inspections.length}</p>
            <p className="text-sm text-muted-foreground">Total Inspections</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TreePine className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold">{data.byArea.outside}</p>
            </div>
            <p className="text-sm text-muted-foreground">Outside</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold">{data.byArea.inside}</p>
            </div>
            <p className="text-sm text-muted-foreground">Inside</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <DoorOpen className="h-5 w-5 text-purple-600" />
              <p className="text-3xl font-bold">{data.byArea.unit}</p>
            </div>
            <p className="text-sm text-muted-foreground">Unit</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-3xl font-bold">{data.defectsFound}</p>
            </div>
            <p className="text-sm text-muted-foreground">Defects Found</p>
            {data.severeDefects > 0 && (
              <p className="text-xs text-destructive mt-1">{data.severeDefects} severe</p>
            )}
          </div>
        </div>

        {/* Recent Inspections */}
        <div>
          <h4 className="font-medium mb-3">Recent Inspections</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inspections.slice(0, 15).map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(inspection as any).property?.name || '—'}
                    </TableCell>
                    <TableCell>
                      {(inspection as any).unit?.unit_number || '—'}
                    </TableCell>
                    <TableCell>
                      <AreaBadge area={inspection.area} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inspection.status || 'scheduled'} />
                    </TableCell>
                  </TableRow>
                ))}
                {data.inspections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No inspections found in this date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AreaBadge({ area }: { area: string }) {
  const config: Record<string, { label: string; className: string }> = {
    outside: { label: 'Outside', className: 'bg-green-100 text-green-700 border-green-200' },
    inside: { label: 'Inside', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    unit: { label: 'Unit', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  };
  const { label, className } = config[area] || { label: area, className: '' };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    completed: { label: 'Completed', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'secondary' },
    scheduled: { label: 'Scheduled', variant: 'outline' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}
