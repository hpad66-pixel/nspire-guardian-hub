/**
 * Sign a change order in-app: draw a signature, stamp it into the document, then
 * produce the locked signed PDF and freeze the row. Once signed the CO is locked
 * (DB guard) — the signed version is immutable.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, PenLine } from "lucide-react";
import { ChangeOrderDocument } from "@/lib/changeOrder/ChangeOrderDocument";
import { nodeToPdfBlob } from "@/lib/changeOrder/generatePdf";
import { uploadCoArtifact } from "@/lib/changeOrder/storage";
import { fmtLongDate } from "@/lib/changeOrder/defaults";
import type { CoSpec } from "@/lib/changeOrder/types";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export function ChangeOrderSignDialog({
  open, onOpenChange, coId, spec, projectId, onSigned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  coId: string;
  spec: CoSpec | null;
  projectId: string;
  onSigned?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [hasInk, setHasInk] = useState(false);
  const [sigData, setSigData] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Set up the drawing canvas.
  useEffect(() => {
    if (!open) { setHasInk(false); setSigData(null); return; }
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = 460 * dpr; c.height = 150 * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2.2; ctx.strokeStyle = "#0a1a3a";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 460, 150);
  }, [open]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  const drawing = useRef(false);
  function down(e: React.PointerEvent<HTMLCanvasElement>) { drawing.current = true; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function move(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasInk(true); }
  function up() { drawing.current = false; if (hasInk && canvasRef.current) setSigData(canvasRef.current.toDataURL("image/png")); }
  function clear() { const c = canvasRef.current!; const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 460, 150); setHasInk(false); setSigData(null); }

  const signedSpec: CoSpec | null = spec
    ? { ...spec, signatures: { ...spec.signatures, submitted: { ...spec.signatures.submitted, date: fmtLongDate(new Date().toISOString().slice(0, 10)) } } }
    : null;

  async function handleSign() {
    if (!sigData || !signedSpec || !docRef.current) return toast.error("Draw your signature first.");
    setBusy(true);
    try {
      // Render the locked PDF with the signature stamped in (best-effort — a
      // PDF hiccup must never block locking the signed change order).
      await new Promise((r) => setTimeout(r, 50)); // let the hidden doc paint
      let pdfUrl: string | null = null;
      try {
        const pdf = await nodeToPdfBlob(docRef.current);
        pdfUrl = await uploadCoArtifact(pdf, projectId, "change-orders/signed", "pdf");
      } catch (pdfErr) {
        console.warn("Signed PDF generation failed (continuing):", pdfErr);
      }
      const sigUrl = await uploadCoArtifact(await dataUrlToBlob(sigData), projectId, "change-orders/sig", "png");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("change_orders" as any).update({
        spec: signedSpec,
        ...(pdfUrl ? { pdf_path: pdfUrl } : {}),
        submitted_signature_path: sigUrl,
        submitted_signed_at: new Date().toISOString(),
        submitted_signed_by: user?.id ?? null,
        locked: true,
        status: "submitted",
      } as any).eq("id", coId);
      if (error) throw error;
      toast.success("Change order signed and locked");
      onSigned?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-4 w-4" /> Sign change order</DialogTitle>
          <DialogDescription>Draw your signature. On signing, this version locks and can be sent to the client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            style={{ width: 460, height: 150, touchAction: "none" }}
            className="w-full rounded-md border bg-white cursor-crosshair"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={clear}><Eraser className="h-3.5 w-3.5 mr-1" />Clear</Button>
            <span className="text-xs text-muted-foreground self-center">{spec?.signatures.submitted.name} · {spec?.signatures.submitted.title}</span>
          </div>
        </div>

        {/* Hidden document used to rasterize the signed PDF */}
        <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
          {signedSpec && <ChangeOrderDocument ref={docRef} spec={signedSpec} signatures={{ submitted: sigData }} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSign} disabled={!hasInk || busy}>{busy ? "Signing…" : "Sign & lock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
