/**
 * ReconciledStamp — a celebratory green rubber-stamp/seal shown when a received
 * payment has been fully split (allocated) and is therefore reconciled. Two sizes:
 * the full stamp (with a certification seal + amount) and a compact inline badge.
 */
import { cn } from "@/lib/utils";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(n) || 0);

/** Notched certification seal with a checkmark, in emerald. */
function Seal({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      {/* starburst / notched ring */}
      <g fill="var(--apas-emerald)">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 22, r2 = 18.5;
          const cx = 24, cy = 24;
          return (
            <circle key={i} cx={cx + Math.cos(a) * (i % 2 ? r1 : r2)} cy={cy + Math.sin(a) * (i % 2 ? r1 : r2)} r="1.1" />
          );
        })}
      </g>
      <circle cx="24" cy="24" r="17" fill="none" stroke="var(--apas-emerald)" strokeWidth="2" />
      <circle cx="24" cy="24" r="13.5" fill="var(--apas-emerald)" opacity="0.12" />
      {/* check */}
      <path d="M17 24.5l4.5 4.5L31 19.5" stroke="var(--apas-emerald)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ReconciledStamp({ amount, label = "Reconciled", className }: { amount: number; label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border-2 border-[var(--apas-emerald)] bg-[var(--apas-emerald)]/8 px-4 py-2.5 shadow-sm -rotate-2 select-none",
        className,
      )}
      role="img"
      aria-label={`${label} ${money(amount)}`}
    >
      <Seal />
      <div className="leading-tight">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--apas-emerald)]">{label}</div>
        <div className="text-lg font-extrabold text-[var(--apas-emerald)] tabular-nums">{money(amount)}</div>
        <div className="text-[10px] font-medium text-[var(--apas-emerald)]/80 uppercase tracking-wider">Fully allocated</div>
      </div>
    </div>
  );
}

/** Compact pill for payment rows / lists. */
export function ReconciledBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[var(--apas-emerald)]/40 bg-[var(--apas-emerald)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--apas-emerald)]",
        className,
      )}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="var(--apas-emerald)" opacity="0.18" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke="var(--apas-emerald)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      Reconciled
    </span>
  );
}
