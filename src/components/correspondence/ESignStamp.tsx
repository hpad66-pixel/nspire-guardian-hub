/**
 * Adobe-style "Electronically Signed" certificate badge — sleek green seal
 * used on Doc Studio previews, PDFs, and public sign pages.
 */
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ESignStamp({
  name,
  signedAt,
  className,
  compact = false,
}: {
  name?: string | null;
  signedAt?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const when = signedAt
    ? new Date(signedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border-2 border-emerald-600/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 shadow-[0_1px_0_rgba(5,150,105,0.15),0_8px_20px_-12px_rgba(5,150,105,0.55)]",
        compact ? "max-w-[220px]" : "max-w-[280px]",
        className,
      )}
      data-testid="esign-stamp"
    >
      <div className="flex items-center justify-center bg-emerald-600 px-2 text-white">
        <ShieldCheck className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <div className={cn("min-w-0 px-2.5", compact ? "py-1" : "py-1.5")}>
        <div className={cn(
          "font-bold uppercase tracking-[0.14em] text-emerald-700",
          compact ? "text-[9px]" : "text-[10px]",
        )}>
          Electronically Signed
        </div>
        {name && (
          <div className={cn("truncate font-semibold text-emerald-950", compact ? "text-[11px]" : "text-xs")}>
            {name}
          </div>
        )}
        {when && (
          <div className="truncate text-[10px] text-emerald-800/80">{when}</div>
        )}
        <div className="text-[9px] tracking-wide text-emerald-700/70">Verified · projOS</div>
      </div>
    </div>
  );
}

/** HTML fragment for injecting the stamp into letter HTML / PDF rasterizations. */
export function buildESignStampHtml(opts: {
  name?: string | null;
  signedAt?: string | null;
  position?: "top-right" | "inline";
}): string {
  const name = (opts.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const when = opts.signedAt
    ? new Date(opts.signedAt).toLocaleString(undefined, {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "";
  const wrapStyle = opts.position === "inline"
    ? "display:inline-block;margin:8px 0;"
    : "position:absolute;top:12px;right:16px;z-index:40;";

  return `
<div data-esign-stamp="1" style="${wrapStyle}max-width:260px;border:2px solid #059669;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#ecfdf5,#fff 55%,#ecfdf5);font-family:'DM Sans',system-ui,sans-serif;box-shadow:0 8px 20px -12px rgba(5,150,105,.55);">
  <div style="display:flex;align-items:stretch;">
    <div style="background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 10px;font-size:16px;font-weight:700;">✓</div>
    <div style="padding:6px 10px;min-width:0;">
      <div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#047857;">Electronically Signed</div>
      ${name ? `<div style="font-size:12px;font-weight:700;color:#064e3b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>` : ""}
      ${when ? `<div style="font-size:10px;color:#065f46;">${when}</div>` : ""}
      <div style="font-size:9px;color:#047857;opacity:.8;letter-spacing:.04em;">Verified · projOS</div>
    </div>
  </div>
</div>`;
}

/** Signature block HTML placed at a relative position (percent of container). */
export function buildSignaturePlacementHtml(opts: {
  signatureDataUrl: string;
  name: string;
  signedAt: string;
  xPct: number;
  yPct: number;
  widthPct?: number;
}): string {
  const name = opts.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const width = Math.min(42, Math.max(18, opts.widthPct ?? 28));
  const when = new Date(opts.signedAt).toLocaleString();
  return `
<div data-esign-signature="1" style="position:absolute;left:${opts.xPct}%;top:${opts.yPct}%;width:${width}%;transform:translate(-50%,-50%);z-index:35;pointer-events:none;">
  <div style="border:1px solid #059669;border-radius:6px;background:rgba(255,255,255,.92);padding:6px 8px;box-shadow:0 2px 8px rgba(5,150,105,.18);">
    <img src="${opts.signatureDataUrl}" alt="Signature" style="display:block;max-width:100%;height:48px;object-fit:contain;" />
    <div style="font-size:10px;color:#064e3b;font-weight:600;margin-top:2px;">${name}</div>
    <div style="font-size:9px;color:#047857;">Electronically signed · ${when}</div>
  </div>
</div>`;
}
