import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Printer, Mail, Eye, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { PrintableProjectDailyReport } from './PrintableProjectDailyReport';
import { ProjectReportEmailSheet } from './ProjectReportEmailSheet';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface ProjectReportActionsPanelProps {
  report: DailyReportRow;
  projectName: string;
  propertyName?: string;
  propertyAddress?: string;
  projectType?: string;
  inspectorName?: string;
  onBack: () => void;
}

export function ProjectReportActionsPanel({
  report, projectName, propertyName, propertyAddress, projectType, inspectorName, onBack,
}: ProjectReportActionsPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  const reportDate = format(new Date(report.report_date), 'yyyy-MM-dd');
  const reportFilename = `field-report-${projectName.replace(/\s+/g, '-').toLowerCase()}-${reportDate}.pdf`;

  const handleSavePDF = async () => {
    setIsGenerating(true);
    try {
      await generatePDF({ filename: reportFilename, elementId: 'printable-project-daily-report', scale: 2 });
      toast.success('Report saved to your device ✓');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReport('printable-project-daily-report');
    } catch {
      toast.error('Failed to open print dialog');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-full p-6 gap-6 max-w-2xl mx-auto w-full">
      {/* Success header */}
      <div className="text-center space-y-2 pt-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-9 w-9 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Field Report Submitted</h2>
        <p className="text-muted-foreground">{projectName} · {format(new Date(report.report_date), 'EEE MMM d, yyyy')}</p>
        <p className="text-xs text-muted-foreground font-mono">Report #{report.id.slice(0, 8).toUpperCase()} · Submitted at {format(new Date(report.created_at), 'h:mm a')}</p>
      </div>

      {/* Three action buttons */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <button
          type="button"
          onClick={handleSavePDF}
          disabled={isGenerating}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <Download className="h-7 w-7 text-primary" />}
          <span className="text-xs font-semibold text-center leading-tight">{isGenerating ? 'Saving...' : 'Save PDF'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-60"
        >
          {isPrinting ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <Printer className="h-7 w-7 text-primary" />}
          <span className="text-xs font-semibold text-center leading-tight">{isPrinting ? 'Opening...' : 'Print Report'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowEmailSheet(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Mail className="h-7 w-7 text-primary" />
          <span className="text-xs font-semibold text-center leading-tight">Email Report</span>
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowFullReport(v => !v)}>
          <Eye className="h-4 w-4" />
          {showFullReport ? 'Hide Report' : 'View Full Report'}
        </Button>
        <Button variant="ghost" className="flex-1 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </div>

      {/* Inline full report preview */}
      {showFullReport && (
        <div className="w-full border rounded-xl overflow-hidden">
          <PrintableProjectDailyReport
            report={report}
            projectName={projectName}
            propertyName={propertyName}
            propertyAddress={propertyAddress}
            projectType={projectType}
            inspectorName={inspectorName}
          />
        </div>
      )}

      {/* Hidden printable element */}
      <div className="sr-only print:block" aria-hidden="true">
        <PrintableProjectDailyReport
          report={report}
          projectName={projectName}
          propertyName={propertyName}
          propertyAddress={propertyAddress}
          projectType={projectType}
          inspectorName={inspectorName}
        />
      </div>

      <ProjectReportEmailSheet
        open={showEmailSheet}
        onClose={() => setShowEmailSheet(false)}
        report={report}
        projectName={projectName}
        inspectorName={inspectorName}
        reportFilename={reportFilename}
      />
    </div>
  );
}
