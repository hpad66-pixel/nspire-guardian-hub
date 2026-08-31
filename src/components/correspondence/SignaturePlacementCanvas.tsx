/**
 * Click-to-place signature on a PDF page (pdf.js canvas) or blank page mock.
 * Returns normalized percent coordinates so the stamp survives resize.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MousePointerClick } from "lucide-react";
import { ESignStamp } from "./ESignStamp";
import { base64ToBlob, MIME } from "@/lib/docs/render";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type SignaturePlacement = {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
};

export function SignaturePlacementCanvas({
  pdfBase64,
  signatureDataUrl,
  signerName,
  signedAt,
  initial,
  onConfirm,
  onCancel,
}: {
  pdfBase64?: string | null;
  signatureDataUrl: string;
  signerName: string;
  signedAt: string;
  initial?: SignaturePlacement | null;
  onConfirm: (placement: SignaturePlacement) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(Boolean(pdfBase64));
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(initial?.page ?? 1);
  const [placement, setPlacement] = useState<SignaturePlacement | null>(
    initial ?? { page: 1, xPct: 72, yPct: 82, widthPct: 28 },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!pdfBase64) {
        // Blank letter preview surface
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 720;
        canvas.height = 960;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#e7e5e0";
        ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
        ctx.fillStyle = "#a8a29a";
        ctx.font = "14px DM Sans, sans-serif";
        ctx.fillText("Click where the signature should appear", 48, 64);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await base64ToBlob(pdfBase64, MIME.pdf).arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const p = await pdf.getPage(Math.min(Math.max(1, page), pdf.numPages));
        const viewport = p.getViewport({ scale: 1.35 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        await p.render({ canvasContext: ctx, viewport }).promise;
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Couldn't render the PDF for placement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfBase64, page]);

  const onClick = (e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPlacement({
      page,
      xPct: Math.min(92, Math.max(8, xPct)),
      yPct: Math.min(94, Math.max(6, yPct)),
      widthPct: placement?.widthPct ?? 28,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
        <MousePointerClick className="h-4 w-4 shrink-0" />
        Click on the page to place your signature. Drag isn’t required — each click repositions it.
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Page</span>
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="tabular-nums font-medium">{page} / {pageCount}</span>
          <Button type="button" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <div className="relative overflow-auto rounded-xl border bg-[#525659] p-3 max-h-[55vh]">
        <div ref={wrapRef} className="relative mx-auto w-fit shadow-xl">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            </div>
          )}
          {error && <p className="bg-white p-4 text-sm text-rose-700">{error}</p>}
          <canvas
            ref={canvasRef}
            onClick={onClick}
            className="block max-w-full cursor-crosshair bg-white"
          />
          {/* Top-right Adobe-style stamp (always visible once signed) */}
          <div className="pointer-events-none absolute right-3 top-3 z-10 scale-90 origin-top-right">
            <ESignStamp name={signerName} signedAt={signedAt} compact />
          </div>
          {placement && placement.page === page && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${placement.xPct}%`, top: `${placement.yPct}%`, width: `${placement.widthPct}%` }}
            >
              <div className="rounded-md border border-emerald-600 bg-white/95 p-1.5 shadow-md">
                <img src={signatureDataUrl} alt="Signature" className="h-10 w-full object-contain" />
                <div className="mt-0.5 text-[10px] font-semibold text-emerald-950">{signerName}</div>
                <div className="text-[9px] text-emerald-700">Electronically signed</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Back</Button>
        <Button
          type="button"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!placement}
          onClick={() => placement && onConfirm(placement)}
        >
          Place signature &amp; lock
        </Button>
      </div>
    </div>
  );
}
