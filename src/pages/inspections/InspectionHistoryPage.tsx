import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagedProperties } from '@/hooks/useProperties';
import { useDailyInspections, WEATHER_OPTIONS, type DailyInspection } from '@/hooks/useDailyInspections';
import { useProfiles } from '@/hooks/useProfiles';
import { InspectionDetailSheet } from '@/components/inspections/InspectionDetailSheet';
import { InspectionCalendar } from '@/components/inspections/InspectionCalendar';
import { DailyInspectionWizard } from '@/components/inspections/DailyInspectionWizard';
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  List as ListIcon,
  CheckCircle2,
  Clock,
  Filter,
  Building,
  User,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay, startOfMonth } from 'date-fns';

type DateFilter = 'all' | '7days' | '30days' | '90days';
type StatusFilter = 'all' | 'completed' | 'in_progress';

const ALL_PROPERTIES = '__all__';

export default function InspectionHistoryPage() {
  // Default to "All Properties" so owners/admins see every property's
  // inspections in one place — not just the first property in the list.
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(ALL_PROPERTIES);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedInspection, setSelectedInspection] = useState<DailyInspection | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calMonth, setCalMonth] = useState<Date>(startOfMonth(new Date()));
  const [resumeInspection, setResumeInspection] = useState<DailyInspection | null>(null);

  const { data: properties = [], isLoading: propertiesLoading } = useManagedProperties();
  // Passing undefined fetches inspections across every property the user's
  // RLS allows (workspace-scoped), which is exactly the owner/admin view.
  const { data: allInspections = [], isLoading: inspectionsLoading } = useDailyInspections(
    selectedPropertyId === ALL_PROPERTIES ? undefined : selectedPropertyId
  );
  const { data: profiles = [] } = useProfiles();

  // Filter inspections
  const filteredInspections = allInspections.filter((inspection) => {
    // Date filter
    if (dateFilter !== 'all') {
      const daysBack = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
      const cutoffDate = subDays(new Date(), daysBack);
      const inspectionDate = parseISO(inspection.inspection_date);
      if (!isWithinInterval(inspectionDate, { start: startOfDay(cutoffDate), end: endOfDay(new Date()) })) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && inspection.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Group by date
  const groupedInspections = filteredInspections.reduce((acc, inspection) => {
    const dateKey = inspection.inspection_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(inspection);
    return acc;
  }, {} as Record<string, DailyInspection[]>);

  const sortedDates = Object.keys(groupedInspections).sort((a, b) => b.localeCompare(a));

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };

  const getInspectorName = (inspectorId: string | null) => {
    if (!inspectorId) return 'Unknown';
    const profile = profiles.find(p => p.user_id === inspectorId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const getReviewStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_review: { label: 'Pending Review', variant: 'secondary' },
      approved: { label: 'Approved', variant: 'default' },
      needs_revision: { label: 'Needs Revision', variant: 'destructive' },
      rejected: { label: 'Rejected', variant: 'destructive' },
    };
    const config = statusConfig[status || ''] || { label: 'Pending', variant: 'outline' as const };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const isLoading = propertiesLoading || inspectionsLoading;

  // Calendar shows a whole month, so it ignores the date-range filter (which is
  // for the list) and applies only the status filter.
  const calendarInspections = allInspections.filter(
    (i) => statusFilter === 'all' || i.status === statusFilter,
  );

  // Resuming an in-progress draft opens the full wizard with its saved data.
  if (resumeInspection) {
    return (
      <DailyInspectionWizard
        propertyId={resumeInspection.property_id}
        existingInspection={resumeInspection}
        onComplete={() => setResumeInspection(null)}
        onCancel={() => setResumeInspection(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/inspections/daily">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Inspection History</h1>
            <p className="text-muted-foreground">View all past daily grounds inspections</p>
          </div>
          {/* Calendar / List toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode('calendar')}>
              <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Calendar</span>
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode('list')}>
              <ListIcon className="h-4 w-4" /> <span className="hidden sm:inline">List</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROPERTIES}>All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground flex items-center justify-end">
                {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection List / Calendar */}
        {viewMode === 'calendar' ? (
          <InspectionCalendar
            inspections={calendarInspections}
            month={calMonth}
            onMonthChange={setCalMonth}
            onSelect={setSelectedInspection}
            propertyName={selectedPropertyId === ALL_PROPERTIES ? getPropertyName : undefined}
          />
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inspections found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-2">
                  {groupedInspections[dateKey].map((inspection) => {
                    const weather = WEATHER_OPTIONS.find(w => w.value === inspection.weather);
                    
                    return (
                      <Card 
                        key={inspection.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedInspection(inspection)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {inspection.status === 'completed' ? (
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{getPropertyName(inspection.property_id)}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {getInspectorName(inspection.inspector_id)}
                                  </span>
                                  {weather && (
                                    <span className="flex items-center gap-1">
                                      <span>{weather.icon}</span>
                                      {weather.label}
                                    </span>
                                  )}
                                  {inspection.completed_at && (
                                    <span>
                                      Completed {format(parseISO(inspection.completed_at), 'h:mm a')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {inspection.status === 'completed' && getReviewStatusBadge((inspection as any).review_status)}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet — right-side panel with View · Print · PDF · Email */}
      <InspectionDetailSheet
        inspection={selectedInspection}
        onClose={() => setSelectedInspection(null)}
        properties={properties}
        profiles={profiles}
        onResume={(insp) => { setSelectedInspection(null); setResumeInspection(insp); }}
      />
    </div>
  );
}
