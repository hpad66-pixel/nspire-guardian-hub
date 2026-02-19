import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Cloud, FileText, Plus, Users, AlertTriangle, ChevronDown, ChevronUp, Printer, Download, Mail, Loader2, Eye } from 'lucide-react';
import { ProjectDailyReportPage } from './ProjectDailyReportPage';
import { PrintableProjectDailyReport } from './PrintableProjectDailyReport';
import { ProjectReportEmailSheet } from './ProjectReportEmailSheet';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface DailyReportsListProps {
  projectId: string;
  reports: DailyReportRow[];
  projectName?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyId?: string;
  projectType?: string;
}

export function DailyReportsList({
  projectId, reports, projectName, propertyName, propertyAddress, propertyId, projectType,
}: DailyReportsListProps) {
  const [showNewReport, setShowNewReport] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [emailReport, setEmailReport] = useState<DailyReportRow | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedReports);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedReports(next);
  };

  const reportDate = (r: DailyReportRow) => format(new Date(r.report_date), 'yyyy-MM-dd');
  const filename = (r: DailyReportRow) => `field-report-${(projectName || 'project').replace(/\s+/g, '-').toLowerCase()}-${reportDate(r)}.pdf`;
  const elementId = (r: DailyReportRow) => `printable-report-${r.id}`;

  const handleSavePDF = async (r: DailyReportRow) => {
    setGeneratingId(r.id);
    try {
      await generatePDF({ filename: filename(r), elementId: elementId(r), scale: 2 });
      toast.success('Report saved to your device ✓');
    } catch { toast.error('Failed to generate PDF'); }
    setGeneratingId(null);
  };

  const handlePrint = async (r: DailyReportRow) => {
    setPrintingId(r.id);
    try { await printReport(elementId(r)); }
    catch { toast.error('Failed to open print dialog'); }
    setPrintingId(null);
  };

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
  );

  if (showNewReport) {
    return (
      <ProjectDailyReportPage
        projectId={projectId}
        projectName={projectName || 'Project'}
        projectType={projectType}
        propertyName={propertyName}
        propertyAddress={propertyAddress}
        propertyId={propertyId}
        onBack={() => setShowNewReport(false)}
        onSubmitComplete={() => setShowNewReport(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily Field Reports</CardTitle>
            <CardDescription>Construction field logs with photos and rich formatting</CardDescription>
          </div>
          <Button onClick={() => setShowNewReport(true)}>
            <Plus className="h-4 w-4 mr-2" /> Submit Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedReports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No daily reports submitted yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewReport(true)}>
              <Plus className="h-4 w-4 mr-2" /> Submit First Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReports.map((report) => {
              const isExpanded = expandedReports.has(report.id);
              const workPerformedHtml = (report as any).work_performed_html;
              const safetyNotes = (report as any).safety_notes;
              const equipmentUsed = (report as any).equipment_used as string[] | null;
              const materialsReceived = (report as any).materials_received;
              const delays = (report as any).delays;

              return (
                <div key={report.id} className="rounded-lg border bg-card hover:border-accent/50 transition-colors">
                  <div
                    className="flex items-start justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpanded(report.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{format(new Date(report.report_date), 'EEEE, MMMM d, yyyy')}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {report.weather && <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />{report.weather}</span>}
                          {report.workers_count != null && report.workers_count > 0 && (
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{report.workers_count} workers</span>
                          )}
                          {report.photos && report.photos.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{report.photos.length} photos</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.issues_encountered && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/20">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Issues
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* PDF/Print/Email inline action row */}
                  <div className="flex gap-1 px-4 pb-3 border-t pt-3" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleSavePDF(report)} disabled={generatingId === report.id}>
                      {generatingId === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handlePrint(report)} disabled={printingId === report.id}>
                      {printingId === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      Print
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEmailReport(report)}>
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t space-y-4">
                      <div>
                        <h5 className="text-sm font-medium mb-2">Work Performed</h5>
                        {workPerformedHtml ? (
                          <div className="bg-muted/30 rounded-lg p-3"><RichTextViewer content={workPerformedHtml} /></div>
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.work_performed}</p>
                        )}
                      </div>
                      {report.issues_encountered && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 text-amber-500">Issues Encountered</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.issues_encountered}</p>
                        </div>
                      )}
                      {safetyNotes && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 text-blue-500">Safety Notes</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{safetyNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden printable element (always rendered for PDF/print) */}
                  <div className="sr-only print:block" id={elementId(report)} aria-hidden="true">
                    <PrintableProjectDailyReport
                      report={report}
                      projectName={projectName || 'Project'}
                      propertyName={propertyName}
                      propertyAddress={propertyAddress}
                      projectType={projectType}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Email sheet */}
      {emailReport && (
        <ProjectReportEmailSheet
          open={!!emailReport}
          onClose={() => setEmailReport(null)}
          report={emailReport}
          projectName={projectName || 'Project'}
          reportFilename={filename(emailReport)}
        />
      )}
    </Card>
  );
}
