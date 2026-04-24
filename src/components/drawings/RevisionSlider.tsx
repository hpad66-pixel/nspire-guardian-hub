/**
 * B2 · RevisionSlider — compare current vs previous revision of a drawing.
 * Renders both page images via pdf-viewer and shows them side-by-side OR
 * with an opacity-fade swipe. Consumer passes the two revision rows.
 */
import { useState, useEffect } from "react";
import type { DrawingRevision } from "@/hooks/useDrawings";
import { renderPage, signedUrlFor } from "@/lib/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export interface RevisionSliderProps {
  current: DrawingRevision;
  previous?: DrawingRevision | null;
}

export function RevisionSlider({ current, previous }: RevisionSliderProps) {
  const [mode, setMode] = useState<"side-by-side" | "fade">("fade");
  const [fade, setFade] = useState<number[]>([50]);
  const [currentImg, setCurrentImg] = useState<string | null>(null);
  const [prevImg, setPrevImg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = await signedUrlFor("drawings", current.pdf_path);
        const img = await renderPage(url, 1, { scale: 1.5 });
        setCurrentImg(img);
      } catch (e: any) { setErr(e.message); }
    })();
  }, [current]);

  useEffect(() => {
    if (!previous) return;
    (async () => {
      try {
        const url = await signedUrlFor("drawings", previous.pdf_path);
        const img = await renderPage(url, 1, { scale: 1.5 });
        setPrevImg(img);
      } catch (e: any) { /* ignore */ }
    })();
  }, [previous]);

  if (!previous) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        No prior revision to compare — this is the first revision.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={mode === "fade" ? "default" : "outline"}
                onClick={() => setMode("fade")}>Fade</Button>
        <Button size="sm" variant={mode === "side-by-side" ? "default" : "outline"}
                onClick={() => setMode("side-by-side")}>Side-by-side</Button>
        <Badge variant="outline">Rev {previous.rev_number} ← Rev {current.rev_number}</Badge>
      </div>

      {err ? (
        <div className="text-sm text-destructive">{err}</div>
      ) : mode === "side-by-side" ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Previous · Rev {previous.rev_number}</div>
            {prevImg ? <img src={prevImg} alt="Previous" className="w-full border rounded" /> :
              <div className="h-64 bg-muted animate-pulse rounded" />}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current · Rev {current.rev_number}</div>
            {currentImg ? <img src={currentImg} alt="Current" className="w-full border rounded" /> :
              <div className="h-64 bg-muted animate-pulse rounded" />}
          </div>
        </div>
      ) : (
        <div>
          <div className="relative border rounded overflow-hidden">
            {prevImg && (
              <img src={prevImg} alt="Previous" className="block w-full" />
            )}
            {currentImg && (
              <img
                src={currentImg}
                alt="Current"
                className="absolute inset-0 w-full"
                style={{ opacity: (fade[0] ?? 50) / 100 }}
              />
            )}
          </div>
          <div className="flex items-center gap-2 pt-3">
            <span className="text-xs text-muted-foreground">Rev {previous.rev_number}</span>
            <Slider value={fade} onValueChange={setFade} min={0} max={100} step={1} />
            <span className="text-xs text-muted-foreground">Rev {current.rev_number}</span>
          </div>
        </div>
      )}
    </div>
  );
}
