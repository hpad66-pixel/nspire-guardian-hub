import { format } from 'date-fns';
import { BrandedReportEmailDialog, type PreparedReportDelivery } from '@/components/reports/BrandedReportEmailDialog';
import { generatePDFBase64 } from '@/lib/generatePDF';
import { PrintableProjectDailyReport } from './PrintableProjectDailyReport';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface ProjectReportEmailSheetProps {
  open: boolean;
  onClose: () => void;
  report: DailyReportRow;
  projectId?: string;
  projectName: string;
  propertyName?: string;
  propertyAddress?: string;
  projectType?: string;
  inspectorName?: string;
  reportFilename: string;
}

const DELIVERY_ELEMENT_ID = 'client-daily-report-delivery';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/[—–‑]/g, '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function ProjectReportEmailSheet({
  open,
  onClose,
  report,
  projectId,
  projectName,
  propertyName,
  propertyAddress,
  projectType,
  inspectorName,
  reportFilename,
}: ProjectReportEmailSheetProps) {
  const reportDate = format(new Date(report.report_date), 'MMM d, yyyy');
  const defaultSubject = `Daily Field Report - ${projectName} - ${reportDate}`;
  const workerCount = report.workers_count || 0;
  const weather = report.weather || 'Weather not recorded';
  const workPerformed = report.work_performed || 'No work summary was recorded.';

  async function prepareDelivery(personalMessage: string): Promise<PreparedReportDelivery> {
    const pdfBase64 = await generatePDFBase64({ elementId: DELIVERY_ELEMENT_ID, scale: 2 });
    const personal = personalMessage
      ? `<div style="margin:0 0 20px;border-left:4px solid #dfbd67;background:#fff9e8;padding:14px 16px;color:#4b452f;font-size:15px;line-height:1.6;">${escapeHtml(personalMessage).replace(/\n/g, '<br>')}</div>`
      : '';
    const bodyHtml = `<div style="margin:0;background:#edf2ef;padding:20px 8px;font-family:Arial,sans-serif;color:#173a32;"><div style="max-width:700px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;"><div style="height:6px;background:#dfbd67;"></div><div style="background:#082b23;color:#fff;padding:28px;"><div style="color:#edce79;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">APAS Project Controls | Proj OS</div><h1 style="margin:16px 0 7px;font:700 28px/1.15 Georgia,serif;">Daily Field Report</h1><div style="color:#c9ddd6;font-size:14px;">${escapeHtml(projectName)} | ${escapeHtml(reportDate)}</div></div><div style="padding:24px 28px;">${personal}<table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:0 -8px 22px;"><tr><td style="background:#f0f7f4;border-radius:10px;padding:14px;"><b style="font-size:22px;color:#082b23;">${workerCount}</b><br><span style="font-size:10px;color:#66756f;text-transform:uppercase;">Workers on site</span></td><td style="background:#f0f7f4;border-radius:10px;padding:14px;"><b style="font-size:16px;color:#082b23;">${escapeHtml(weather)}</b><br><span style="font-size:10px;color:#66756f;text-transform:uppercase;">Weather</span></td></tr></table><div style="font-size:10px;color:#0d6b57;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Work performed</div><p style="margin:7px 0 22px;color:#485b54;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(workPerformed)}</p><p style="margin:0;color:#72817c;font-size:11px;line-height:1.5;">The attached PDF contains the complete formatted field report and its supporting details.</p></div></div></div>`;
    const bodyText = [personalMessage, `DAILY FIELD REPORT - ${projectName} - ${reportDate}`, `Workers on site: ${workerCount}`, `Weather: ${weather}`, `Work performed: ${workPerformed}`, 'A complete PDF copy is attached.'].filter(Boolean).join('\n\n').replace(/[—–‑]/g, '-');
    return { bodyHtml, bodyText, pdfBase64, pdfSize: Math.round(pdfBase64.length * 0.75) };
  }

  return (
    <>
      <BrandedReportEmailDialog
        open={open}
        onOpenChange={(next) => { if (!next) onClose(); }}
        reportTitle={`Daily Field Report | ${reportDate}`}
        projectName={projectName}
        filename={reportFilename}
        defaultSubject={defaultSubject}
        defaultMessage="Please review the attached daily field report."
        projectId={projectId}
        sourceModule="daily-field-reports"
        reportType="daily_field_report"
        reportId={report.id}
        prepareDelivery={prepareDelivery}
        dialogTitle="Email the client-ready field report"
      />
      {open && (
        <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 860, background: '#fff' }}>
          <div id={DELIVERY_ELEMENT_ID}>
            <PrintableProjectDailyReport
              report={report}
              projectName={projectName}
              propertyName={propertyName}
              propertyAddress={propertyAddress}
              projectType={projectType}
              inspectorName={inspectorName}
            />
          </div>
        </div>
      )}
    </>
  );
}
