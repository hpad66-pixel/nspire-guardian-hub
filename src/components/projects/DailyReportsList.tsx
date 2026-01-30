import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Cloud,
  FileText,
  Plus,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DailyReportDialog } from './DailyReportDialog';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface DailyReportsListProps {
  projectId: string;
  reports: DailyReportRow[];
}

export function DailyReportsList({ projectId, reports }: DailyReportsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReports(newExpanded);
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
            <CardDescription>Construction field logs and updates</CardDescription>
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
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div>
                        <h5 className="text-sm font-medium mb-1">Work Performed</h5>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {report.work_performed}
                        </p>
                      </div>

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

                      <div className="text-xs text-muted-foreground">
                        Submitted {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <DailyReportDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} />
    </Card>
  );
}
