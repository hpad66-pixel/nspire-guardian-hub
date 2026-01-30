import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Cloud,
  FileText,
  Plus,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Printer,
  Mail,
  Eye,
} from 'lucide-react';
import { EnhancedDailyReportDialog } from './EnhancedDailyReportDialog';
import { PrintableDailyReport } from './PrintableDailyReport';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface DailyReportsListProps {
  projectId: string;
  reports: DailyReportRow[];
  projectName?: string;
  propertyName?: string;
  propertyAddress?: string;
}

export function DailyReportsList({ 
  projectId, 
  reports,
  projectName,
  propertyName,
  propertyAddress,
}: DailyReportsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [printReport, setPrintReport] = useState<DailyReportRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReports(newExpanded);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Daily Report - ${printReport?.report_date}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: system-ui, -apple-system, sans-serif; }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily Reports</CardTitle>
            <CardDescription>Construction field logs with photos and rich formatting</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Submit Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedReports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No daily reports submitted yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit First Report
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
                <div
                  key={report.id}
                  className="p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpanded(report.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {format(new Date(report.report_date), 'EEEE, MMMM d, yyyy')}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {report.weather && (
                            <span className="flex items-center gap-1">
                              <Cloud className="h-3 w-3" />
                              {report.weather}
                            </span>
                          )}
                          {report.workers_count != null && report.workers_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {report.workers_count} workers
                            </span>
                          )}
                          {report.photos && report.photos.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {report.photos.length} photos
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.issues_encountered && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Issues
                        </Badge>
                      )}
                      {delays && (
                        <Badge variant="outline" className="text-red-500 border-red-500/20">
                          Delays
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Work Performed */}
                      <div>
                        <h5 className="text-sm font-medium mb-2">Work Performed</h5>
                        {workPerformedHtml ? (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <RichTextViewer content={workPerformedHtml} />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {report.work_performed}
                          </p>
                        )}
                      </div>

                      {/* Issues */}
                      {report.issues_encountered && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 text-amber-500">
                            Issues Encountered
                          </h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {report.issues_encountered}
                          </p>
                        </div>
                      )}

                      {/* Safety Notes */}
                      {safetyNotes && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 text-blue-500">Safety Notes</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {safetyNotes}
                          </p>
                        </div>
                      )}

                      {/* Equipment & Materials */}
                      {(equipmentUsed?.length || materialsReceived) && (
                        <div className="grid grid-cols-2 gap-4">
                          {equipmentUsed && equipmentUsed.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-1">Equipment Used</h5>
                              <p className="text-sm text-muted-foreground">
                                {equipmentUsed.join(', ')}
                              </p>
                            </div>
                          )}
                          {materialsReceived && (
                            <div>
                              <h5 className="text-sm font-medium mb-1">Materials Received</h5>
                              <p className="text-sm text-muted-foreground">{materialsReceived}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Delays */}
                      {delays && (
                        <div>
                          <h5 className="text-sm font-medium mb-1 text-red-500">Delays</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {delays}
                          </p>
                        </div>
                      )}

                      {/* Photos */}
                      {report.photos && report.photos.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Photos</h5>
                          <div className="flex gap-2 flex-wrap">
                            {report.photos.map((photo, index) => (
                              <div
                                key={index}
                                className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden"
                              >
                                <img
                                  src={photo}
                                  alt={`Report photo ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          Submitted {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintReport({
                                ...report,
                                project: {
                                  name: projectName || 'Project',
                                  property: {
                                    name: propertyName || '',
                                    address: propertyAddress,
                                  },
                                },
                              } as any);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <EnhancedDailyReportDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        projectId={projectId} 
      />

      {/* Print Preview Dialog */}
      <Dialog open={!!printReport} onOpenChange={() => setPrintReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Daily Report Preview</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {printReport && (
            <PrintableDailyReport
              ref={printRef}
              report={printReport as any}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
