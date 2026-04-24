/**
 * T4.13 · Drawing markup canvas — pin-drop + link to RFI/Punch/Photo.
 *
 * This component renders an <img> of the drawing revision (or a placeholder
 * grid) and lets users click to drop a pin. Each pin persists as a row in
 * drawing_markups with geometry jsonb = { type: 'pin', x, y } where x/y are
 * normalized 0-1 coordinates (resolution-independent).
 *
 * For PDF drawings, the caller should render the page to a data URL (e.g.
 * via pdf.js) and pass as `imageUrl`. Rendering the PDF itself is out of
 * scope for this component; this is the interaction layer.
 */
import { useState, useRef } from "react";
import { useMarkups, type DrawingMarkup } from "@/hooks/useDrawings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MousePointer2, MapPin, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface MarkupCanvasProps {
  revisionId: string;
  imageUrl?: string;
  /** When a pin is clicked, the caller can open a link dialog. */
  onPinClick?: (markup: DrawingMarkup) => void;
  readOnly?: boolean;
}

type Tool = "select" | "pin" | "rect";

export function MarkupCanvas({ revisionId, imageUrl, onPinClick, readOnly = false }: MarkupCanvasProps) {
  const { data: markups = [], create } = useMarkups(revisionId);
  const [tool, setTool] = useState<Tool>("select");
  const [rectDraft, setRectDraft] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  function normalized(e: React.MouseEvent<HTMLDivElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  async function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (readOnly || tool !== "pin") return;
    const { x, y } = normalized(e);
    try {
      await create.mutateAsync({ geometry: { type: "pin", x, y } });
      toast.success("Pin dropped");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (readOnly || tool !== "rect") return;
    const { x, y } = normalized(e);
    setRectDraft({ x, y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!rectDraft) return;
    const { x, y } = normalized(e);
    setRectDraft({ ...rectDraft, w: x - rectDraft.x, h: y - rectDraft.y });
  }

  async function handleMouseUp() {
    if (!rectDraft) return;
    if (Math.abs(rectDraft.w) > 0.01 && Math.abs(rectDraft.h) > 0.01) {
      const { x, y, w, h } = rectDraft;
      const normalizedRect = {
        type: "rect",
        x: Math.min(x, x + w),
        y: Math.min(y, y + h),
        w: Math.abs(w),
        h: Math.abs(h),
      };
      try {
        await create.mutateAsync({ geometry: normalizedRect });
        toast.success("Rectangle drawn");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
    setRectDraft(null);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 border rounded-md p-1 w-fit">
          <Button
            size="sm" variant={tool === "select" ? "default" : "ghost"}
            onClick={() => setTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm" variant={tool === "pin" ? "default" : "ghost"}
            onClick={() => setTool("pin")}
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            size="sm" variant={tool === "rect" ? "default" : "ghost"}
            onClick={() => setTool("rect")}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="ml-2">{markups.length} markups</Badge>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative border rounded-md overflow-hidden bg-muted/10 select-none"
        style={{ aspectRatio: "8.5 / 11", cursor: tool === "pin" ? "crosshair" : tool === "rect" ? "crosshair" : "default" }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Drawing" className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Drawing preview not rendered (PDF page render requires pdfjs integration)
          </div>
        )}

        {/* Rect draft */}
        {rectDraft && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
            style={{
              left: `${Math.min(rectDraft.x, rectDraft.x + rectDraft.w) * 100}%`,
              top: `${Math.min(rectDraft.y, rectDraft.y + rectDraft.h) * 100}%`,
              width: `${Math.abs(rectDraft.w) * 100}%`,
              height: `${Math.abs(rectDraft.h) * 100}%`,
            }}
          />
        )}

        {/* Rendered markups */}
        {(markups as DrawingMarkup[]).map((m) => {
          const g = m.geometry as any;
          if (g?.type === "pin") {
            return (
              <button
                key={m.id}
                className="absolute w-6 h-6 -translate-x-1/2 -translate-y-full text-white hover:scale-110 transition"
                style={{ left: `${g.x * 100}%`, top: `${g.y * 100}%`, color: m.color }}
                onClick={(e) => { e.stopPropagation(); onPinClick?.(m); }}
                title={m.text ?? (m.linked_record_type ? `Linked to ${m.linked_record_type}` : "Pin")}
              >
                <MapPin className="h-6 w-6" style={{ color: m.color, fill: m.color }} />
              </button>
            );
          }
          if (g?.type === "rect") {
            return (
              <div
                key={m.id}
                className="absolute border-2 pointer-events-none"
                style={{
                  left: `${g.x * 100}%`, top: `${g.y * 100}%`,
                  width: `${g.w * 100}%`, height: `${g.h * 100}%`,
                  borderColor: m.color,
                }}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
