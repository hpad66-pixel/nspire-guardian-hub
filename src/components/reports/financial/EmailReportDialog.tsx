/** Email a financial report as a branded HTML message and matching PDF. */
import { BrandedReportEmailDialog } from '@/components/reports/BrandedReportEmailDialog';
import { reportPdfBase64 } from '@/lib/reports/reportPdf';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function EmailReportDialog({
  open,
  onOpenChange,
  reportTitle,
  projectName,
  projectId,
  defaultSubject,
  filename,
  getNode,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  reportTitle: string;
  projectName: string;
  projectId?: string | null;
  defaultSubject: string;
  filename: string;
  getNode: () => HTMLElement | null;
}) {
  return (
    <BrandedReportEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      reportTitle={reportTitle}
      projectName={projectName}
      projectId={projectId}
      defaultSubject={defaultSubject}
      filename={filename}
      sourceModule="financial_reports"
      reportType="financial_report"
      defaultMessage={`Please review the ${reportTitle} for ${projectName}. The report is included below and attached as a PDF for your records.`}
      prepareDelivery={async (personalMessage) => {
        const node = getNode();
        if (!node) throw new Error("The report isn't ready yet. Reopen it and try again.");
        const { base64, size } = await reportPdfBase64(node);
        const note = personalMessage
          ? `<div style="margin:0 0 20px;border-left:4px solid #c4a35a;background:#fff9e8;padding:13px 15px;color:#4b452f;font:14px/1.6 Arial,sans-serif;">${escapeHtml(personalMessage).replace(/\n/g, '<br>')}</div>`
          : '';
        const bodyHtml = `<div style="margin:0;background:#f3f1ed;padding:20px 8px;"><div style="max-width:820px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="height:6px;background:#c4a35a;"></div><div style="background:#1a1714;color:#ffffff;padding:24px 28px;"><div style="color:#d9bd78;font:800 10px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">APAS Project Controls · Proj OS</div><h1 style="margin:10px 0 4px;font:700 27px Georgia,serif;">${escapeHtml(reportTitle)}</h1><div style="color:#d6d2cb;font:13px Arial,sans-serif;">${escapeHtml(projectName)}</div></div><div style="padding:24px 28px;">${note}<div style="font-family:Arial,sans-serif;">${node.innerHTML}</div><div style="margin-top:20px;border-top:2px solid #1a1714;padding-top:10px;color:#817c74;font:10px/1.5 Arial,sans-serif;">Client-ready HTML edition · A matching branded PDF is attached.</div></div></div></div>`;
        return {
          bodyHtml,
          bodyText: `${personalMessage}\n\n${reportTitle}\n${projectName}\n\nA matching branded PDF report is attached.`.trim(),
          pdfBase64: base64,
          pdfSize: size,
        };
      }}
    />
  );
}
