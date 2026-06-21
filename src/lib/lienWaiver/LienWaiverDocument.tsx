import { forwardRef } from "react";
import type { LienWaiverSpec } from "./types";
import {
  waiverTitle, waiverShortLabel, effectivenessNotice, operativeClauses,
  paymentBlock, exceptionItems, representations, disclaimer,
} from "./templates";

const INK = "#1A1714";
const GOLD = "#C4A35A";
const MUTE = "#6B6B6B";
const LIGHT = "#F4EFE6";

/**
 * Branded, print-faithful lien-waiver document. Inline styles only (so
 * html2canvas / print render identically). Renders from a LienWaiverSpec for
 * all four waiver types, with a notary acknowledgment block.
 */
export const LienWaiverDocument = forwardRef<HTMLDivElement, { spec: LienWaiverSpec; signatureUrl?: string | null }>(
  ({ spec, signatureUrl }, ref) => {
    const pay = paymentBlock(spec);
    const exceptions = exceptionItems(spec);
    const reps = representations();

    const label = (t: string) => (
      <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, fontWeight: 700 }}>{t}</span>
    );
    const field = (k: string, v?: string) => (
      <tr>
        <td style={{ padding: "3px 10px 3px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>{label(k)}</td>
        <td style={{ padding: "3px 0", verticalAlign: "top", color: INK }}>{v || <span style={{ color: "#B9B4AC" }}>____________________</span>}</td>
      </tr>
    );

    return (
      <div
        ref={ref}
        style={{
          width: 720, margin: "0 auto", background: "#FFFFFF", color: INK, padding: "44px 52px",
          fontFamily: "'DM Sans', Arial, Helvetica, sans-serif", fontSize: 13, lineHeight: 1.55, boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 900, letterSpacing: "0.02em", color: INK }}>
            {spec.doc.wordmark || "APAS CONSULTING"}
          </div>
          <div style={{ fontSize: 10.5, color: MUTE, textTransform: "uppercase", letterSpacing: "0.06em" }}>{waiverShortLabel(spec.type)} Waiver</div>
        </div>
        <div style={{ height: 3, background: GOLD, margin: "8px 0 18px" }} />

        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>
          {waiverTitle(spec.type)}
        </div>

        {/* Numbers row */}
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0 4px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "2px 0" }}>{label("Waiver & Release No.")} <span style={{ marginLeft: 6 }}>{spec.doc.waiver_no || "—"}</span></td>
              <td style={{ padding: "2px 0", textAlign: "right" }}>{label("Pay Application No.")} <span style={{ marginLeft: 6 }}>{spec.doc.pay_app_no || "—"}</span></td>
              <td style={{ padding: "2px 0", textAlign: "right" }}>{label("Date")} <span style={{ marginLeft: 6 }}>{spec.doc.date || "—"}</span></td>
            </tr>
          </tbody>
        </table>

        {/* Effectiveness notice */}
        <div style={{ background: LIGHT, borderLeft: `3px solid ${GOLD}`, padding: "10px 12px", margin: "10px 0 16px", fontSize: 12.5, fontWeight: 600 }}>
          {effectivenessNotice(spec.type)}
        </div>

        {/* Identifying information */}
        <SectionTitle n="1" t="Identifying Information" />
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <tbody>
            {field("Claimant (waiving party)", spec.parties.claimant.name)}
            {field("Customer", spec.parties.customer)}
            {field("Property Owner", spec.parties.owner)}
            {field("Work", spec.parties.scope)}
            {field("Project", spec.parties.project)}
            {field("Property", spec.parties.property)}
          </tbody>
        </table>

        {/* Waiver & release */}
        <SectionTitle n="2" t="Waiver and Release" />
        {operativeClauses(spec).map((p, i) => (
          <p key={i} style={{ margin: "0 0 12px", textAlign: "justify" }}>{p}</p>
        ))}

        {/* Payment */}
        <SectionTitle n="3" t={pay.heading} />
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: pay.note ? 6 : 14 }}>
          <tbody>{pay.rows.map((r) => field(r.label, r.value))}</tbody>
        </table>
        {pay.note && <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTE }}>{pay.note}</p>}

        {/* Exceptions */}
        <SectionTitle n="4" t="Exceptions (rights NOT released)" />
        <p style={{ margin: "0 0 6px" }}>This waiver does not cover, and the Claimant expressly reserves, the following:</p>
        <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
          {exceptions.map((e, i) => <li key={i} style={{ marginBottom: 3 }}>{e}</li>)}
        </ul>

        {/* Representations */}
        <SectionTitle n="5" t="Claimant's Representations" />
        <ul style={{ margin: "0 0 16px", paddingLeft: 20 }}>
          {reps.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>

        {/* Signature + notary */}
        <SectionTitle n="6" t="Signature" />
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ width: "55%", verticalAlign: "bottom", paddingRight: 16 }}>
                <div style={{ minHeight: 46, display: "flex", alignItems: "flex-end" }}>
                  {signatureUrl ? <img src={signatureUrl} alt="signature" style={{ maxHeight: 46, maxWidth: "100%" }} /> : null}
                </div>
                <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 4, fontSize: 11.5 }}>
                  <div><strong>{spec.parties.claimant.name || "Claimant"}</strong></div>
                  <div style={{ color: MUTE }}>By: {spec.signature.name || spec.parties.claimant.by || "____________"} · {spec.signature.title || spec.parties.claimant.title || "Title"}</div>
                  <div style={{ color: MUTE }}>Date: {spec.signature.date || "____________"}</div>
                </div>
              </td>
              <td style={{ width: "45%", verticalAlign: "top" }}>
                <div style={{ border: `1px solid ${GOLD}`, borderRadius: 4, padding: "8px 10px", fontSize: 10.5, color: INK }}>
                  <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, marginBottom: 4 }}>Notary Acknowledgment</div>
                  <div style={{ lineHeight: 1.5 }}>
                    State of __________ · County of __________<br />
                    Subscribed and sworn to (or affirmed) before me on __________ by __________, proved to me on the basis of satisfactory evidence to be the person who appeared before me.
                    <div style={{ marginTop: 18, borderTop: `1px solid #ccc`, paddingTop: 3 }}>Notary Public · My commission expires __________</div>
                    <div style={{ marginTop: 14, color: "#B9B4AC" }}>[ Notary seal ]</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: 22, borderTop: `1px solid ${LIGHT}`, paddingTop: 8, fontSize: 9.5, color: MUTE, lineHeight: 1.5 }}>
          {disclaimer(spec)}
          {spec.doc.footer ? <div style={{ marginTop: 4 }}>{spec.doc.footer}</div> : null}
        </div>
      </div>
    );
  },
);
LienWaiverDocument.displayName = "LienWaiverDocument";

function SectionTitle({ n, t }: { n: string; t: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 8px" }}>
      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, color: GOLD, fontSize: 15 }}>{n}.</span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{t}</span>
    </div>
  );
}
