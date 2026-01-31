import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyInspectionWizard } from '@/components/inspections/DailyInspectionWizard';
import { useProperties } from '@/hooks/useProperties';
import { useDailyInspections, useTodayInspection, WEATHER_OPTIONS } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { 
  ClipboardCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Play,
  ChevronRight
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

export default function DailyGroundsPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  
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

  if (showWizard && selectedPropertyId) {
    return (
      <DailyInspectionWizard
        propertyId={selectedPropertyId}
        existingInspection={todayInspection}
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

        {/* Auto-select single property - handled by useEffect */}
        {properties.length === 1 && !selectedPropertyId && (
          <div className="hidden" />
        
        )}

        {selectedPropertyId && (
          <>
            {/* Today's Status */}
            <Card className="border-2">
              <CardContent className="pt-6 pb-4">
                {todayInspection?.status === 'completed' ? (
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Today's Inspection Complete!</h3>
                      <p className="text-sm text-muted-foreground">
                        Completed at {format(parseISO(todayInspection.completed_at!), 'h:mm a')}
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleStartInspection}>
                      View or Edit
                    </Button>
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Recent Inspections
                  </CardTitle>
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
    </div>
  );
}
