import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyInspectionWizard } from '@/components/inspections/DailyInspectionWizard';
import { AddendumDialog } from '@/components/inspections/AddendumDialog';
import { InspectionReportDialog } from '@/components/inspections/InspectionReportDialog';
import { DailyLogDashboard } from '@/components/inspections/DailyLogDashboard';
import { useProperties } from '@/hooks/useProperties';
import { useDailyInspections, useTodayInspection } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { useUserPermissions } from '@/hooks/usePermissions';

export default function DailyGroundsPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [assetRoundsCompleted, setAssetRoundsCompleted] = useState(false);

  const { data: properties = [] } = useProperties();
  const { data: assets = [] } = useAssets(selectedPropertyId || undefined);
  const { data: inspections = [] } = useDailyInspections(selectedPropertyId || undefined);
  const { data: todayInspection } = useTodayInspection(selectedPropertyId);
  const { canCreate } = useUserPermissions();
  const canCreateInspections = canCreate('inspections');

  // Auto-select first property
  useEffect(() => {
    if (properties.length === 1 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Sync existing completed inspection into dashboard state
  useEffect(() => {
    if (todayInspection?.status === 'completed') {
      setAssetRoundsCompleted(true);
    }
  }, [todayInspection]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const handleCompleteInspection = () => {
    setShowWizard(false);
    setAssetRoundsCompleted(true);
  };

  // Show wizard fullscreen
  if (showWizard && selectedPropertyId && canCreateInspections) {
    return (
      <DailyInspectionWizard
        propertyId={selectedPropertyId}
        existingInspection={todayInspection?.status === 'in_progress' ? todayInspection : null}
        onComplete={handleCompleteInspection}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  // Property picker if multiple properties and none selected
  if (properties.length > 1 && !selectedPropertyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-center">Select a Property</h2>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="border-dashed w-full max-w-sm">
          <CardContent className="pt-6 text-center text-muted-foreground">
            No properties found. Please add a property first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Property switcher when multiple */}
      {properties.length > 1 && (
        <div className="px-4 pt-3 pb-0 max-w-2xl mx-auto w-full">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedPropertyId && (
        <DailyLogDashboard
          propertyId={selectedPropertyId}
          propertyName={selectedProperty?.name}
          onStartAssetRounds={() => setShowWizard(true)}
          onNavigateToSection={(section) => {
            // Future: open section-specific sheets (Prompt 2)
            console.log('Navigate to section:', section);
          }}
          assetRoundsCompleted={assetRoundsCompleted}
        />
      )}

      {/* Dialogs */}
      {todayInspection && canCreateInspections && (
        <AddendumDialog
          open={showAddendum}
          onOpenChange={setShowAddendum}
          inspectionId={todayInspection.id}
        />
      )}
      <InspectionReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        inspectionId={todayInspection?.id}
        inspection={todayInspection}
      />
    </div>
  );
}
