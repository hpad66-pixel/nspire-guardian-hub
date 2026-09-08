/**
 * Client-ready document delivery. This deliberately reuses the universal APAS
 * report mailer so documents, inspections, financial reports, and photo reports
 * all have the same To / CC / BCC experience and delivery audit trail.
 */
import { BrandedReportEmailDialog } from "@/components/reports/BrandedReportEmailDialog";
import { buildCoverNoteHtml } from "@/lib/correspondence/correspondenceLetter";

export interface DocAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
  size: number;
}

export function EmailDocumentDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  defaultSubject,
  attachment,
  onSent,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  projectId: string;
  projectName?: string | null;
  defaultSubject: string;
  attachment: DocAttachment | null;
  onSent?: (recipients: string[]) => void | Promise<void>;
}) {
  return (
    <BrandedReportEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      reportTitle={defaultSubject}
      projectName={projectName || "Project document"}
      projectId={projectId}
      filename={attachment?.filename || `${defaultSubject}.pdf`}
      defaultSubject={`${defaultSubject}${projectName ? ` | ${projectName}` : ""}`}
      defaultMessage={`Please review the attached ${defaultSubject}. It has been prepared as a client-ready PDF for your records.`}
      sourceModule="project_documents"
      reportType="authored_document"
      dialogTitle="Email this document"
      htmlLabel="Branded cover email"
      htmlDescription="Your note is formatted for the client and readable in the email."
      attachmentLabel="Client-ready PDF attached"
      sendLabel="Send document + PDF"
      onSent={onSent}
      prepareDelivery={async (message) => {
        if (!attachment) throw new Error("The PDF is still being prepared. Close this window and try again.");
        const note = message.trim() || `Please review the attached ${defaultSubject}.`;
        return {
          bodyHtml: buildCoverNoteHtml({
            message: note,
            attachmentName: attachment.filename,
            projectName,
          }),
          bodyText: `${note}\n\nAttached: ${attachment.filename}${projectName ? `\nProject: ${projectName}` : ""}`,
          pdfBase64: attachment.contentBase64,
          pdfSize: attachment.size,
        };
      }}
    />
  );
}
