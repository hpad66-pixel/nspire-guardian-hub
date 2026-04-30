/**
 * B5 · DocumentPreviewer — renders the current (or any) version of a
 * pl_documents row using pdf.js for PDFs and a native <img> for images.
 * Falls back to a download card for everything else.
 */
import { useEffect, useState } from "react";
import type { ProjectDocument, ProjectDocumentVersion } from "@/hooks/useProjectDocuments";
import { DOCS_BUCKET } from "@/hooks/useProjectDocuments";
import { renderPage, signedUrlFor, getPageCount } from "@/lib/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileIcon } from "lucide-react";

export interface DocumentPreviewerProps {
  doc: ProjectDocument | null;
  /** Active version to preview — default is the current_version. */
  version: ProjectDocumentVersion | null;
}

export function DocumentPreviewer({ doc, version }: DocumentPreviewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  const isPdf = (doc?.mime ?? "").includes("pdf") ||
                (version?.storage_path.toLowerCase().endsWith(".pdf") ?? false);
  const isImage = (doc?.mime ?? "").startsWith("image/");

  useEffect(() => { setPdfPage(1); }, [version?.id]);

  useEffect(() => {
    if (!version) { setSignedUrl(null); return; }
    (async () => {
      try {
        const url = await signedUrlFor(DOCS_BUCKET, version.storage_path, 600);
        setSignedUrl(url);
        if (isPdf) {
          const n = await getPageCount(url);
          setPageCount(n);
          const img = await renderPage(url, pdfPage, { scale: 1.2 });
          setPdfImage(img);
        } else {
          setPdfImage(null);
        }
        setErr(null);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [version?.id, version?.storage_path, isPdf, pdfPage]);

  if (!doc) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
        Select a document to preview.
      </div>
    );
  }

  if (!version) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
        This document has no uploaded version.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium truncate">{doc.name}</h3>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="outline">v{version.version}</Badge>
            {version.note && <span className="truncate">· {version.note}</span>}
          </div>
        </div>
        {signedUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={signedUrl} target="_blank" rel="noreferrer" download={doc.name}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </a>
          </Button>
        )}
      </div>

      {err ? (
        <div className="text-sm text-destructive p-4 border rounded-md">{err}</div>
      ) : isPdf ? (
        pdfImage ? (
          <div className="border rounded-md bg-muted/30 p-2 overflow-auto">
            <img src={pdfImage} alt={`Page ${pdfPage}`} className="mx-auto block max-w-full" />
            <div className="flex justify-between items-center mt-2">
              <Button size="sm" variant="outline"
                      onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
                      disabled={pdfPage <= 1}>
                ← Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {pdfPage} of {pageCount}
              </span>
              <Button size="sm" variant="outline"
                      onClick={() => setPdfPage(Math.min(pageCount, pdfPage + 1))}
                      disabled={pdfPage >= pageCount}>
                Next →
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
            Rendering PDF…
          </div>
        )
      ) : isImage && signedUrl ? (
        <div className="border rounded-md bg-muted/30 p-2">
          <img src={signedUrl} alt={doc.name} className="max-w-full max-h-[60vh] mx-auto block" />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
          Inline preview unavailable — use the download button to open it.
        </div>
      )}
    </div>
  );
}
