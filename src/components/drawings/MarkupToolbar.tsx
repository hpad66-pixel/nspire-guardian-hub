/**
 * B2 · MarkupToolbar — compact pill toolbar that the DrawingViewer + MarkupCanvas
 * pair consumes. Exposes the active tool and color.
 */
import { MousePointer2, MapPin, Square, ArrowRight, Type, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MarkupTool = "select" | "pin" | "rect" | "arrow" | "text" | "measure";

const TOOLS: Array<{ id: MarkupTool; label: string; Icon: any }> = [
  { id: "select",  label: "Select",   Icon: MousePointer2 },
  { id: "pin",     label: "Pin",      Icon: MapPin },
  { id: "rect",    label: "Rect",     Icon: Square },
  { id: "arrow",   label: "Arrow",    Icon: ArrowRight },
  { id: "text",    label: "Text",     Icon: Type },
  { id: "measure", label: "Measure",  Icon: Ruler },
];

const COLORS = ["#1D6FE8", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6", "#0a0a0a"];

export interface MarkupToolbarProps {
  tool: MarkupTool;
  color: string;
  onToolChange: (t: MarkupTool) => void;
  onColorChange: (c: string) => void;
  disabled?: boolean;
}

export function MarkupToolbar({ tool, color, onToolChange, onColorChange, disabled }: MarkupToolbarProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-1 bg-background w-fit">
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            size="sm"
            variant={tool === id ? "default" : "ghost"}
            onClick={() => onToolChange(id)}
            title={label}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-1 pr-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            className={`h-5 w-5 rounded-full border-2 ${
              color === c ? "border-primary" : "border-transparent"
            }`}
            style={{ background: c }}
            title={c}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
