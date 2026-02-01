import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useProperties } from '@/hooks/useProperties';
import { useDailyInspections, useInspectionItems, WEATHER_OPTIONS, type DailyInspection } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { useProfiles } from '@/hooks/useProfiles';
import { AddendumList } from '@/components/inspections/AddendumList';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search,
  Filter,
  Eye,
  Building,
  User,
  Cloud,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

type DateFilter = 'all' | '7days' | '30days' | '90days';
type StatusFilter = 'all' | 'completed' | 'in_progress';

export default function InspectionHistoryPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<DailyInspection | null>(null);

  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: allInspections = [], isLoading: inspectionsLoading } = useDailyInspections(
    selectedPropertyId === 'all' ? undefined : selectedPropertyId
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
          <div>
            <h1 className="text-2xl font-bold">Inspection History</h1>
            <p className="text-muted-foreground">View all past daily grounds inspections</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
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

        {/* Inspection List */}
        {isLoading ? (
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

      {/* Detail Sheet */}
      <InspectionDetailSheet 
        inspection={selectedInspection}
        onClose={() => setSelectedInspection(null)}
        properties={properties}
        profiles={profiles}
      />
    </div>
  );
}

// Detail Sheet Component
function InspectionDetailSheet({ 
  inspection, 
  onClose, 
  properties,
  profiles 
}: { 
  inspection: DailyInspection | null;
  onClose: () => void;
  properties: any[];
  profiles: any[];
}) {
  const { data: items = [], isLoading: itemsLoading } = useInspectionItems(inspection?.id || '');
  const { data: assets = [] } = useAssets(inspection?.property_id || undefined);

  if (!inspection) return null;

  const property = properties.find(p => p.id === inspection.property_id);
  const inspector = profiles.find(p => p.user_id === inspection.inspector_id);
  const weather = WEATHER_OPTIONS.find(w => w.value === inspection.weather);

  const getAssetName = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.name || 'Unknown Asset';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'needs_attention':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'defect_found':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const okCount = items.filter(i => i.status === 'ok').length;
  const attentionCount = items.filter(i => i.status === 'needs_attention').length;
  const defectCount = items.filter(i => i.status === 'defect_found').length;

  return (
    <Sheet open={!!inspection} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Inspection Details</SheetTitle>
          <SheetDescription>
            {format(parseISO(inspection.inspection_date), 'EEEE, MMMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="font-medium">{property?.name || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Inspector</p>
              <p className="font-medium">{inspector?.full_name || inspector?.email || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Weather</p>
              <p className="font-medium">{weather ? `${weather.icon} ${weather.label}` : 'Not recorded'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={inspection.status === 'completed' ? 'default' : 'secondary'}>
                {inspection.status === 'completed' ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{okCount}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{attentionCount}</p>
              <p className="text-xs text-muted-foreground">Attention</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{defectCount}</p>
              <p className="text-xs text-muted-foreground">Defects</p>
            </div>
          </div>

          {/* General Notes */}
          {inspection.general_notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">General Notes</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {inspection.general_notes_html ? (
                  <div dangerouslySetInnerHTML={{ __html: inspection.general_notes_html }} />
                ) : (
                  <p>{inspection.general_notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Asset Checks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Asset Checks ({items.length})</h4>
            {itemsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items checked</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <span className="font-medium text-sm">{getAssetName(item.asset_id)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground ml-6">{item.notes}</p>
                    )}
                    {item.defect_description && (
                      <p className="text-sm text-red-600 ml-6">{item.defect_description}</p>
                    )}
                    {item.photo_urls && item.photo_urls.length > 0 && (
                      <div className="flex gap-2 ml-6 mt-2">
                        {item.photo_urls.slice(0, 3).map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="Inspection photo" 
                            className="h-12 w-12 rounded object-cover"
                          />
                        ))}
                        {item.photo_urls.length > 3 && (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            +{item.photo_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addendums */}
          <AddendumList inspectionId={inspection.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
