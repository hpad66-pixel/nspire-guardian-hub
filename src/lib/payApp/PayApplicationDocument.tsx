/**
 * PayApplicationDocument — branded AIA G702/G703 "Application and Certificate
 * for Payment" rendered as HTML (forwardRef) so it can be rasterized to a clean
 * multipage PDF (see payAppPdf.ts), mirroring the lien-waiver / change-order
 * document pattern.
 *
 * Three parts: (1) G702 cover with the parties (Owner = client, Contractor =
 * us/APAS) and the 9-line certificate summary; (2) Contractor's certification +
 * signature block + notary; (3) G703 continuation sheet with the quantity
 * Schedule of Values (base + change orders), the supporting detail.
 */
import { forwardRef } from "react";
import type { G702Summary } from "@/lib/financial/payAppContinuation";

const INK = "#1A1714";
const MUTE = "#6b6760";
const RULE = "#d9d4cc";
const GOLD = "#C4A35A";

const money = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
const qty = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export interface PayAppDocLine {
  item_no: string;
  description: string;
  unit: string | null;
  kind: "base" | "change_order";
  scheduled_qty: number;
  scheduled_value: number;
  prev_value: number;
  this_value: number;
  value_to_date: number;
  pct: number;
  retainage: number;
}

export interface PartyInfo {
  name: string;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
}

export interface PayApplicationSpec {
  wordmark: string;
  footer?: string | null;
  contractor: PartyInfo & { title?: string | null };
  owner: PartyInfo;
  project: { name: string; address?: string | null };
  payAppNo: number;
  periodEnd: string;
  applicationDate: string;
  contractNo: string;
  contractTitle: string;
  retainagePct: number;
  g702: G702Summary;
  lines: PayAppDocLine[];
  signatureUrl?: string | null;
}

const cell: React.CSSProperties = { padding: "5px 7px", fontSize: 11, borderBottom: `1px solid ${RULE}` };
const numCell: React.CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const th: React.CSSProperties = { padding: "6px 7px", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, textAlign: "right", borderBottom: `2px solid ${INK}` };

export const PayApplicationDocument = forwardRef<HTMLDivElement, { spec: PayApplicationSpec }>(
  ({ spec }, ref) => {
    const g = spec.g702;
    const G702_ROWS: Array<[string, keyof G702Summary, boolean]> = [
      ["1. Original Contract Sum", "original_contract_sum", false],
      ["2. Net change by Change Orders", "net_change_orders", false],
      ["3. Contract Sum to Date (1 ± 2)", "contract_sum_to_date", false],
      ["4. Total Completed & Stored to Date", "completed_stored_to_date", false],
      ["5. Retainage", "retainage_total", false],
      ["6. Total Earned Less Retainage (4 − 5)", "total_earned_less_retainage", false],
      ["7. Less Previous Certificates for Payment", "less_previous_certificates", false],
      ["8. CURRENT PAYMENT DUE", "current_payment_due", true],
      ["9. Balance to Finish, Plus Retainage", "balance_to_finish", false],
    ];

    const totals = spec.lines.reduce(
      (a, l) => ({
        scheduled: a.scheduled + l.scheduled_value,
        prev: a.prev + l.prev_value,
        thisP: a.thisP + l.this_value,
        toDate: a.toDate + l.value_to_date,
        retainage: a.retainage + l.retainage,
      }),
      { scheduled: 0, prev: 0, thisP: 0, toDate: 0, retainage: 0 },
    );

    const Party = ({ label, p }: { label: string; p: PartyInfo }) => (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: MUTE }}>{label}</div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name || "—"}</div>
        {p.address && <div style={{ fontSize: 10.5, color: MUTE }}>{p.address}</div>}
        {p.contact && <div style={{ fontSize: 10.5, color: MUTE }}>Attn: {p.contact}{p.email ? ` · ${p.email}` : ""}</div>}
      </div>
    );

    return (
      <div ref={ref} style={{ width: 760, background: "#fff", color: INK, fontFamily: "Georgia, 'Times New Roman', serif", padding: 40, boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${INK}`, paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.06em" }}>{spec.wordmark || "APAS CONSULTING"}</div>
            <div style={{ fontSize: 10, color: MUTE, marginTop: 2 }}>Application and Certificate for Payment</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Application No. {spec.payAppNo}</div>
            <div style={{ fontSize: 10, color: MUTE }}>AIA G702 / G703 (adapted)</div>
          </div>
        </div>

        {/* Parties + meta */}
        <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <Party label="To Owner" p={spec.owner} />
            <Party label="From Contractor" p={spec.contractor} />
            <Party label="Project" p={{ name: spec.project.name, address: spec.project.address }} />
          </div>
          <div style={{ width: 240 }}>
            {[
              ["Application No.", String(spec.payAppNo)],
              ["Period To", spec.periodEnd],
              ["Application Date", spec.applicationDate],
              ["Contract", `${spec.contractTitle} (${spec.contractNo})`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${RULE}` }}>
                <span style={{ color: MUTE }}>{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* G702 certificate summary */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
          <tbody>
            {G702_ROWS.map(([label, key, hi]) => (
              <tr key={key} style={hi ? { background: `${GOLD}22` } : undefined}>
                <td style={{ ...cell, fontWeight: hi ? 700 : 400 }}>{label}</td>
                <td style={{ ...numCell, fontWeight: hi ? 700 : 400 }}>{money(g[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Contractor certification + signature */}
        <div style={{ marginTop: 18, fontSize: 10.5, color: INK, lineHeight: 1.45 }}>
          The undersigned Contractor certifies that to the best of the Contractor&apos;s knowledge, information and belief
          the Work covered by this Application for Payment has been completed in accordance with the Contract Documents,
          that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were
          issued and payments received from the Owner, and that current payment shown herein is now due.
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: MUTE, marginBottom: 4 }}>Contractor</div>
            <div style={{ height: 40, borderBottom: `1px solid ${INK}`, display: "flex", alignItems: "flex-end" }}>
              {spec.signatureUrl ? <img src={spec.signatureUrl} alt="signature" style={{ maxHeight: 38, maxWidth: "100%" }} /> : null}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>{spec.contractor.name}</div>
            <div style={{ fontSize: 10.5, color: MUTE }}>By: {spec.contractor.contact || "____________________"} · {spec.contractor.title || "Authorized Representative"}</div>
            <div style={{ fontSize: 10.5, color: MUTE }}>Date: ____________________</div>
          </div>
          <div style={{ width: 250 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: MUTE, marginBottom: 4 }}>Notary Acknowledgment</div>
            <div style={{ fontSize: 10, color: MUTE, lineHeight: 1.5 }}>
              Subscribed and sworn before me this ______ day of ____________, 20____.
              <div style={{ marginTop: 22, borderTop: `1px solid ${RULE}`, paddingTop: 3 }}>Notary Public · My commission expires __________</div>
              <div style={{ marginTop: 12, color: "#B9B4AC" }}>[ Notary seal ]</div>
            </div>
          </div>
        </div>

        {/* G703 continuation sheet */}
        <div style={{ marginTop: 26, pageBreakBefore: "always" }}>
          <div style={{ fontSize: 13, fontWeight: 700, borderBottom: `2px solid ${INK}`, paddingBottom: 4 }}>
            Continuation Sheet — Schedule of Values (AIA G703)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", width: 28 }}>#</th>
                <th style={{ ...th, textAlign: "left" }}>Description</th>
                <th style={{ ...th, width: 38 }}>Unit</th>
                <th style={{ ...th, width: 54 }}>Sched Qty</th>
                <th style={th}>Scheduled</th>
                <th style={th}>Previous</th>
                <th style={th}>This Period</th>
                <th style={th}>To Date</th>
                <th style={{ ...th, width: 38 }}>%</th>
                <th style={th}>Retainage</th>
              </tr>
            </thead>
            {renderSection("Base contract", spec.lines.filter((l) => l.kind === "base"))}
            {spec.lines.some((l) => l.kind === "change_order") &&
              renderSection("Change orders", spec.lines.filter((l) => l.kind === "change_order"))}
            <tfoot>
              <tr style={{ borderTop: `2px solid ${INK}`, fontWeight: 700 }}>
                <td style={{ ...cell, borderBottom: "none" }} colSpan={4}>Grand total</td>
                <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.scheduled)}</td>
                <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.prev)}</td>
                <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.thisP)}</td>
                <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.toDate)}</td>
                <td style={{ ...numCell, borderBottom: "none" }} />
                <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.retainage)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: 22, fontSize: 9, color: MUTE, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
          {spec.footer || `${spec.wordmark} · Application for Payment ${spec.payAppNo} · Generated by Build OS`}
        </div>
      </div>
    );

    function renderSection(title: string, rows: PayAppDocLine[]) {
      return (
        <tbody>
          <tr><td colSpan={10} style={{ padding: "6px 7px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, background: "#faf8f4" }}>{title}</td></tr>
          {rows.map((l) => (
            <tr key={l.item_no}>
              <td style={{ ...cell, color: MUTE }}>{l.item_no}</td>
              <td style={cell}>{l.description}</td>
              <td style={{ ...cell, textAlign: "center", color: MUTE }}>{l.unit ?? "—"}</td>
              <td style={numCell}>{qty(l.scheduled_qty)}</td>
              <td style={numCell}>{money(l.scheduled_value)}</td>
              <td style={numCell}>{money(l.prev_value)}</td>
              <td style={numCell}>{money(l.this_value)}</td>
              <td style={numCell}>{money(l.value_to_date)}</td>
              <td style={numCell}>{Math.round(l.pct)}%</td>
              <td style={numCell}>{money(l.retainage)}</td>
            </tr>
          ))}
        </tbody>
      );
    }
  },
);
PayApplicationDocument.displayName = "PayApplicationDocument";
