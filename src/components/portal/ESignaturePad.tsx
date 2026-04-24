/**
 * T4.16 · ESignaturePad
 *
 * Canvas-based signature capture for owner OCO approvals. Draws at device
 * pixel ratio for crisp output, serializes to PNG, uploads to the
 * owner-signatures bucket, returns the storage path.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface ESignaturePadProps {
  width?: number;
  height?: number;
  /** Called with the storage path after upload completes. */
  onSigned?: (storagePath: string) => void;
  /** Called when the canvas is cleared. */
  onCleared?: () => void;
  disabled?: boolean;
  /** Custom storage bucket (default: owner-signatures). */
  bucket?: string;
  /** Subfolder under the tenant id. */
  subfolder?: string;
}

export function ESignaturePad({
  width = 480, height = 160,
  onSigned, onCleared, disabled = false,
  bucket = "owner-signatures",
  subfolder = "oco",
}: ESignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Scale for retina
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0a0a0a";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
  }, [width, height]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || disabled) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const onUp = () => { setDrawing(false); };

  const clear = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasInk(false);
    onCleared?.();
  }, [width, height, onCleared]);

  const save = async () => {
    if (!hasInk || uploading) return;
    setUploading(true);
    try {
      const tenant_id = await requireTenantId();
      const path = `${tenant_id}/${subfolder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
      const blob = await new Promise<Blob | null>((res) => canvasRef.current!.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed to serialize signature");
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: "image/png", upsert: false,
      });
      if (error) throw error;
      onSigned?.(path);
    } catch (err) {
      console.error("[ESignaturePad] upload failed:", (err as Error).message);
      alert(`Signature upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`touch-none ${disabled ? "opacity-50" : "cursor-crosshair"}`}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {hasInk ? "Sign then click Save" : "Sign above"}
        </span>
        <div className="flex gap-2">
          <Button
            type="button" variant="outline" size="sm"
            onClick={clear} disabled={!hasInk || disabled || uploading}
          >
            <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
          <Button
            type="button" size="sm"
            onClick={save} disabled={!hasInk || disabled || uploading}
          >
            {uploading ? "Uploading…" : "Save signature"}
          </Button>
        </div>
      </div>
    </div>
  );
}
