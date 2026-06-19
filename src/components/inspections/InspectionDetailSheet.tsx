/**
 * Right-side panel that opens out from the edge to show a single daily
 * inspection — with one action bar for View · Print · Save PDF · Email.
 *
 * Self-contained: it manages its own "View Report" dialog and email dialog,
 * so any list (project Inspections tab, global history) can render it with
 * just an inspection + property/profile lookups.
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, Eye, Printer, Download, Mail, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useInspectionItems, WEATHER_OPTIONS, type DailyInspection } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { AddendumList } from '@/components/inspections/AddendumList';
import { InspectionReportDialog } from '@/components/inspections/InspectionReportDialog';
import { PrintableDailyInspectionReport } from '@/components/inspections/PrintableDailyInspectionReport';
import { SendReportEmailDialog } from '@/components/inspections/SendReportEmailDialog';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { toast } from 'sonner';

export function InspectionDetailSheet({
  inspection,
  onClose,
  properties,
  profiles,
}: {
  inspection: DailyInspection | null;
  onClose: () => void;
  properties: any[];
  profiles: any[];
}) {
  const { data: items = [], isLoading: itemsLoading } = useInspectionItems(inspection?.id || '');
  const { data: assets = [] } = useAssets(inspection?.property_id || undefined);
  const [showReport, setShowReport] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!inspection) return null;

  const property = properties.find((p) => p.id === inspection.property_id);
  const inspector = profiles.find((p) => p.user_id === inspection.inspector_id);
  const weather = WEATHER_OPTIONS.find((w) => w.value === inspection.weather);

  const propertyName = property?.name || 'Unknown Property';
  const inspectorName = inspector?.full_name || inspector?.email || 'Unknown';
  const printId = `inspection-printable-${inspection.id}`;

  const okCount = items.filter((i) => i.status === 'ok').length;
  const attentionCount = items.filter((i) => i.status === 'needs_attention').length;
  const defectCount = items.filter((i) => i.status === 'defect_found').length;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generatePDF({ elementId: printId, filename: `daily-inspection-${inspection.inspection_date}.pdf` });
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReport(printId);
    } catch {
      toast.error('Failed to print');
    } finally {
      setIsPrinting(false);
    }
  };

  const getAssetName = (assetId: string) => assets.find((a) => a.id === assetId)?.name || 'Unknown Asset';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'needs_attention': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'defect_found': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Sheet open={!!inspection} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div>
            <SheetTitle>Inspection Details</SheetTitle>
            <SheetDescription>
              {format(parseISO(inspection.inspection_date), 'EEEE, MMMM d, yyyy')} · {propertyName}
            </SheetDescription>
          </div>
          {/* One place for every action: View · Print · PDF · Email */}
          <div className="flex flex-wrap gap-2 pt-3">
            <Button size="sm" onClick={() => setShowReport(true)} className="gap-1.5">
              <Eye className="h-4 w-4" /> View Report
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} disabled={isPrinting || itemsLoading} className="gap-1.5">
              {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={isGenerating || itemsLoading} className="gap-1.5">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowEmail(true)} disabled={itemsLoading} className="gap-1.5">
              <Mail className="h-4 w-4" /> Email
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="font-medium">{propertyName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Inspector</p>
              <p className="font-medium">{inspectorName}</p>
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
                    {item.notes && <p className="text-sm text-muted-foreground ml-6">{item.notes}</p>}
                    {item.defect_description && <p className="text-sm text-red-600 ml-6">{item.defect_description}</p>}
                    {item.photo_urls && item.photo_urls.length > 0 && (
                      <div className="flex gap-2 ml-6 mt-2">
                        {item.photo_urls.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} alt="Inspection photo" className="h-12 w-12 rounded object-cover" />
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

        {/* Off-screen printable so Print / Save PDF work without opening the report dialog */}
        <div className="sr-only print:block" aria-hidden="true">
          <PrintableDailyInspectionReport
            id={printId}
            inspection={inspection}
            items={items}
            assets={assets}
            propertyName={propertyName}
            inspectorName={inspectorName}
          />
        </div>

        {/* Full report dialog (View Report) */}
        <InspectionReportDialog
          open={showReport}
          onOpenChange={setShowReport}
          inspectionId={inspection.id}
          inspection={inspection}
        />

        {/* Email dialog */}
        <SendReportEmailDialog
          open={showEmail}
          onOpenChange={setShowEmail}
          inspectionId={inspection.id}
          propertyName={propertyName}
          inspectorName={inspectorName}
          inspectionDate={inspection.inspection_date}
          reportElementId={printId}
          statusSummary={{ ok: okCount, attention: attentionCount, defect: defectCount }}
        />
      </SheetContent>
    </Sheet>
  );
}
