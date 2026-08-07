/**
 * A dated, audit-friendly seal for vendor invoices that have actually been paid.
 * All critical styling is inline so the seal survives html2canvas/PDF capture.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const EMERALD = "#0F9F6E";
const EMERALD_DEEP = "#075E48";
const EMERALD_WASH = "rgba(15,159,110,0.08)";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

export function formatPaidStampDate(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SealIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="26" cy="26" r="23" stroke={EMERALD} strokeWidth="2.4" />
      <circle cx="26" cy="26" r="18.5" stroke={EMERALD} strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="26" cy="26" r="15" fill={EMERALD} opacity="0.1" />
      <path d="M17.5 26.5l5.2 5.2L35 19.8" stroke={EMERALD} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ProcessedPaidStampProps {
  processedDate?: string | null;
  paidDate: string;
  totalPaid: number;
  latestReference?: string | null;
  className?: string;
  style?: CSSProperties;
}

export function ProcessedPaidStamp({
  processedDate,
  paidDate,
  totalPaid,
  latestReference,
  className,
  style,
}: ProcessedPaidStampProps) {
  const processed = formatPaidStampDate(processedDate ?? paidDate);
  const paid = formatPaidStampDate(paidDate);
  const aria = [
    "Processed and paid",
    money(totalPaid),
    `processed ${processed}`,
    `paid ${paid}`,
    latestReference ? `reference ${latestReference}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div
      className={cn("inline-flex max-w-full select-none items-center gap-3 rounded-xl px-4 py-2.5", className)}
      style={{
        border: `2.5px solid ${EMERALD}`,
        backgroundColor: EMERALD_WASH,
        boxShadow: "inset 0 0 0 2px rgba(15,159,110,0.13), 0 2px 7px rgba(7,94,72,0.13)",
        transform: "rotate(-1.5deg)",
        color: EMERALD_DEEP,
        ...style,
      }}
      role="img"
      aria-label={aria}
    >
      <SealIcon />
      <div style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Processed &amp; Paid
        </div>
        <div style={{ marginTop: 2, color: EMERALD, fontSize: 19, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
          {money(totalPaid)}
        </div>
        <div style={{ marginTop: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.025em", textTransform: "uppercase" }}>
          Processed {processed} · Paid {paid}
        </div>
        {latestReference && (
          <div style={{ marginTop: 3, maxWidth: 330, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}>
            Ref {latestReference}
          </div>
        )}
      </div>
    </div>
  );
}
