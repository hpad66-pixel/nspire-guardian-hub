/**
 * PayApplicationDocument — branded AIA G702/G703 "Application and Certificate
 * for Payment" rendered as HTML (forwardRef) so it can be rasterized to a clean
 * multipage PDF (see payAppPdf.ts).
 *
 * The document is split into discrete `data-pdf-page` blocks — one US-Letter page
 * each — so the rasterizer renders one PDF page per block and never cuts a table
 * row or the signature across a page break:
 *   • Page 1: G702 cover — parties, the 9-line certificate summary, the
 *     contractor's certification + e-signature, and notary block.
 *   • Page 2…N: G703 continuation — the quantity Schedule of Values (base +
 *     change orders), chunked so each page fits cleanly.
 * A "DRAFT — FOR OWNER REVIEW" banner is shown when `spec.draft` is set.
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
  unit_price: number;
  scheduled_value: number;
  prev_qty: number;       // quantity completed through the previous application
  this_qty: number;       // quantity completed this application
  qty_to_date: number;    // total quantity to date (prev + this)
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
  /** Start of the billing period (Procore cover shows "PERIOD: start – end"). */
  periodStart?: string | null;
  applicationDate: string;
  contractNo: string;
  contractTitle: string;
  retainagePct: number;
  /** Procore cover header fields (optional — sensible fallbacks applied). */
  invoiceNo?: number | string | null;
  projectNo?: string | null;
  contractDate?: string | null;
  contractFor?: string | null;
  engineer?: string | null;
  /** Architect/Engineer AMOUNT CERTIFIED (defaults to current payment due). */
  amountCertified?: number | null;
  g702: G702Summary;
  lines: PayAppDocLine[];
  signatureUrl?: string | null;
  signedName?: string | null;
  signedDate?: string | null;
  /** Render the "DRAFT — FOR OWNER REVIEW" banner (review copy, not a final submission). */
  draft?: boolean;
  /** Stamp a green "RECONCILED" seal on the cover (e.g. the pay app is fully paid). */
  reconciled?: boolean;
}

const PAGE: React.CSSProperties = {
  width: 760, minHeight: 983, background: "#fff", color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif", padding: 40, boxSizing: "border-box", position: "relative",
};
// Wide landscape sheet for the G703 quantity continuation (Procore-style) so all
// the quantity + dollar columns fit. Rendered as a landscape PDF page (payAppPdf).
const PAGE_LANDSCAPE: React.CSSProperties = {
  width: 1040, minHeight: 740, background: "#fff", color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif", padding: 40, boxSizing: "border-box", position: "relative",
};
const cell: React.CSSProperties = { padding: "5px 7px", fontSize: 11, borderBottom: `1px solid ${RULE}` };
const numCell: React.CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const th: React.CSSProperties = { padding: "6px 7px", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, textAlign: "right", borderBottom: `2px solid ${INK}` };

// Max Schedule-of-Values rows (incl. section headers) per continuation page
// (landscape is shorter, so fewer rows keep the dense quantity grid legible).
const ROWS_PER_PAGE = 20;

export const PayApplicationDocument = forwardRef<HTMLDivElement, { spec: PayApplicationSpec }>(
  ({ spec }, ref) => {
    const g = spec.g702;

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

    // Flatten the SOV into render items (section headers + lines) and paginate.
    type Item = { kind: "section"; title: string } | { kind: "line"; line: PayAppDocLine };
    const items: Item[] = [];
    const base = spec.lines.filter((l) => l.kind === "base");
    const cos = spec.lines.filter((l) => l.kind === "change_order");
    if (base.length) { items.push({ kind: "section", title: "Base contract" }); base.forEach((line) => items.push({ kind: "line", line })); }
    if (cos.length) { items.push({ kind: "section", title: "Change orders" }); cos.forEach((line) => items.push({ kind: "line", line })); }
    const sovPages: Item[][] = [];
    for (let i = 0; i < items.length; i += ROWS_PER_PAGE) sovPages.push(items.slice(i, i + ROWS_PER_PAGE));
    if (!sovPages.length) sovPages.push([]);

    const DraftBanner = () =>
      spec.draft ? (
        <div style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}`, color: "#7a5c14", textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", padding: "5px 0", marginBottom: 14, textTransform: "uppercase" }}>
          Draft — for owner review · not a request for payment
        </div>
      ) : null;

    const Header = ({ sheet }: { sheet: "G702" | "G703" }) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${INK}`, paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.06em" }}>{spec.wordmark || "APAS CONSULTING"}</div>
          <div style={{ fontSize: 10, color: MUTE, marginTop: 2 }}>
            {sheet === "G702" ? "Application and Certificate for Payment" : "Continuation Sheet — Schedule of Values"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Application No. {spec.payAppNo}</div>
          <div style={{ fontSize: 10, color: MUTE }}>AIA {sheet} (adapted)</div>
        </div>
      </div>
    );

    const Footer = ({ n, of }: { n: number; of: number }) => (
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 24, display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTE, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
        <span>{spec.footer || `${spec.wordmark} · Application for Payment ${spec.payAppNo}`}</span>
        <span>Page {n} of {of}</span>
      </div>
    );

    const totalPages = 1 + sovPages.length;

    // ── Procore cover: derived values ────────────────────────────────────
    // Blended retainage rate = total retainage ÷ total completed work. This is a
    // roll-up of the PER-LINE retainage (Column I) — lines that carry no retainage
    // (e.g. General Conditions) pull the blended rate below the nominal contract %.
    const blendedRetPct =
      g.completed_stored_to_date > 0 ? (g.retainage_total / g.completed_stored_to_date) * 100 : 0;
    const pct2 = (n: number) => `${n.toFixed(2)}%`;

    // Change Order Summary (additions vs deductions), split into prior periods vs
    // this application. We don't track per-CO approval timing, so the cumulative
    // net lands in "previous months" once past App #1 — matching the Procore sheet.
    const coLines = spec.lines.filter((l) => l.kind === "change_order");
    const coAdd = coLines.reduce((t, l) => t + (l.scheduled_value > 0 ? l.scheduled_value : 0), 0);
    const coDed = coLines.reduce((t, l) => t + (l.scheduled_value < 0 ? -l.scheduled_value : 0), 0);
    const firstApp = spec.payAppNo <= 1;
    const prevAdd = firstApp ? 0 : coAdd, prevDed = firstApp ? 0 : coDed;
    const thisAdd = firstApp ? coAdd : 0, thisDed = firstApp ? coDed : 0;

    const periodLabel = spec.periodStart ? `${spec.periodStart} – ${spec.periodEnd}` : spec.periodEnd;
    const invoiceNo = spec.invoiceNo ?? spec.payAppNo;
    const projectNo = spec.projectNo ?? spec.contractNo;
    const contractDate = spec.contractDate ?? "";
    const contractFor = spec.contractFor ?? spec.contractTitle;
    const engineer = spec.engineer ?? "";
    const amountCertified = spec.amountCertified ?? g.current_payment_due;

    // Procore cover row helpers.
    const HdrCol = ({ label, lines }: { label: string; lines: (string | null | undefined)[] }) => (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.02em" }}>{label}</div>
        {lines.filter(Boolean).map((t, i) => (
          <div key={i} style={{ fontSize: 10, color: i === 0 ? INK : MUTE, fontWeight: i === 0 ? 600 : 400 }}>{t}</div>
        ))}
      </div>
    );
    const SumRow = ({ no, label, sub, value, hi }: { no: string; label: string; sub?: string; value: number; hi?: boolean }) => (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "3px 4px", background: hi ? `${GOLD}22` : undefined }}>
        <div style={{ width: 16, fontSize: 10.5, fontWeight: hi ? 700 : 400 }}>{no}</div>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontSize: 10.5, fontWeight: hi ? 700 : 400 }}>{label}</div>
          {sub && <div style={{ fontSize: 8.5, color: MUTE }}>{sub}</div>}
        </div>
        <div style={{ width: 108, textAlign: "right", fontSize: 11, fontWeight: hi ? 700 : 400, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}>{money(value)}</div>
      </div>
    );
    const coTd: React.CSSProperties = { border: `1px solid ${INK}`, padding: "3px 6px", fontSize: 9 };
    const coNum: React.CSSProperties = { ...coTd, textAlign: "right", width: 70, fontVariantNumeric: "tabular-nums" };

    return (
      <div ref={ref}>
        {/* ── Page 1 · G702 cover — Procore "Document Summary Sheet" layout ──
             Rendered LANDSCAPE (like Procore's cover and the G703 continuation)
             so the two-column application/certificate split has room to breathe. */}
        <div data-pdf-page data-orientation="landscape" style={PAGE_LANDSCAPE}>
          <DraftBanner />

          {/* Top bar: title · summary-sheet · page */}
          <div style={{ borderBottom: `3px solid ${INK}`, paddingBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>APPLICATION AND CERTIFICATE FOR PAYMENT</div>
              <div style={{ fontSize: 11, fontStyle: "italic", color: MUTE }}>DOCUMENT SUMMARY SHEET</div>
              <div style={{ fontSize: 10, color: MUTE }}>Page 1 of {totalPages}</div>
            </div>
            <div style={{ fontSize: 8.5, color: MUTE, marginTop: 2 }}>{spec.wordmark} · AIA G702 (adapted)</div>
          </div>

          {spec.reconciled && (
            <div style={{ position: "absolute", top: 110, right: 46, transform: "rotate(-9deg)", textAlign: "center", border: "3px solid #10B981", borderRadius: 10, padding: "6px 14px", color: "#10B981", background: "rgba(16,185,129,0.06)", lineHeight: 1.15, zIndex: 2 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.24em", fontWeight: 900 }}>RECONCILED</div>
              <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{money(g.current_payment_due)}</div>
              <div style={{ fontSize: 7.5, letterSpacing: "0.12em", fontWeight: 700 }}>PAID IN FULL</div>
            </div>
          )}

          {/* Header block: 3 columns (owner/contractor · project/engineer · meta) */}
          <div style={{ display: "flex", gap: 20, paddingTop: 12, paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>
            <div style={{ flex: 1.1 }}>
              <HdrCol label="TO OWNER/CLIENT:" lines={[spec.owner.name, spec.owner.address, spec.owner.contact]} />
              <HdrCol label="FROM CONTRACTOR:" lines={[spec.contractor.name, spec.contractor.address, spec.contractor.contact]} />
              <HdrCol label="CONTRACT FOR:" lines={[contractFor]} />
            </div>
            <div style={{ flex: 1 }}>
              <HdrCol label="PROJECT:" lines={[spec.project.name, spec.project.address]} />
              <HdrCol label="VIA ARCHITECT/ENGINEER:" lines={[engineer]} />
            </div>
            <div style={{ width: 210 }}>
              {[
                ["APPLICATION NO:", String(spec.payAppNo)],
                ["INVOICE NO:", String(invoiceNo)],
                ["PERIOD:", periodLabel],
                ["PROJECT NO:", projectNo],
                ["CONTRACT DATE:", contractDate],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 6, fontSize: 9.5, padding: "1.5px 0" }}>
                  <div style={{ flex: 1, fontWeight: 700, textAlign: "right" }}>{k}</div>
                  <div style={{ width: 96, fontVariantNumeric: "tabular-nums" }}>{v || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body: left = contractor's application, right = certificates */}
          <div style={{ display: "flex", gap: 22, marginTop: 12 }}>
            {/* LEFT — application + change order summary */}
            <div style={{ flex: 1.15 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>CONTRACTOR&apos;S APPLICATION FOR PAYMENT</div>
              <div style={{ fontSize: 9, fontStyle: "italic", color: MUTE, marginTop: 2, marginBottom: 8, lineHeight: 1.35 }}>
                Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is attached.
              </div>

              <SumRow no="1." label="Original Contract Sum" value={g.original_contract_sum} />
              <SumRow no="2." label="Net change by change orders" value={g.net_change_orders} />
              <SumRow no="3." label="Contract Sum to date (Line 1 ± 2)" value={g.contract_sum_to_date} />
              <SumRow no="4." label="Total completed and stored to date" sub="(Column G on detail sheet)" value={g.completed_stored_to_date} />

              {/* 5 · Retainage — blended per-line roll-up */}
              <div style={{ display: "flex", gap: 8, padding: "3px 4px" }}>
                <div style={{ width: 16, fontSize: 10.5 }}>5.</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5 }}>Retainage:</div>
                  <div style={{ display: "flex", alignItems: "flex-end", marginLeft: 14, marginTop: 3 }}>
                    <div style={{ flex: 1, fontSize: 10 }}>a. <span style={{ textDecoration: "underline" }}>{pct2(blendedRetPct)}</span> of completed work</div>
                    <div style={{ width: 92, textAlign: "right", fontSize: 10.5, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${INK}` }}>{money(g.retainage_total)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", marginLeft: 14, marginTop: 3 }}>
                    <div style={{ flex: 1, fontSize: 10 }}>b. <span style={{ textDecoration: "underline" }}>0.00%</span> of stored material</div>
                    <div style={{ width: 92, textAlign: "right", fontSize: 10.5, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${INK}` }}>{money(0)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", marginTop: 5 }}>
                    <div style={{ flex: 1, fontSize: 9, color: MUTE, lineHeight: 1.25 }}>Total retainage<br />(Line 5a + 5b or total in Column I of detail sheet)</div>
                    <div style={{ width: 92, textAlign: "right", fontSize: 11, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${INK}` }}>{money(g.retainage_total)}</div>
                  </div>
                </div>
              </div>

              <SumRow no="6." label="Total earned less retainage" sub="(Line 4 less Line 5 Total)" value={g.total_earned_less_retainage} />
              <SumRow no="7." label="Less previous certificates for payment" sub="(Line 6 from prior certificate)" value={g.less_previous_certificates} />
              <SumRow no="8." label="Current payment due" value={g.current_payment_due} hi />
              <SumRow no="9." label="Balance to finish, including retainage" sub="(Line 3 less Line 6)" value={g.balance_to_finish} />

              {/* Change Order Summary */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
                <thead>
                  <tr>
                    <th style={{ ...coTd, textAlign: "left", fontWeight: 700, fontSize: 9 }}>CHANGE ORDER SUMMARY</th>
                    <th style={{ ...coNum, fontWeight: 700 }}>ADDITIONS</th>
                    <th style={{ ...coNum, fontWeight: 700 }}>DEDUCTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={coTd}>Total changes approved in previous months by Owner/Client</td>
                    <td style={coNum}>{money(prevAdd)}</td>
                    <td style={coNum}>{money(prevDed)}</td>
                  </tr>
                  <tr>
                    <td style={coTd}>Total approved this month</td>
                    <td style={coNum}>{money(thisAdd)}</td>
                    <td style={coNum}>{money(thisDed)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...coTd, textAlign: "right", fontWeight: 700 }}>Totals</td>
                    <td style={{ ...coNum, fontWeight: 700 }}>{money(coAdd)}</td>
                    <td style={{ ...coNum, fontWeight: 700 }}>{money(coDed)}</td>
                  </tr>
                  <tr>
                    <td style={coTd}>Net change by change orders</td>
                    <td style={{ ...coNum, textAlign: "center", fontWeight: 700 }} colSpan={2}>{money(g.net_change_orders)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT — contractor certification + notary + A/E certificate */}
            <div style={{ flex: 1, fontSize: 9.5, lineHeight: 1.4 }}>
              <div style={{ color: INK }}>
                The undersigned certifies that to the best of the Contractor&apos;s knowledge, information and belief, the
                Work covered by this Application for Payment has been completed in accordance with the Contract Documents,
                that all amounts have been paid by the Contractor for Work which previous Certificates for payment were
                issued and payments received from the Owner/Client, and that current payment shown herein is now due.
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>CONTRACTOR: {spec.contractor.name}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 26, borderBottom: `1px solid ${INK}`, display: "flex", alignItems: "flex-end" }}>
                    {spec.signatureUrl ? <img src={spec.signatureUrl} alt="signature" style={{ maxHeight: 24, maxWidth: "100%" }} /> : null}
                  </div>
                  <div style={{ fontSize: 8.5, color: MUTE }}>By: {spec.signedName || spec.contractor.contact || ""}</div>
                </div>
                <div style={{ width: 92 }}>
                  <div style={{ height: 26, borderBottom: `1px solid ${INK}` }} />
                  <div style={{ fontSize: 8.5, color: MUTE }}>Date: {spec.signedDate || ""}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, color: MUTE }}>State of:</div>
              <div style={{ color: MUTE }}>County of:</div>
              <div style={{ marginTop: 6, color: MUTE }}>Subscribed and sworn to before</div>
              <div style={{ color: MUTE }}>me this ______ day of ____________</div>
              <div style={{ marginTop: 6, color: MUTE }}>Notary Public: ____________________</div>
              <div style={{ color: MUTE }}>My commission expires: __________</div>

              <div style={{ borderTop: `2px solid ${INK}`, marginTop: 14, paddingTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>ARCHITECT&apos;S/ENGINEER&apos;S CERTIFICATE FOR PAYMENT</div>
                <div style={{ marginTop: 6, color: INK }}>
                  In accordance with the Contract Documents, based on the on-site observations and the data comprising this
                  application, the Architect/Engineer certifies to the Owner/Client that to the best of the Architect&apos;s/Engineer&apos;s
                  knowledge, information and belief the Work is in accordance with the Contract Documents, and the Contractor
                  is entitled to payment of the AMOUNT CERTIFIED.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>AMOUNT CERTIFIED:</div>
                  <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${INK}`, minWidth: 90, textAlign: "right", paddingBottom: 1 }}>{money(amountCertified)}</div>
                </div>
                <div style={{ marginTop: 6, fontStyle: "italic", fontSize: 8.5, color: MUTE }}>
                  (Attach explanation if amount certified differs from the amount applied for. Initial all figures on this
                  Application and on the Continuation Sheet that are changed to conform to the amount certified.)
                </div>
                <div style={{ marginTop: 8, color: MUTE }}>ARCHITECT/ENGINEER:</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
                  <div style={{ flex: 1, borderBottom: `1px solid ${INK}`, height: 18 }} />
                  <div style={{ width: 92, borderBottom: `1px solid ${INK}`, height: 18 }} />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 8.5, color: MUTE }}>
                  <div style={{ flex: 1 }}>By:</div><div style={{ width: 92 }}>Date:</div>
                </div>
                <div style={{ marginTop: 8, fontSize: 8.5, color: MUTE, lineHeight: 1.35 }}>
                  This certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein.
                  Issuance, payment and acceptance of payment are without prejudice to the rights of the Owner/Client or
                  Contractor under this Contract.
                </div>
              </div>
            </div>
          </div>

          <Footer n={1} of={totalPages} />
        </div>

        {/* ── Page 2…N · G703 quantity continuation (landscape, Procore-style) ── */}
        {sovPages.map((pageItems, pi) => (
          <div data-pdf-page data-orientation="landscape" style={PAGE_LANDSCAPE} key={pi}>
            <Header sheet="G703" />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 2 }}>
              Continuation Sheet — Schedule of Values{sovPages.length > 1 ? ` (${pi + 1}/${sovPages.length})` : ""}
            </div>
            <div style={{ fontSize: 9.5, color: MUTE, marginBottom: 6 }}>
              Quantity completed: through the previous application, this application, and total to date.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", width: 24 }}>#</th>
                  <th style={{ ...th, textAlign: "left" }}>Description</th>
                  <th style={{ ...th, width: 34 }}>Unit</th>
                  <th style={{ ...th, width: 56 }}>Sched Qty</th>
                  <th style={{ ...th, width: 62 }}>Unit Price</th>
                  <th style={{ ...th, width: 78 }}>Sched Value</th>
                  <th style={{ ...th, width: 56, background: "#faf8f4" }}>Prev Qty</th>
                  <th style={{ ...th, width: 56, background: "#faf8f4" }}>This Qty</th>
                  <th style={{ ...th, width: 60, background: "#faf8f4" }}>Total Qty</th>
                  <th style={{ ...th, width: 34 }}>%</th>
                  <th style={{ ...th, width: 80 }}>Value to Date</th>
                  <th style={{ ...th, width: 66 }}>Retainage</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((it, idx) =>
                  it.kind === "section" ? (
                    <tr key={`s${idx}`}>
                      <td colSpan={12} style={{ padding: "6px 7px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, background: "#faf8f4" }}>{it.title}</td>
                    </tr>
                  ) : (
                    <tr key={`l${it.line.item_no}`}>
                      <td style={{ ...cell, color: MUTE }}>{it.line.item_no}</td>
                      <td style={cell}>{it.line.description}</td>
                      <td style={{ ...cell, textAlign: "center", color: MUTE }}>{it.line.unit ?? "—"}</td>
                      <td style={numCell}>{qty(it.line.scheduled_qty)}</td>
                      <td style={numCell}>{money(it.line.unit_price)}</td>
                      <td style={numCell}>{money(it.line.scheduled_value)}</td>
                      <td style={{ ...numCell, background: "#faf8f4" }}>{qty(it.line.prev_qty)}</td>
                      <td style={{ ...numCell, background: "#faf8f4", fontWeight: 600 }}>{qty(it.line.this_qty)}</td>
                      <td style={{ ...numCell, background: "#faf8f4", fontWeight: 600 }}>{qty(it.line.qty_to_date)}</td>
                      <td style={numCell}>{Math.round(it.line.pct)}%</td>
                      <td style={numCell}>{money(it.line.value_to_date)}</td>
                      <td style={numCell}>{money(it.line.retainage)}</td>
                    </tr>
                  ),
                )}
              </tbody>
              {/* Grand total only on the last continuation page */}
              {pi === sovPages.length - 1 && (
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${INK}`, fontWeight: 700 }}>
                    <td style={{ ...cell, borderBottom: "none" }} colSpan={5}>Grand total</td>
                    <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.scheduled)}</td>
                    <td style={{ ...numCell, borderBottom: "none" }} colSpan={3} />
                    <td style={{ ...numCell, borderBottom: "none" }} />
                    <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.toDate)}</td>
                    <td style={{ ...numCell, borderBottom: "none" }}>{money(totals.retainage)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            <Footer n={2 + pi} of={totalPages} />
          </div>
        ))}
      </div>
    );
  },
);
PayApplicationDocument.displayName = "PayApplicationDocument";
