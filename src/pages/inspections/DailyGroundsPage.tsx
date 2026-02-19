import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyInspectionWizard } from '@/components/inspections/DailyInspectionWizard';
import { AddendumDialog } from '@/components/inspections/AddendumDialog';
import { InspectionReportDialog } from '@/components/inspections/InspectionReportDialog';
import { SendReportEmailDialog } from '@/components/inspections/SendReportEmailDialog';
import { PrintableDailyInspectionReport } from '@/components/inspections/PrintableDailyInspectionReport';
import { DailyLogDashboard } from '@/components/inspections/DailyLogDashboard';
import { useProperties } from '@/hooks/useProperties';
import { useDailyInspections, useTodayInspection, useInspectionItems } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserPermissions } from '@/hooks/usePermissions';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { format, parseISO } from 'date-fns';
import { Download, Printer, Mail, FileText, PlusCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyGroundsPage() {
  // ── All hooks at the top level, before any early returns ──
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [assetRoundsCompleted, setAssetRoundsCompleted] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: properties = [] } = useProperties();
  const { data: assets = [] } = useAssets(selectedPropertyId || undefined);
  const { data: inspections = [] } = useDailyInspections(selectedPropertyId || undefined);
  const { data: todayInspection } = useTodayInspection(selectedPropertyId);
  const { data: profiles = [] } = useProfiles();
  const { data: items = [] } = useInspectionItems(todayInspection?.id || '');
  const { canCreate } = useUserPermissions();
  const canCreateInspections = canCreate('inspections');

  const isCompleted = todayInspection?.status === 'completed';

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const inspector = profiles.find(p => p.user_id === todayInspection?.inspector_id);
  const propertyName = selectedProperty?.name || 'Unknown Property';
  const inspectorName = inspector?.full_name || inspector?.email || 'Unknown Inspector';

  const reportFilename = todayInspection
    ? `daily-grounds-inspection-${format(parseISO(todayInspection.inspection_date), 'yyyy-MM-dd')}-${todayInspection.id.slice(0, 8)}.pdf`
    : 'daily-grounds-inspection.pdf';

  const statusSummary = useMemo(() => {
    const ok = items.filter(i => i.status === 'ok').length;
    const attention = items.filter(i => i.status === 'needs_attention').length;
    const defect = items.filter(i => i.status === 'defect_found').length;
    return { ok, attention, defect };
  }, [items]);

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

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDF({
        filename: reportFilename,
        elementId: 'printable-inspection-report',
        scale: 2,
      });
      toast.success('Report saved to your device');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReport('printable-inspection-report');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print report');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCompleteInspection = () => {
    setShowWizard(false);
    setAssetRoundsCompleted(true);
  };

  // ── Conditional renders (after all hooks) ──

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
            console.log('Navigate to section:', section);
          }}
          assetRoundsCompleted={assetRoundsCompleted}
        />
      )}

      {/* ── Report Actions Panel — dominant after completion ── */}
      {isCompleted && todayInspection && (
        <div className="px-4 pb-6 max-w-2xl mx-auto w-full">
          <Card className="border-2 border-green-200 shadow-md" style={{ background: 'linear-gradient(135deg, hsl(142 76% 97%), hsl(160 84% 96%))' }}>
            <CardContent className="pt-5 pb-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800 leading-tight">Today's Inspection Complete</p>
                  <p className="text-xs text-green-600">
                    {todayInspection.completed_at
                      ? `Completed at ${format(new Date(todayInspection.completed_at), 'h:mm a')}`
                      : 'Completed'} · Pending Review
                  </p>
                </div>
              </div>

              {/* Three main action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex flex-col items-center gap-1.5 p-3 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingPDF
                    ? <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    : <Download className="h-6 w-6 text-primary" />
                  }
                  <span className="text-xs font-semibold text-foreground leading-tight text-center">
                    {isGeneratingPDF ? 'Saving…' : 'Save PDF'}
                  </span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex flex-col items-center gap-1.5 p-3 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPrinting
                    ? <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    : <Printer className="h-6 w-6 text-primary" />
                  }
                  <span className="text-xs font-semibold text-foreground leading-tight text-center">
                    {isPrinting ? 'Printing…' : 'Print Report'}
                  </span>
                </button>

                <button
                  onClick={() => setShowEmailDialog(true)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-accent transition-all active:scale-95"
                >
                  <Mail className="h-6 w-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground leading-tight text-center">Email Report</span>
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => setShowReportDialog(true)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Full Report
                </Button>
                {canCreateInspections && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setShowAddendum(true)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Addendum
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden printable report — rendered off-screen so Save PDF / Print work without opening dialog */}
      {isCompleted && todayInspection && (
        <div className="sr-only print:block" aria-hidden="true">
          <PrintableDailyInspectionReport
            id="printable-inspection-report"
            inspection={todayInspection}
            items={items}
            assets={assets}
            propertyName={propertyName}
            inspectorName={inspectorName}
          />
        </div>
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
      {todayInspection && (
        <SendReportEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          inspectionId={todayInspection.id}
          propertyName={propertyName}
          inspectorName={inspectorName}
          inspectionDate={todayInspection.inspection_date}
          reportElementId="printable-inspection-report"
          statusSummary={statusSummary}
        />
      )}
    </div>
  );
}
