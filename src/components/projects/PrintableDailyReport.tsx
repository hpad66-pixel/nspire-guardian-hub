import { forwardRef } from 'react';
import { format } from 'date-fns';
import { Cloud, Users, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface PrintableDailyReportProps {
  report: DailyReportRow & {
    project?: {
      name: string;
      property?: {
        name: string;
        address?: string;
        city?: string;
        state?: string;
      };
    };
  };
  companyName?: string;
  companyLogo?: string;
}

export const PrintableDailyReport = forwardRef<HTMLDivElement, PrintableDailyReportProps>(
  ({ report, companyName = 'Construction Daily Report', companyLogo }, ref) => {
    const workPerformedHtml = (report as any).work_performed_html;
    const safetyNotes = (report as any).safety_notes;
    const equipmentUsed = (report as any).equipment_used as string[] | null;
    const materialsReceived = (report as any).materials_received;
    const delays = (report as any).delays;

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-8 max-w-4xl mx-auto print:p-0 print:max-w-none"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              {companyLogo ? (
                <img src={companyLogo} alt="Company Logo" className="h-12 mb-2" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
              )}
              <h2 className="text-xl font-semibold text-gray-700">Daily Field Report</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {format(new Date(report.report_date), 'MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-600">
                Report #{report.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Project Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Project</h3>
            <p className="text-lg font-semibold">{report.project?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{report.project?.property?.name}</p>
            {report.project?.property?.address && (
              <p className="text-sm text-gray-600">
                {report.project.property.address}, {report.project.property.city}, {report.project.property.state}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Cloud className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Weather</p>
                <p className="font-medium">{report.weather || 'Not recorded'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Workers</p>
                <p className="font-medium">{report.workers_count || 0} on site</p>
              </div>
            </div>
          </div>
        </div>

        {/* Work Performed Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Work Performed
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {workPerformedHtml ? (
              <RichTextViewer content={workPerformedHtml} />
            ) : (
              <p className="whitespace-pre-wrap text-gray-700">{report.work_performed}</p>
            )}
          </div>
        </div>

        {/* Issues Section */}
        {report.issues_encountered && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Issues Encountered
            </h3>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="whitespace-pre-wrap text-gray-700">{report.issues_encountered}</p>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        {safetyNotes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Safety Notes
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="whitespace-pre-wrap text-gray-700">{safetyNotes}</p>
            </div>
          </div>
        )}

        {/* Equipment & Materials Row */}
        {(equipmentUsed?.length || materialsReceived) && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {equipmentUsed && equipmentUsed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Equipment Used
                </h3>
                <ul className="list-disc list-inside text-gray-700">
                  {equipmentUsed.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {materialsReceived && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Materials Received
                </h3>
                <p className="text-gray-700">{materialsReceived}</p>
              </div>
            )}
          </div>
        )}

        {/* Delays */}
        {delays && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Delays / Schedule Impact
            </h3>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="whitespace-pre-wrap text-gray-700">{delays}</p>
            </div>
          </div>
        )}

        {/* Photos Section */}
        {report.photos && report.photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Site Photos ({report.photos.length})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {report.photos.slice(0, 9).map((photo, index) => (
                <div key={index} className="aspect-video rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={photo}
                    alt={`Site photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {report.photos.length > 9 && (
              <p className="text-sm text-gray-500 mt-2">
                + {report.photos.length - 9} additional photos
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-4 mt-8">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="font-medium">{format(new Date(report.created_at), 'MMMM d, yyyy h:mm a')}</p>
            </div>
            <div className="text-right">
              <div className="border-t border-gray-400 w-48 pt-2">
                <p className="text-sm text-gray-500">Superintendent Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            @page {
              size: letter;
              margin: 0.5in;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

PrintableDailyReport.displayName = 'PrintableDailyReport';
