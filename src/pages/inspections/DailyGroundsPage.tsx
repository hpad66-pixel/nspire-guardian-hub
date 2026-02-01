import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyInspectionWizard } from '@/components/inspections/DailyInspectionWizard';
import { AddendumDialog } from '@/components/inspections/AddendumDialog';
import { AddendumList } from '@/components/inspections/AddendumList';
import { InspectionReportDialog } from '@/components/inspections/InspectionReportDialog';
import { useProperties } from '@/hooks/useProperties';
import { useDailyInspections, useTodayInspection, WEATHER_OPTIONS } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { 
  ClipboardCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Play,
  Lock,
  FileText,
  Plus,
  History,
  Info,
  Sun,
  Camera,
  Mic,
  Send
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

// Instructional Guide Card Component
function InspectionGuideCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="pt-5 pb-5">
        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          What You'll Do Today
        </h3>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Sun className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-muted-foreground">Report current weather conditions</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-muted-foreground">Check infrastructure assets (Cleanouts, Catch Basins, etc.)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-muted-foreground">Document findings with photos</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Mic className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-muted-foreground">
              Add voice notes <span className="text-primary font-medium">(Spanish OK – auto-translated!)</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-muted-foreground">Submit for supervisor review</span>
          </li>
        </ul>
        <div className="mt-4 pt-3 border-t border-primary/10">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Estimated time: 10-15 minutes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyGroundsPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  const { data: properties = [] } = useProperties();
  const { data: assets = [] } = useAssets(selectedPropertyId || undefined);
  const { data: inspections = [] } = useDailyInspections(selectedPropertyId || undefined);
  const { data: todayInspection } = useTodayInspection(selectedPropertyId);

  // Auto-select first property if only one
  useEffect(() => {
    if (properties.length === 1 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const activeAssets = assets.filter(a => a.status === 'active');
  const recentInspections = inspections.slice(0, 5);

  const handleStartInspection = () => {
    setShowWizard(true);
  };

  const handleCompleteInspection = () => {
    setShowWizard(false);
  };

  // Get review status display
  const getReviewStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_review: { label: 'Pending Review', variant: 'secondary' },
      approved: { label: 'Approved', variant: 'default' },
      needs_revision: { label: 'Needs Revision', variant: 'destructive' },
      rejected: { label: 'Rejected', variant: 'destructive' },
    };
    const config = statusConfig[status || ''] || { label: 'Pending', variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (showWizard && selectedPropertyId) {
    return (
      <DailyInspectionWizard
        propertyId={selectedPropertyId}
        existingInspection={todayInspection?.status === 'in_progress' ? todayInspection : null}
        onComplete={handleCompleteInspection}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ClipboardCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Daily Grounds Inspection</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Instructional Guide - Show when inspection not started */}
        {(!todayInspection || todayInspection.status !== 'completed') && selectedPropertyId && (
          <InspectionGuideCard />
        )}

        {/* Property Selector */}
        {properties.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">Select Property</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedPropertyId && (
          <>
            {/* Today's Status */}
            <Card className="border-2">
              <CardContent className="pt-6 pb-4">
                {todayInspection?.status === 'completed' ? (
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900">
                      <Lock className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Today's Inspection Complete!</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Completed at {format(parseISO(todayInspection.completed_at!), 'h:mm a')}
                      </p>
                      {getReviewStatusBadge((todayInspection as any).review_status)}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setShowReportDialog(true)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddendum(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Addendum
                      </Button>
                    </div>
                  </div>
                ) : todayInspection?.status === 'in_progress' ? (
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900">
                      <Clock className="h-7 w-7 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Inspection In Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        Started earlier today
                      </p>
                    </div>
                    <Button size="lg" onClick={handleStartInspection} className="gap-2">
                      <Play className="h-4 w-4" />
                      Continue Inspection
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">Ready for Today's Inspection</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeAssets.length} assets to check
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full h-14 text-lg gap-3"
                      onClick={handleStartInspection}
                    >
                      <Play className="h-5 w-5" />
                      Start Today's Inspection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Addendums for completed inspection */}
            {todayInspection?.status === 'completed' && (
              <AddendumList inspectionId={todayInspection.id} />
            )}

            {/* Asset Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assets to Inspect</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span>🔧 Cleanouts</span>
                    <Badge variant="secondary">
                      {assets.filter(a => a.asset_type === 'cleanout' && a.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span>🕳️ Catch Basins</span>
                    <Badge variant="secondary">
                      {assets.filter(a => a.asset_type === 'catch_basin' && a.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span>⚡ Lift Stations</span>
                    <Badge variant="secondary">
                      {assets.filter(a => a.asset_type === 'lift_station' && a.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span>💧 Retention Ponds</span>
                    <Badge variant="secondary">
                      {assets.filter(a => a.asset_type === 'retention_pond' && a.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded col-span-2">
                    <span>🏡 General Grounds</span>
                    <Badge variant="secondary">
                      {assets.filter(a => a.asset_type === 'general_grounds' && a.status === 'active').length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Inspections */}
            {recentInspections.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Recent Inspections
                    </CardTitle>
                    <Link to="/inspections/history">
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <History className="h-3 w-3" />
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentInspections.map((inspection) => {
                    const date = parseISO(inspection.inspection_date);
                    const weather = WEATHER_OPTIONS.find(w => w.value === inspection.weather);
                    
                    return (
                      <div
                        key={inspection.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {inspection.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {isToday(date) ? 'Today' : format(date, 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {weather?.icon} {weather?.label || 'Unknown weather'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={inspection.status === 'completed' ? 'default' : 'secondary'}>
                          {inspection.status === 'completed' ? 'Complete' : 'In Progress'}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!selectedPropertyId && properties.length > 1 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Select a property to start your daily inspection</p>
            </CardContent>
          </Card>
        )}

        {properties.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No properties found. Please add a property first.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Addendum Dialog */}
      {todayInspection && (
        <AddendumDialog
          open={showAddendum}
          onOpenChange={setShowAddendum}
          inspectionId={todayInspection.id}
        />
      )}

      {/* Report Dialog */}
      <InspectionReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        inspectionId={todayInspection?.id}
        inspection={todayInspection}
      />
    </div>
  );
}
