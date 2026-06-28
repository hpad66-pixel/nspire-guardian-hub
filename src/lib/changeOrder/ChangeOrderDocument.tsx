/**
 * APAS-format change order rendered as styled HTML. Used for the on-screen
 * preview and as the source for the locked signed PDF (html2canvas → jsPDF).
 * Inline styles only, so it rasterizes identically regardless of app theme.
 */
import { forwardRef } from "react";
import type { CoSpec, CoBlock, CoSection } from "./types";
import { recomputePricing } from "./pricing";

const GOLD = "#C4A35A";
const INK = "#1A1714";
const MUTE = "#6B6B6B";

export interface SignatureImages {
  submitted?: string | null; // image URL/data for APAS signature
  accepted?: string | null; // image URL/data for owner signature
}

function Blocks({ blocks }: { blocks: CoBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("p" in b) return b.p ? <p key={i} style={{ margin: "0 0 8px", lineHeight: 1.5 }}>{b.p}</p> : null;
        if ("p_bold" in b) return <p key={i} style={{ margin: "0 0 8px", fontWeight: 700 }}>{b.p_bold}</p>;
        if ("sub" in b) return <p key={i} style={{ margin: "10px 0 6px", color: GOLD, fontStyle: "italic", fontWeight: 700 }}>{b.sub}</p>;
        if ("bullets" in b) return <ul key={i} style={{ margin: "0 0 8px", paddingLeft: 20 }}>{b.bullets.filter(Boolean).map((t, j) => <li key={j} style={{ marginBottom: 4, lineHeight: 1.45 }}><span style={{ color: GOLD }}>▪</span>&nbsp;{t}</li>)}</ul>;
        if ("numbered" in b) return <ol key={i} style={{ margin: "0 0 8px", paddingLeft: 22 }}>{b.numbered.filter(Boolean).map((t, j) => <li key={j} style={{ marginBottom: 4 }}>{t}</li>)}</ol>;
        return null;
      })}
    </>
  );
}

function Section({ s }: { s: CoSection }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ color: GOLD, fontSize: 13, fontWeight: 700, margin: "0 0 6px", letterSpacing: 0.3 }}>{s.heading}</h3>
      <div style={{ fontSize: 12.5, color: INK }}><Blocks blocks={s.blocks} /></div>
    </div>
  );
}

const STAMP = "#B0322B"; // classic stamp red

/** Beautiful "EXECUTED" rubber-stamp, rasterizes cleanly via html2canvas
 *  (solid borders + opacity + transform only — no blend modes or filters). */
function ExecutedStamp({ date }: { date?: string | null }) {
  return (
    <div
      aria-label="Executed"
      style={{
        position: "absolute", top: 28, right: 34, transform: "rotate(-13deg)",
        opacity: 0.88, color: STAMP, textAlign: "center",
        border: `3px solid ${STAMP}`, borderRadius: 10, padding: "7px 20px 5px",
        fontFamily: "Georgia, 'Times New Roman', serif", pointerEvents: "none",
      }}
    >
      <div style={{ position: "absolute", inset: 3, border: `1px solid ${STAMP}`, borderRadius: 7 }} />
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, lineHeight: 1 }}>EXECUTED</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>
        {date ? `Fully executed · ${date}` : "Fully executed"}
      </div>
    </div>
  );
}

export const ChangeOrderDocument = forwardRef<
  HTMLDivElement,
  { spec: CoSpec; signatures?: SignatureImages; executed?: boolean; executedDate?: string | null }
>(
  function ChangeOrderDocument({ spec: specIn, signatures, executed, executedDate }, ref) {
    const spec = { ...specIn, pricing: recomputePricing(specIn.pricing) };
    const { from, to } = spec.parties;
    const td: React.CSSProperties = { padding: "5px 8px", fontSize: 11, borderBottom: "1px solid #eee" };
    const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, fontWeight: 700, background: "#F3EFE6", textAlign: "left", borderBottom: `1px solid ${GOLD}` };

    return (
      <div ref={ref} style={{ position: "relative", width: 720, background: "#fff", color: INK, fontFamily: "Georgia, 'Times New Roman', serif", padding: 40, boxSizing: "border-box" }}>
        {executed && <ExecutedStamp date={executedDate} />}
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{spec.doc.wordmark || "APAS CONSULTING"}</div>
        <div style={{ height: 3, background: GOLD, margin: "6px 0 18px" }} />

        <div style={{ fontSize: 18, fontWeight: 700 }}>CHANGE ORDER PROPOSAL · No. {spec.doc.co_number}</div>
        {spec.doc.title && <div style={{ fontStyle: "italic", color: MUTE, fontSize: 14, margin: "2px 0 16px" }}>{spec.doc.title}</div>}

        <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: GOLD, fontWeight: 700, fontSize: 10 }}>FROM</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{from.name}</div>
            <div style={{ fontSize: 11 }}>{from.address}</div><div style={{ fontSize: 11 }}>{from.city}</div>
            <div style={{ fontSize: 11 }}>{[from.contact, from.title].filter(Boolean).join(", ")}</div>
            <div style={{ fontSize: 11, color: MUTE }}>{from.email}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: GOLD, fontWeight: 700, fontSize: 10 }}>TO</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{to.name}</div>
            {to.attn && <div style={{ fontSize: 11 }}>{to.attn}</div>}
            <div style={{ fontSize: 11 }}>{to.address}</div><div style={{ fontSize: 11 }}>{to.city}</div>
            <div style={{ fontSize: 11 }}>{to.contact}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd", marginBottom: 16 }}>
          <tbody>
            {([["Project", spec.parties.project], ["Date", spec.doc.date], ["CO No.", spec.doc.co_label || spec.doc.co_number], ["Contract", spec.parties.contract],
              ...(spec.parties.subject ? [["Subject", spec.parties.subject]] : []), ...(spec.parties.basis ? [["Basis", spec.parties.basis]] : [])] as [string, string][]).map(([k, v]) => (
              <tr key={k}><td style={{ ...td, width: "22%", color: MUTE, fontWeight: 700 }}>{k}</td><td style={td}>{v}</td></tr>
            ))}
          </tbody>
        </table>

        {spec.sections.map((s, i) => <Section key={i} s={s} />)}

        {spec.pricing && (
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ color: GOLD, fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>{spec.pricing.heading || "PRICING"}</h3>
            {spec.pricing.intro && <p style={{ fontSize: 12, margin: "0 0 8px" }}>{spec.pricing.intro}</p>}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>#</th><th style={th}>Description</th><th style={th}>Unit</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={{ ...th, textAlign: "right" }}>Unit $</th><th style={{ ...th, textAlign: "right" }}>Extended</th><th style={th}>Basis</th></tr></thead>
              <tbody>
                {spec.pricing.groups.map((g, gi) => (
                  <>
                    <tr key={`g${gi}`}><td colSpan={7} style={{ ...td, background: "#FAF8F4", fontWeight: 700 }}>{g.label}</td></tr>
                    {g.rows.map((r, ri) => (
                      <tr key={`g${gi}r${ri}`}><td style={td}>{r.n}</td><td style={td}>{r.desc}</td><td style={td}>{r.unit}</td><td style={{ ...td, textAlign: "right" }}>{r.qty}</td><td style={{ ...td, textAlign: "right" }}>{r.unit_cost}</td><td style={{ ...td, textAlign: "right" }}>{r.extended}</td><td style={td}>{r.basis}</td></tr>
                    ))}
                    {g.subtotal && <tr key={`g${gi}s`}><td colSpan={5} style={{ ...td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{g.subtotal.label}</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{g.subtotal.amount}</td><td style={td}></td></tr>}
                  </>
                ))}
                {spec.pricing.markups.map((m, mi) => (
                  <tr key={`m${mi}`}><td colSpan={5} style={{ ...td, textAlign: "right", color: MUTE, borderBottom: "none" }}>{m.label}</td><td style={{ ...td, textAlign: "right" }}>{m.amount}</td><td style={td}>{m.basis}</td></tr>
                ))}
                <tr><td colSpan={5} style={{ padding: "8px", textAlign: "right", background: GOLD, color: "#fff", fontWeight: 700, fontSize: 12 }}>{spec.pricing.grand_total.label}</td><td colSpan={2} style={{ padding: "8px", textAlign: "right", background: GOLD, color: "#fff", fontWeight: 800, fontSize: 14 }}>{spec.pricing.grand_total.amount}</td></tr>
              </tbody>
            </table>
            {spec.pricing.footnote && <p style={{ fontSize: 10.5, color: MUTE, marginTop: 6 }}>{spec.pricing.footnote}</p>}
          </div>
        )}

        {spec.sections_after_pricing.map((s, i) => <Section key={`ap${i}`} s={s} />)}

        <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
          {([["SUBMITTED BY", spec.signatures.submitted, signatures?.submitted], ["ACCEPTED & AUTHORIZED", spec.signatures.accepted, signatures?.accepted]] as const).map(([label, s, img], i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 10 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "pre-line" }}>{s.company}</div>
              <div style={{ height: 44, borderBottom: `1px solid ${INK}`, display: "flex", alignItems: "flex-end" }}>
                {img && <img src={img} alt="signature" crossOrigin="anonymous" style={{ maxHeight: 42, maxWidth: "90%" }} />}
              </div>
              <div style={{ fontSize: 11, marginTop: 3 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: MUTE }}>{s.title}</div>
              <div style={{ fontSize: 11, color: MUTE }}>Date: {s.date || "____________"}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `2px solid ${GOLD}`, marginTop: 20, paddingTop: 6, fontSize: 9.5, color: MUTE }}>{spec.doc.footer}</div>
      </div>
    );
  },
);
