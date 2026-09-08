import { buildCorrespondenceHtml } from "@/lib/correspondence/correspondenceLetter";

export interface ClientReadyDocumentSource {
  title: string;
  source: string;
}

/**
 * Native Proj OS documents receive the APAS client letter treatment for output.
 * Uploaded Word documents keep their own exact letterhead and page design.
 */
export function clientReadyDocumentHtml(
  doc: ClientReadyDocumentSource,
  html: string,
  projectName?: string | null,
) {
  if (!["blank", "ai_draft"].includes(doc.source)) return html;
  return buildCorrespondenceHtml({
    subtitle: "Client document",
    subject: doc.title,
    body: html,
    projectName,
  });
}
