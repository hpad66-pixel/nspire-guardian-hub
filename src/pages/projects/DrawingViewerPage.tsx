/**
 * B2 · DrawingViewerPage — renders a single drawing's current revision via
 * pdf.js, overlays MarkupCanvas, and wires the PinLinkDialog + RevisionSlider.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDrawingRevisions, type DrawingMarkup } from "@/hooks/useDrawings";
import { renderPage, signedUrlFor, getPageCount } from "@/lib/pdf-viewer";
import { MarkupCanvas } from "@/components/drawings/MarkupCanvas";
import { MarkupToolbar, type MarkupTool } from "@/components/drawings/MarkupToolbar";
import { RevisionSlider } from "@/components/drawings/RevisionSlider";
import { PinLinkDialog } from "@/components/drawings/PinLinkDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DrawingViewerPage() {
  const { drawingId } = useParams<{ drawingId: string }>();

  const { data: drawing } = useQuery({
    queryKey: ["drawing", drawingId],
    enabled: Boolean(drawingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawings" as any).select("*")
        .eq("id", drawingId!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: revisions = [] } = useDrawingRevisions(drawingId ?? null);
  const current = revisions.find((r) => r.is_current) ?? revisions[0];
  const previous = revisions.find((r) => !r.is_current) ?? null;

  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [tool, setTool] = useState<MarkupTool>("select");
  const [color, setColor] = useState("#1D6FE8");
  const [linkMarkup, setLinkMarkup] = useState<DrawingMarkup | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    (async () => {
      try {
        const signed = await signedUrlFor("drawings", current.pdf_path);
        const count = await getPageCount(signed);
        setPageCount(count);
        const img = await renderPage(signed, pageNumber, { scale: 1.5 });
        setPageUrl(img);
        setErr(null);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [current, pageNumber]);

  if (!drawing) return <div className="p-6 text-muted-foreground">Loading drawing…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-4">
      <div>
        <Link
          to={`/projects/${drawing.project_id}/drawings`}
          className="text-sm text-muted-foreground hover:underline"
        >← Drawings</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">{drawing.sheet_number}</span>
              {drawing.title ?? ""}
            </h1>
            <div className="text-muted-foreground">
              {drawing.discipline ?? "—"} · Rev {current?.rev_number ?? "—"}
            </div>
          </div>
          <Badge variant="outline">
            Page {pageNumber} of {pageCount}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="view">
        <TabsList>
          <TabsTrigger value="view">View & markup</TabsTrigger>
          <TabsTrigger value="revisions">Revisions · {revisions.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <MarkupToolbar
                tool={tool} color={color}
                onToolChange={setTool} onColorChange={setColor}
              />
              <div className="flex gap-1">
                <Button
                  size="sm" variant="outline"
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                >← Prev</Button>
                <Button
                  size="sm" variant="outline"
                  onClick={() => setPageNumber(Math.min(pageCount, pageNumber + 1))}
                  disabled={pageNumber >= pageCount}
                >Next →</Button>
              </div>
            </CardHeader>
            <CardContent>
              {err ? (
                <div className="text-sm text-destructive p-4">{err}</div>
              ) : !current ? (
                <div className="text-sm text-muted-foreground p-8 text-center">
                  No revision uploaded.
                </div>
              ) : (
                <MarkupCanvas
                  revisionId={current.id}
                  imageUrl={pageUrl ?? undefined}
                  onPinClick={(m) => setLinkMarkup(m)}
                  readOnly={tool === "select"}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card>
            <CardHeader><CardTitle>Revision history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="divide-y text-sm">
                {revisions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-mono mr-2">Rev {r.rev_number}</span>
                      <span className="text-muted-foreground">
                        {new Date(r.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.is_current && <Badge>Current</Badge>}
                  </div>
                ))}
              </div>

              {current && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Compare current vs previous</div>
                  <RevisionSlider current={current} previous={previous} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PinLinkDialog
        open={!!linkMarkup}
        onOpenChange={(o) => !o && setLinkMarkup(null)}
        markup={linkMarkup}
      />
    </div>
  );
}
