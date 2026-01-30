import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Home, AlertTriangle, Users } from 'lucide-react';
import { usePropertyPortfolioReport, type DateRange } from '@/hooks/useReports';

interface PropertyPortfolioReportProps {
  dateRange?: DateRange;
}

export function PropertyPortfolioReport({ dateRange }: PropertyPortfolioReportProps) {
  const { data, isLoading } = usePropertyPortfolioReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  const occupancyRate = data.summary.totalUnits > 0
    ? Math.round((data.summary.occupiedUnits / data.summary.totalUnits) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Property Portfolio Overview</CardTitle>
            <CardDescription>Summary of all properties, units, and current status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total Properties"
            value={data.summary.totalProperties}
            icon={Building2}
          />
          <StatCard
            label="Total Units"
            value={data.summary.totalUnits}
            icon={Home}
          />
          <StatCard
            label="Occupancy Rate"
            value={`${occupancyRate}%`}
            icon={Users}
            subtext={`${data.summary.occupiedUnits} occupied / ${data.summary.vacantUnits} vacant`}
          />
          <StatCard
            label="Open Issues"
            value={data.summary.totalOpenIssues}
            icon={AlertTriangle}
            variant={data.summary.totalOpenIssues > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Occupancy Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Portfolio Occupancy</span>
            <span className="font-medium">{occupancyRate}%</span>
          </div>
          <Progress value={occupancyRate} className="h-2" />
        </div>

        {/* Property Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-center">Occupied</TableHead>
                <TableHead className="text-center">Vacant</TableHead>
                <TableHead className="text-center">Open Issues</TableHead>
                <TableHead className="text-center">Severe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.city}, {property.state}
                  </TableCell>
                  <TableCell className="text-center">{property.unitCount}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      {property.occupiedUnits}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      {property.vacantUnits}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {property.openIssues > 0 ? (
                      <Badge variant="secondary">{property.openIssues}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {property.severeIssues > 0 ? (
                      <Badge variant="destructive">{property.severeIssues}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.properties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No properties found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  subtext,
  variant = 'default' 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>; 
  subtext?: string;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variant === 'warning' ? 'bg-amber-100' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${variant === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
