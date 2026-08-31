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
import { g702LineCopy } from "@/lib/payApp/g702Labels";

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
  /**
   * When true, this is the FINAL invoice for the contract — banner + Line 9
   * wording make clear leftover quantities/credits will not be billed.
   */
  isFinalInvoice?: boolean;
}

const PAGE: React.CSSProperties = {
  width: 760, minHeight: 983, background: "#fff", color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif", padding: 40, boxSizing: "border-box", position: "relative",
};
// Wide landscape sheet for the G703 quantity continuation (Procore-style) so all
// the quantity + dollar columns fit. Rendered as a landscape PDF page (payAppPdf).
const PAGE_LANDSCAPE: React.CSSProperties = {
  width: 1040, minHeight: 620, background: "#fff", color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif", padding: "28px 30px", boxSizing: "border-box", position: "relative",
};
// G702 cover — landscape at the exact US-Letter landscape aspect (11 : 8.5 ≈
// 1.294) so the rasterized PDF page fills edge-to-edge like Procore's cover
// instead of centering a near-square block with wide side margins.
const PAGE_COVER: React.CSSProperties = {
  width: 1056, minHeight: 620, background: "#fff", color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif", padding: "26px 34px", boxSizing: "border-box", position: "relative",
};
// Lining tabular figures stay inside the cell. Georgia oldstyle digits hang below
// the baseline, so a border-bottom on the number itself prints as a slash through
// 3/4/5/7/9 — keep rules on the BOX, never on the glyph.
const NUM_FONT = "ui-sans-serif, system-ui, 'Segoe UI', Arial, sans-serif";
const NUM: React.CSSProperties = {
  fontFamily: NUM_FONT,
  fontVariantNumeric: "tabular-nums lining-nums",
  whiteSpace: "nowrap",
};
const cell: React.CSSProperties = {
  padding: "4px 5px",
  fontSize: 11.5,
  borderBottom: `1px solid ${RULE}`,
  verticalAlign: "middle",
  boxSizing: "border-box",
};
const numCell: React.CSSProperties = {
  ...cell,
  ...NUM,
  textAlign: "right",
  fontSize: 10.5,
  overflow: "hidden",
};
const th: React.CSSProperties = {
  padding: "5px 4px",
  fontSize: 9.5,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: MUTE,
  textAlign: "right",
  borderBottom: `2px solid ${INK}`,
  boxSizing: "border-box",
  overflow: "hidden",
};
const CERT_CELL: React.CSSProperties = {
  ...NUM,
  border: `1.5px solid ${INK}`,
  background: "#fff",
  padding: "8px 12px",
  minWidth: 158,
  minHeight: 30,
  boxSizing: "border-box",
  textAlign: "right",
  overflow: "visible",
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1.35,
};

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

    const isFinal = Boolean(spec.isFinalInvoice);

    const DraftBanner = () =>
      spec.draft ? (
        <div style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}`, color: "#7a5c14", textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", padding: "5px 0", marginBottom: isFinal ? 8 : 14, textTransform: "uppercase" }}>
          Draft — for owner review · not a request for payment
        </div>
      ) : null;

    const FinalInvoiceBanner = () =>
      isFinal ? (
        <div
          data-testid="final-invoice-banner"
          style={{
            // Solid ink fallback first so html2canvas / print never drops the
            // white title if the gradient fails to paint.
            backgroundColor: "#1A1714",
            backgroundImage: "linear-gradient(90deg, #1A1714 0%, #2a241c 50%, #1D6FE8 100%)",
            color: "#FDFCF9",
            textAlign: "center",
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: "0.28em",
            padding: "11px 14px",
            marginBottom: 14,
            textTransform: "uppercase",
            border: `2px solid ${GOLD}`,
            boxShadow: `inset 0 0 0 1px ${GOLD}66`,
          }}
        >
          Final Invoice
          <span style={{ display: "block", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", marginTop: 4, color: GOLD, textTransform: "none" }}>
            Closing application — leftover quantities and credits will not be billed
          </span>
        </div>
      ) : null;

    const lineCopy = g702LineCopy(isFinal);
    const lineByKey = Object.fromEntries(lineCopy.map((r) => [r.key, r]));

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
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>{label}</div>
        {lines.filter(Boolean).map((t, i) => (
          <div key={i} style={{ fontSize: 12, color: i === 0 ? INK : MUTE, fontWeight: i === 0 ? 600 : 400 }}>{t}</div>
        ))}
      </div>
    );
    // Center-align the dollar amount with the label block so sub-notes do not
    // shove figures off the row. Give every money cell explicit line-height +
    // padding — overflow:hidden with a 2.5px row was clipping lining digits in
    // print/PDF (rows shorter than the glyph box).
    const SumRow = ({ no, label, sub, value, hi }: { no: string; label: string; sub?: string; value: number; hi?: boolean }) => (
      <div
        data-testid={hi ? "g702-sum-row-current-due" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", minHeight: 28, background: hi ? `${GOLD}22` : undefined, boxSizing: "border-box" }}
      >
        <div style={{ width: 22, fontSize: 13, fontWeight: hi ? 700 : 400, lineHeight: 1.35 }}>{no}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: hi ? 700 : 400, lineHeight: 1.35 }}>{label}</div>
          {sub && <div style={{ fontSize: 10.5, color: MUTE, lineHeight: 1.3 }}>{sub}</div>}
        </div>
        <div
          data-money-cell
          data-g702-sum-amount
          style={{
            width: 158,
            flexShrink: 0,
            textAlign: "right",
            ...NUM,
            fontSize: 13.5,
            fontWeight: hi ? 700 : 400,
            lineHeight: 1.35,
            padding: "4px 6px",
            minHeight: 24,
            boxSizing: "border-box",
            overflow: "visible",
          }}
        >
          {money(value)}
        </div>
      </div>
    );
    const coTd: React.CSSProperties = { border: `1px solid ${INK}`, padding: "4px 6px", fontSize: 11, boxSizing: "border-box", verticalAlign: "middle" };
    const coNum: React.CSSProperties = { ...coTd, ...NUM, textAlign: "right", width: 96, overflow: "hidden", fontSize: 10.5 };

    return (
      <div ref={ref}>
        {/* ── Page 1 · G702 cover — Procore "Document Summary Sheet" layout ──
             Rendered LANDSCAPE (like Procore's cover and the G703 continuation)
             so the two-column application/certificate split has room to breathe. */}
        <div data-pdf-page data-orientation="landscape" style={PAGE_COVER}>
          <DraftBanner />
          <FinalInvoiceBanner />

          {/* Top bar: title · summary-sheet · page */}
          <div style={{ borderBottom: `3px solid ${INK}`, paddingBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "0.02em" }}>
                APPLICATION AND CERTIFICATE FOR PAYMENT
                {isFinal ? <span style={{ marginLeft: 10, fontSize: 11, letterSpacing: "0.14em", color: GOLD }}>· FINAL</span> : null}
              </div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: MUTE }}>DOCUMENT SUMMARY SHEET</div>
              <div style={{ fontSize: 11, color: MUTE }}>Page 1 of {totalPages}</div>
            </div>
            <div style={{ fontSize: 10, color: MUTE, marginTop: 2 }}>{spec.wordmark} · AIA G702 (adapted){isFinal ? " · FINAL INVOICE" : ""}</div>
          </div>

          {spec.reconciled && (
            <div style={{ position: "absolute", top: 110, right: 46, transform: "rotate(-9deg)", textAlign: "center", border: "3px solid #10B981", borderRadius: 10, padding: "6px 14px", color: "#10B981", background: "rgba(16,185,129,0.06)", lineHeight: 1.15, zIndex: 2 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.24em", fontWeight: 900 }}>RECONCILED</div>
              <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{money(g.current_payment_due)}</div>
              <div style={{ fontSize: 7.5, letterSpacing: "0.12em", fontWeight: 700 }}>PAID IN FULL</div>
            </div>
          )}

          {/* Header block: 3 columns (owner/contractor · project/engineer · meta) */}
          <div style={{ display: "flex", gap: 20, paddingTop: 8, paddingBottom: 6, borderBottom: `2px solid ${INK}` }}>
            <div style={{ flex: 1.1 }}>
              <HdrCol label="TO OWNER/CLIENT:" lines={[spec.owner.name, spec.owner.address, spec.owner.contact]} />
              <HdrCol label="FROM CONTRACTOR:" lines={[spec.contractor.name, spec.contractor.address, spec.contractor.contact]} />
              <HdrCol label="CONTRACT FOR:" lines={[contractFor]} />
            </div>
            <div style={{ flex: 1 }}>
              <HdrCol label="PROJECT:" lines={[spec.project.name, spec.project.address]} />
              <HdrCol label="VIA ARCHITECT/ENGINEER:" lines={[engineer]} />
            </div>
            <div style={{ width: 246 }}>
              {[
                ["APPLICATION NO:", String(spec.payAppNo)],
                ["INVOICE NO:", String(invoiceNo)],
                ["PERIOD:", periodLabel],
                ["PROJECT NO:", projectNo],
                ["CONTRACT DATE:", contractDate],
                ...(isFinal ? [["INVOICE TYPE:", "FINAL INVOICE"] as const] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 6, fontSize: 11.5, padding: "1.5px 0" }}>
                  <div style={{ flex: 1, fontWeight: 700, textAlign: "right", color: k === "INVOICE TYPE:" ? GOLD : undefined }}>{k}</div>
                  <div style={{ width: 116, fontVariantNumeric: "tabular-nums", fontWeight: k === "INVOICE TYPE:" ? 700 : 400 }}>{v || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body: left = contractor's application, right = certificates */}
          <div style={{ display: "flex", gap: 22, marginTop: 8 }}>
            {/* LEFT — application + change order summary */}
            <div style={{ flex: 1.15 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>CONTRACTOR&apos;S APPLICATION FOR PAYMENT</div>
              <div style={{ fontSize: 10.5, fontStyle: "italic", color: MUTE, marginTop: 2, marginBottom: 8, lineHeight: 1.35 }}>
                Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is attached.
                {isFinal
                  ? " This is the FINAL invoice — any unbilled quantities or credits remaining on the Schedule of Values will not be billed, and the project will be closed upon payment."
                  : ""}
              </div>

              <SumRow
                no={lineByKey.original_contract_sum.no}
                label={lineByKey.original_contract_sum.label}
                sub={lineByKey.original_contract_sum.sub}
                value={g.original_contract_sum}
              />
              <SumRow
                no={lineByKey.net_change_orders.no}
                label={lineByKey.net_change_orders.label}
                sub={lineByKey.net_change_orders.sub}
                value={g.net_change_orders}
              />
              <SumRow
                no={lineByKey.contract_sum_to_date.no}
                label={lineByKey.contract_sum_to_date.label}
                sub={lineByKey.contract_sum_to_date.sub}
                value={g.contract_sum_to_date}
              />
              <SumRow
                no={lineByKey.completed_stored_to_date.no}
                label={lineByKey.completed_stored_to_date.label}
                sub={lineByKey.completed_stored_to_date.sub}
                value={g.completed_stored_to_date}
              />

              {/* 5 · Retainage — blended per-line roll-up. 5a/5b amounts ride an
                  intermediate column (Procore); the Total aligns to the main column. */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 6px" }}>
                <div style={{ width: 22, fontSize: 13, lineHeight: 1.35 }}>5.</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.35 }}>Retainage:</div>
                  <div style={{ fontSize: 10.5, color: MUTE, lineHeight: 1.3, marginBottom: 2 }}>
                    {lineByKey.retainage_total.sub}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginLeft: 14, marginTop: 5, minHeight: 24 }}>
                    <div style={{ flex: 1, fontSize: 12, lineHeight: 1.35 }}>a. <span style={{ textDecoration: "underline" }}>{pct2(blendedRetPct)}</span> of completed work</div>
                    <div data-money-cell style={{ width: 118, marginRight: 80, textAlign: "right", fontSize: 12.5, lineHeight: 1.35, padding: "3px 4px", ...NUM, overflow: "visible", boxSizing: "border-box" }}>{money(g.retainage_total)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginLeft: 14, marginTop: 5, minHeight: 24 }}>
                    <div style={{ flex: 1, fontSize: 12, lineHeight: 1.35 }}>b. <span style={{ textDecoration: "underline" }}>0.00%</span> of stored material</div>
                    <div data-money-cell style={{ width: 118, marginRight: 80, textAlign: "right", fontSize: 12.5, lineHeight: 1.35, padding: "3px 4px", ...NUM, overflow: "visible", boxSizing: "border-box" }}>{money(0)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginTop: 8, minHeight: 28 }}>
                    <div style={{ flex: 1, fontSize: 10.5, color: MUTE, lineHeight: 1.35 }}>Total retainage<br />(Line 5a + 5b or total in Column I of detail sheet)</div>
                    <div data-money-cell style={{ width: 158, textAlign: "right", fontSize: 13, lineHeight: 1.35, padding: "4px 6px", ...NUM, overflow: "visible", borderTop: `1px solid ${INK}`, boxSizing: "border-box", minHeight: 24 }}>{money(g.retainage_total)}</div>
                  </div>
                </div>
              </div>

              <SumRow
                no={lineByKey.total_earned_less_retainage.no}
                label={lineByKey.total_earned_less_retainage.label}
                sub={lineByKey.total_earned_less_retainage.sub}
                value={g.total_earned_less_retainage}
              />
              <SumRow
                no={lineByKey.less_previous_certificates.no}
                label={lineByKey.less_previous_certificates.label}
                sub={lineByKey.less_previous_certificates.sub}
                value={g.less_previous_certificates}
              />
              <SumRow
                no={lineByKey.current_payment_due.no}
                label={lineByKey.current_payment_due.label}
                sub={lineByKey.current_payment_due.sub}
                value={g.current_payment_due}
                hi
              />
              <SumRow
                no={lineByKey.balance_to_finish.no}
                label={lineByKey.balance_to_finish.label}
                sub={lineByKey.balance_to_finish.sub}
                value={g.balance_to_finish}
              />

              {/* Change Order Summary */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 9 }}>
                <thead>
                  <tr>
                    <th style={{ ...coTd, textAlign: "left", fontWeight: 700, fontSize: 11 }}>CHANGE ORDER SUMMARY</th>
                    <th style={{ ...coNum, fontWeight: 700 }}>ADDITIONS</th>
                    <th style={{ ...coNum, fontWeight: 700 }}>DEDUCTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={coTd}>Total changes approved in previous months by Owner/Client</td>
                    <td data-money-cell style={coNum}>{money(prevAdd)}</td>
                    <td data-money-cell style={coNum}>{money(prevDed)}</td>
                  </tr>
                  <tr>
                    <td style={coTd}>Total approved this month</td>
                    <td data-money-cell style={coNum}>{money(thisAdd)}</td>
                    <td data-money-cell style={coNum}>{money(thisDed)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...coTd, textAlign: "right", fontWeight: 700 }}>Totals</td>
                    <td data-money-cell style={{ ...coNum, fontWeight: 700 }}>{money(coAdd)}</td>
                    <td data-money-cell style={{ ...coNum, fontWeight: 700 }}>{money(coDed)}</td>
                  </tr>
                  <tr>
                    <td style={coTd}>Net change by change orders</td>
                    <td data-money-cell style={{ ...coNum, textAlign: "center", fontWeight: 700 }} colSpan={2}>{money(g.net_change_orders)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT — contractor certification + notary + A/E certificate */}
            <div style={{ flex: 1, fontSize: 11, lineHeight: 1.4 }}>
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
                  <div style={{ fontSize: 10, color: MUTE }}>By: {spec.signedName || spec.contractor.contact || ""}</div>
                </div>
                <div style={{ width: 92 }}>
                  <div style={{ height: 26, borderBottom: `1px solid ${INK}` }} />
                  <div style={{ fontSize: 10, color: MUTE }}>Date: {spec.signedDate || ""}</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>AMOUNT CERTIFIED:</div>
                  <div data-testid="amount-certified-cell" data-money-cell style={CERT_CELL}>
                    {money(amountCertified)}
                  </div>
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
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 3 }}>
              Continuation Sheet — Schedule of Values{sovPages.length > 1 ? ` (${pi + 1}/${sovPages.length})` : ""}
            </div>
            <div style={{ fontSize: 11, color: MUTE, marginBottom: 6 }}>
              Quantity completed: through the previous application, this application, and total to date.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", width: 28 }}>#</th>
                  <th style={{ ...th, textAlign: "left" }}>Description</th>
                  <th style={{ ...th, width: 36 }}>Unit</th>
                  <th style={{ ...th, width: 56 }}>Sched Qty</th>
                  <th style={{ ...th, width: 72 }}>Unit Price</th>
                  <th style={{ ...th, width: 88 }}>Sched Value</th>
                  <th style={{ ...th, width: 56, background: "#faf8f4" }}>Prev Qty</th>
                  <th style={{ ...th, width: 56, background: "#faf8f4" }}>This Qty</th>
                  <th style={{ ...th, width: 60, background: "#faf8f4" }}>Total Qty</th>
                  <th style={{ ...th, width: 36 }}>%</th>
                  <th style={{ ...th, width: 88 }}>Value to Date</th>
                  <th style={{ ...th, width: 82 }}>Retainage</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((it, idx) =>
                  it.kind === "section" ? (
                    <tr key={`s${idx}`}>
                      <td colSpan={12} style={{ padding: "6px 7px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: MUTE, background: "#faf8f4" }}>{it.title}</td>
                    </tr>
                  ) : (
                    <tr key={`l${it.line.item_no}`}>
                      <td style={{ ...cell, color: MUTE }}>{it.line.item_no}</td>
                      <td style={cell}>{it.line.description}</td>
                      <td style={{ ...cell, textAlign: "center", color: MUTE }}>{it.line.unit ?? "—"}</td>
                      <td data-money-cell style={numCell}>{qty(it.line.scheduled_qty)}</td>
                      <td data-money-cell style={numCell}>{money(it.line.unit_price)}</td>
                      <td data-money-cell style={numCell}>{money(it.line.scheduled_value)}</td>
                      <td data-money-cell style={{ ...numCell, background: "#faf8f4" }}>{qty(it.line.prev_qty)}</td>
                      <td data-money-cell style={{ ...numCell, background: "#faf8f4", fontWeight: 600 }}>{qty(it.line.this_qty)}</td>
                      <td data-money-cell style={{ ...numCell, background: "#faf8f4", fontWeight: 600 }}>{qty(it.line.qty_to_date)}</td>
                      <td data-money-cell style={numCell}>{Math.round(it.line.pct)}%</td>
                      <td data-money-cell style={numCell}>{money(it.line.value_to_date)}</td>
                      <td data-money-cell style={numCell}>{money(it.line.retainage)}</td>
                    </tr>
                  ),
                )}
              </tbody>
              {/* Grand total only on the last continuation page */}
              {pi === sovPages.length - 1 && (
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${INK}`, fontWeight: 700 }}>
                    <td style={{ ...cell, borderBottom: "none" }} colSpan={5}>Grand total</td>
                    <td data-money-cell style={{ ...numCell, borderBottom: "none" }}>{money(totals.scheduled)}</td>
                    <td style={{ ...numCell, borderBottom: "none" }} colSpan={3} />
                    <td style={{ ...numCell, borderBottom: "none" }} />
                    <td data-money-cell style={{ ...numCell, borderBottom: "none" }}>{money(totals.toDate)}</td>
                    <td data-money-cell style={{ ...numCell, borderBottom: "none" }}>{money(totals.retainage)}</td>
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
