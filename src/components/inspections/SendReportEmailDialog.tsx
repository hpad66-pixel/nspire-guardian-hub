import { format, parseISO } from 'date-fns';
import { BrandedReportEmailDialog, type PreparedReportDelivery } from '@/components/reports/BrandedReportEmailDialog';
import { generatePDFBase64 } from '@/lib/generatePDF';

interface SendReportEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  reportElementId: string;
  statusSummary?: {
    ok: number;
    attention: number;
    defect: number;
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/[—–‑]/g, '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function SendReportEmailDialog({
  open,
  onOpenChange,
  inspectionId,
  propertyName,
  inspectorName,
  inspectionDate,
  reportElementId,
  statusSummary,
}: SendReportEmailDialogProps) {
  const formattedDate = format(parseISO(inspectionDate), 'MMMM d, yyyy');
  const pdfFilename = `daily-grounds-inspection-${format(parseISO(inspectionDate), 'yyyy-MM-dd')}.pdf`;
  const summary = statusSummary ?? { ok: 0, attention: 0, defect: 0 };

  async function prepareDelivery(personalMessage: string): Promise<PreparedReportDelivery> {
    const pdfBase64 = await generatePDFBase64({ elementId: reportElementId, scale: 2 });
    const personal = personalMessage
      ? `<div style="margin:0 0 20px;border-left:4px solid #dfbd67;background:#fff9e8;padding:14px 16px;color:#4b452f;font-size:15px;line-height:1.6;">${escapeHtml(personalMessage).replace(/\n/g, '<br>')}</div>`
      : '';
    const stat = (value: number, label: string, color: string) => `<td style="width:33.33%;background:#f4f8f6;border-radius:10px;padding:14px;"><b style="font-size:24px;color:${color};">${value}</b><br><span style="font-size:10px;color:#66756f;text-transform:uppercase;">${label}</span></td>`;
    const bodyHtml = `<div style="margin:0;background:#edf2ef;padding:20px 8px;font-family:Arial,sans-serif;color:#173a32;"><div style="max-width:700px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;"><div style="height:6px;background:#dfbd67;"></div><div style="background:#082b23;color:#fff;padding:28px;"><div style="color:#edce79;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">APAS Project Controls | Proj OS</div><h1 style="margin:16px 0 7px;font:700 28px/1.15 Georgia,serif;">Daily Grounds Inspection</h1><div style="color:#c9ddd6;font-size:14px;">${escapeHtml(propertyName)} | ${escapeHtml(formattedDate)}</div></div><div style="padding:24px 28px;">${personal}<table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:0 -8px 22px;"><tr>${stat(summary.ok, 'Acceptable', '#16794d')}${stat(summary.attention, 'Needs attention', '#a16107')}${stat(summary.defect, 'Defects', '#b42318')}</tr></table><p style="margin:0 0 8px;color:#485b54;font-size:14px;line-height:1.6;"><b>Inspector:</b> ${escapeHtml(inspectorName)}</p><p style="margin:0;color:#72817c;font-size:11px;line-height:1.5;">The attached PDF contains the complete inspection findings, photographs, and recorded field details.</p></div></div></div>`;
    const bodyText = [personalMessage, `DAILY GROUNDS INSPECTION - ${propertyName} - ${formattedDate}`, `Inspector: ${inspectorName}`, `Acceptable: ${summary.ok} | Needs attention: ${summary.attention} | Defects: ${summary.defect}`, 'The complete inspection report is attached as a PDF.'].filter(Boolean).join('\n\n').replace(/[—–‑]/g, '-');
    return { bodyHtml, bodyText, pdfBase64, pdfSize: Math.round(pdfBase64.length * 0.75) };
  }

  return (
    <BrandedReportEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      reportTitle={`Daily Grounds Inspection | ${formattedDate}`}
      projectName={propertyName}
      filename={pdfFilename}
      defaultSubject={`Daily Grounds Inspection - ${propertyName} - ${format(parseISO(inspectionDate), 'MMM d, yyyy')}`}
      defaultMessage="Please review the attached inspection report and the items requiring attention."
      sourceModule="daily-inspections"
      reportType="daily_inspection"
      dailyInspectionId={inspectionId}
      prepareDelivery={prepareDelivery}
      dialogTitle="Email the client-ready inspection report"
      htmlDescription="The inspection summary is readable directly in the message."
    />
  );
}
