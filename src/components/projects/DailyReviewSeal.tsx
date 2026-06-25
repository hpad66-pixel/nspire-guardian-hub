/**
 * "Reviewed" rubber-stamp seal applied by an admin/PM to a submitted daily report.
 * Inline hex colors (not Tailwind opacity-on-var) so it renders crisply on screen,
 * in the PDF capture, and in print. A compact badge variant rides on list rows.
 */
const EMERALD = "#10B981";
const EMERALD_DEEP = "#0F6E56";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

function Seal({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <g fill={EMERALD}>
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = i % 2 ? 22 : 18.5;
          return <circle key={i} cx={24 + Math.cos(a) * r} cy={24 + Math.sin(a) * r} r="1.1" />;
        })}
      </g>
      <circle cx="24" cy="24" r="17" fill="none" stroke={EMERALD} strokeWidth="2" />
      <circle cx="24" cy="24" r="13.5" fill={EMERALD} opacity="0.12" />
      <path d="M17 24.5l4.5 4.5L31 19.5" stroke={EMERALD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function DailyReviewSeal({ name, at }: { name?: string | null; at?: string | null }) {
  return (
    <div
      className="inline-flex items-center gap-3 rounded-xl px-4 py-2.5 select-none -rotate-2"
      style={{ border: `2px solid ${EMERALD}`, backgroundColor: "rgba(16,185,129,0.08)" }}
      role="img"
      aria-label={`Reviewed by ${name ?? ""} ${fmtDate(at)}`}
    >
      <Seal />
      <div className="leading-tight">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: EMERALD_DEEP }}>Reviewed</div>
        {name && <div className="text-sm font-bold" style={{ color: EMERALD }}>{name}</div>}
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EMERALD_DEEP }}>{fmtDate(at)}</div>
      </div>
    </div>
  );
}

export function DailyReviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className ?? ""}`}
      style={{ border: "1px solid rgba(16,185,129,0.45)", backgroundColor: "rgba(16,185,129,0.12)", color: EMERALD_DEEP }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill={EMERALD} opacity="0.2" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke={EMERALD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      Reviewed
    </span>
  );
}
