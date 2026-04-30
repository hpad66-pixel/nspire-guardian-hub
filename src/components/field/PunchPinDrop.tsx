/**
 * C3 · PunchPinDrop — pick a drawing + revision + drop a single pin,
 * returning the inserted drawing_markups row. Used by punch-item forms to
 * associate a visual pin with the punch list entry via `drawing_markup_id`.
 *
 * The user flow is:
 *   1. Pick a drawing from the project's sheet index.
 *   2. We render the current revision's first page.
 *   3. User clicks once on the page to drop a pin (normalized x/y).
 *   4. We call `useMarkups().create()` to insert the markup and return its row.
 */
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDrawings, useDrawingRevisions, useMarkups } from "@/hooks/useDrawings";
import type { DrawingMarkup } from "@/hooks/useDrawings";
import { renderPage, signedUrlFor } from "@/lib/pdf-viewer";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

export function PunchPinDrop({
  open, onOpenChange, projectId, onDropped,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  /** Called with the inserted drawing_markups row after a successful drop. */
  onDropped: (markup: DrawingMarkup) => void;
}) {
  const { data: drawings = [] } = useDrawings(projectId);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const { data: revisions = [] } = useDrawingRevisions(drawingId);
  const current = revisions.find((r) => r.is_current) ?? revisions[0] ?? null;

  const { create } = useMarkups(current?.id ?? null);

  const [pageImage, setPageImage] = useState<string | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Render page whenever the active revision changes.
  useEffect(() => {
    if (!current) { setPageImage(null); return; }
    (async () => {
      try {
        const signed = await signedUrlFor("drawings", current.pdf_path);
        const img = await renderPage(signed, 1, { scale: 1.5 });
        setPageImage(img);
      } catch (e: any) {
        toast.error(e.message);
        setPageImage(null);
      }
    })();
    setPoint(null);
  }, [current?.id, current?.pdf_path, current]);

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPoint({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }

  async function handleConfirm() {
    if (!current || !point) return;
    try {
      const markup = await create.mutateAsync({
        geometry: { type: "pin", x: point.x, y: point.y },
        color: "#F43F5E",
      });
      onDropped(markup);
      toast.success("Pin dropped");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Drop a pin on a drawing</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Drawing</Label>
            <Select value={drawingId ?? ""} onValueChange={setDrawingId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  drawings.length === 0 ? "No drawings in this project" : "Pick a drawing…"
                } />
              </SelectTrigger>
              <SelectContent>
                {drawings.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="font-mono text-muted-foreground mr-2">
                      {d.sheet_number}
                    </span>
                    {d.title ?? d.sheet_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            ref={canvasRef}
            onClick={pageImage ? onCanvasClick : undefined}
            className="relative border rounded-md bg-muted/30 overflow-hidden"
            style={{ aspectRatio: "4/5", cursor: pageImage ? "crosshair" : "default" }}
          >
            {pageImage ? (
              <>
                <img src={pageImage} alt="" className="block max-w-full max-h-full mx-auto" />
                {point && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                  >
                    <MapPin className="h-6 w-6 text-[var(--apas-rose)] drop-shadow" fill="currentColor" />
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                {drawingId ? "Rendering drawing…" : "Pick a drawing to preview."}
              </div>
            )}
          </div>
          {current && (
            <p className="text-xs text-muted-foreground">
              {point
                ? "Click elsewhere to move the pin, or Confirm to save."
                : "Click on the drawing to drop a pin."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={create.isPending || !point}>
            {create.isPending ? "Saving…" : "Confirm pin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
