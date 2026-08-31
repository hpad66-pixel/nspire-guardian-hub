/**
 * Elegant "Electronically Signed" certificate seal — used on Doc Studio
 * previews, burned into PDF downloads/emails, and public sign pages.
 */
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
        "relative inline-flex items-center gap-2.5 overflow-hidden rounded-lg border border-emerald-700/70 bg-[#FBFDF9] shadow-[0_1px_0_rgba(4,120,87,0.12),0_10px_24px_-14px_rgba(4,120,87,0.45)]",
        "before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[6px] before:border before:border-emerald-700/25",
        compact ? "max-w-[230px] px-2 py-1.5" : "max-w-[290px] px-2.5 py-2",
        className,
      )}
      data-testid="esign-stamp"
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-inner ring-1 ring-white/50",
          compact ? "h-7 w-7" : "h-9 w-9",
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "font-bold uppercase tracking-[0.16em] text-emerald-800",
            compact ? "text-[8.5px]" : "text-[9.5px]",
          )}
        >
          Electronically Signed
        </div>
        {name && (
          <div
            className={cn(
              "truncate font-semibold tracking-tight text-slate-900",
              compact ? "text-[11px]" : "text-xs",
            )}
          >
            {name}
          </div>
        )}
        {when && (
          <div className={cn("truncate text-emerald-800/85", compact ? "text-[9px]" : "text-[10px]")}>
            {when}
          </div>
        )}
        <div className="text-[8.5px] font-medium tracking-[0.06em] text-emerald-700/70">
          Secured by projOS
        </div>
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
    : "position:absolute;top:14px;right:16px;z-index:40;";

  return `
<div data-esign-stamp="1" style="${wrapStyle}max-width:270px;border:1px solid rgba(4,120,87,.72);border-radius:10px;background:#FBFDF9;font-family:'DM Sans',system-ui,sans-serif;box-shadow:0 1px 0 rgba(4,120,87,.12),0 10px 24px -14px rgba(4,120,87,.45);overflow:hidden;">
  <div style="margin:3px;border:1px solid rgba(4,120,87,.22);border-radius:7px;padding:7px 9px;display:flex;align-items:center;gap:10px;">
    <div style="width:34px;height:34px;border-radius:999px;background:linear-gradient(145deg,#34d399,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);flex-shrink:0;">✓</div>
    <div style="min-width:0;">
      <div style="font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#065f46;">Electronically Signed</div>
      ${name ? `<div style="font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${name}</div>` : ""}
      ${when ? `<div style="font-size:10px;color:#047857;margin-top:1px;">${when}</div>` : ""}
      <div style="font-size:8.5px;color:#047857;opacity:.75;letter-spacing:.06em;margin-top:1px;">Secured by projOS</div>
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
  const when = new Date(opts.signedAt).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  return `
<div data-esign-signature="1" style="position:absolute;left:${opts.xPct}%;top:${opts.yPct}%;width:${width}%;transform:translate(-50%,-50%);z-index:35;pointer-events:none;">
  <div style="border:1px solid #059669;border-radius:8px;background:rgba(255,255,255,.95);padding:7px 9px;box-shadow:0 2px 10px rgba(5,150,105,.16);">
    <img src="${opts.signatureDataUrl}" alt="Signature" style="display:block;max-width:100%;height:48px;object-fit:contain;" />
    <div style="font-size:10px;color:#064e3b;font-weight:600;margin-top:3px;">${name}</div>
    <div style="font-size:9px;color:#047857;">Electronically signed · ${when}</div>
  </div>
</div>`;
}
