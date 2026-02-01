import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PrintableDailyInspectionReport } from './PrintableDailyInspectionReport';
import { SendReportEmailDialog } from './SendReportEmailDialog';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { useInspectionItems, DailyInspection } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { useProperties } from '@/hooks/useProperties';
import { useProfiles } from '@/hooks/useProfiles';
import { Download, Printer, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface InspectionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string | undefined;
  inspection?: DailyInspection | null;
}

export function InspectionReportDialog({
  open,
  onOpenChange,
  inspectionId,
  inspection: providedInspection,
}: InspectionReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const { data: items = [], isLoading: itemsLoading } = useInspectionItems(inspectionId || '');
  const { data: properties = [] } = useProperties();
  const { data: profiles = [] } = useProfiles();
  const { data: assets = [] } = useAssets(providedInspection?.property_id || undefined);

  // Calculate status summary for email - must be before any early returns
  const statusSummary = useMemo(() => {
    const okCount = items.filter(i => i.status === 'ok').length;
    const attentionCount = items.filter(i => i.status === 'needs_attention').length;
    const defectCount = items.filter(i => i.status === 'defect_found').length;
    return { ok: okCount, attention: attentionCount, defect: defectCount };
  }, [items]);

  // If no inspection provided, we need to fetch it
  const inspection = providedInspection;

  if (!inspectionId || !inspection) {
    return null;
  }

  const property = properties.find(p => p.id === inspection.property_id);
  const inspector = profiles.find(p => p.user_id === inspection.inspector_id);
  const propertyName = property?.name || 'Unknown Property';
  const inspectorName = inspector?.full_name || inspector?.email || 'Unknown Inspector';

  const reportFilename = `daily-grounds-inspection-${format(parseISO(inspection.inspection_date), 'yyyy-MM-dd')}-${inspection.id.slice(0, 8)}.pdf`;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generatePDF({
        filename: reportFilename,
        elementId: 'printable-inspection-report',
        scale: 2,
      });
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
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

  const isLoading = itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Daily Grounds Inspection Report</DialogTitle>
              <DialogDescription>
                {propertyName} • {format(parseISO(inspection.inspection_date), 'MMMM d, yyyy')}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting || isLoading}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">Print</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGenerating || isLoading}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">Download PDF</span>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowEmailDialog(true)}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Email</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-8 space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="bg-gray-100 p-4 sm:p-8">
              <div className="shadow-xl rounded-lg overflow-hidden">
                <PrintableDailyInspectionReport
                  id="printable-inspection-report"
                  inspection={inspection}
                  items={items}
                  assets={assets}
                  propertyName={propertyName}
                  inspectorName={inspectorName}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Email Dialog */}
        <SendReportEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          inspectionId={inspectionId}
          propertyName={propertyName}
          inspectorName={inspectorName}
          inspectionDate={inspection.inspection_date}
          reportElementId="printable-inspection-report"
          statusSummary={statusSummary}
        />
      </DialogContent>
    </Dialog>
  );
}
