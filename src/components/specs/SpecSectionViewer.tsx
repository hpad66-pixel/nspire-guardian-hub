/**
 * B3 · SpecSectionViewer — renders the PDF pages for a single spec section
 * (or the entire set PDF if page bounds aren't defined) using pdf.js.
 */
import { useEffect, useState } from "react";
import type { SpecSection } from "@/hooks/useSpecs";
import { renderPage, signedUrlFor, getPageCount } from "@/lib/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SpecSectionViewerProps {
  /** The selected section — drives title, CSI number, page bounds. */
  section: SpecSection | null;
  /** Path to the combined spec PDF, relative to the `specs` bucket. */
  pdfPath: string | null;
}

export function SpecSectionViewer({ section, pdfPath }: SpecSectionViewerProps) {
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  const pageStart = section?.pdf_page_start ?? 1;
  const pageEnd = section?.pdf_page_end ?? null;

  // Reset page counter whenever the section changes.
  useEffect(() => { setPage(pageStart); }, [section?.id, pageStart]);

  useEffect(() => {
    if (!section || !pdfPath) {
      setPageImage(null);
      return;
    }
    (async () => {
      try {
        const signed = await signedUrlFor("specs", pdfPath);
        const count = await getPageCount(signed);
        setTotal(count);
        const img = await renderPage(signed, page, { scale: 1.2 });
        setPageImage(img);
        setErr(null);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [section, pdfPath, page]);

  if (!section) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center">
        Select a section to view its PDF pages.
      </div>
    );
  }

  const upper = pageEnd ?? total;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            Division {section.division}
            {section.revision ? ` · Rev ${section.revision}` : ""}
          </div>
          <div className="font-mono text-sm text-muted-foreground">{section.section_number}</div>
          <h3 className="text-lg font-semibold truncate">{section.title}</h3>
        </div>
        <Badge variant="outline">Page {page} of {upper}</Badge>
      </div>

      {!pdfPath ? (
        <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
          No PDF attached to this set.
        </div>
      ) : err ? (
        <div className="text-sm text-destructive p-4 border rounded-md">{err}</div>
      ) : !pageImage ? (
        <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">
          Rendering…
        </div>
      ) : (
        <div className="border rounded-md bg-muted/30 p-2 overflow-auto">
          <img src={pageImage} alt={`Page ${page}`} className="mx-auto block max-w-full" />
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button size="sm" variant="outline"
                onClick={() => setPage(Math.max(pageStart, page - 1))}
                disabled={page <= pageStart}>
          ← Prev
        </Button>
        <div className="text-xs text-muted-foreground">
          {pageEnd
            ? `Section bound to pages ${pageStart}–${pageEnd}`
            : "Section bounds unset — navigating entire PDF"}
        </div>
        <Button size="sm" variant="outline"
                onClick={() => setPage(Math.min(upper, page + 1))}
                disabled={page >= upper}>
          Next →
        </Button>
      </div>
    </div>
  );
}
