import { forwardRef } from "react";
import { ProcessedPaidStamp, formatPaidStampDate } from "@/components/financial/ProcessedPaidStamp";

const INK = "#1A1714";
const MUTE = "#6B6760";
const RULE = "#DDD8CF";
const GOLD = "#C4A35A";
const SAPPHIRE = "#1D6FE8";

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(n) || 0);

export interface VendorInvoiceDocLine {
  lineNo: string;
  description: string;
  scheduledValue: number;
  workThisPeriod: number;
  materialsStored: number;
}

export interface VendorInvoiceDocPayment {
  id: string;
  paidDate: string;
  method: string | null;
  reference: string | null;
  amount: number;
}

export interface VendorInvoiceSpec {
  wordmark: string;
  invoiceNo: string;
  periodEnd: string;
  status: string;
  vendorName: string;
  commitmentNo: string;
  commitmentTitle: string;
  originalValue: number;
  revisedValue: number;
  submittedAmount: number;
  approvedAmount: number;
  retainageHeld: number;
  retainagePct: number;
  processedDate?: string | null;
  paidDate?: string | null;
  payments: VendorInvoiceDocPayment[];
  lines: VendorInvoiceDocLine[];
  fullyPaid: boolean;
}

const PAGE: React.CSSProperties = {
  width: 760,
  minHeight: 983,
  padding: 38,
  boxSizing: "border-box",
  position: "relative",
  background: "#fff",
  color: INK,
  fontFamily: "Georgia, 'Times New Roman', serif",
};
const td: React.CSSProperties = { borderBottom: `1px solid ${RULE}`, padding: "6px 7px", fontSize: 11 };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const th: React.CSSProperties = {
  borderBottom: `2px solid ${INK}`,
  padding: "6px 7px",
  color: MUTE,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textAlign: "left",
  textTransform: "uppercase",
};

function chunks<T>(rows: T[], size: number): T[][] {
  if (!rows.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function Header({ spec, label }: { spec: VendorInvoiceSpec; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: `3px solid ${INK}`, paddingBottom: 9 }}>
      <div>
        <div style={{ color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>{spec.wordmark}</div>
        <div style={{ marginTop: 2, fontSize: 20, fontWeight: 900 }}>{label}</div>
      </div>
      <div style={{ color: MUTE, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, textAlign: "right" }}>
        <div style={{ color: INK, fontSize: 12, fontWeight: 800 }}>Invoice {spec.invoiceNo}</div>
        <div>{spec.commitmentNo} · Period ending {formatPaidStampDate(spec.periodEnd)}</div>
      </div>
    </div>
  );
}

function Footer({ spec, page, total }: { spec: VendorInvoiceSpec; page: number; total: number }) {
  return (
    <div style={{ position: "absolute", right: 38, bottom: 22, left: 38, display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, paddingTop: 6, color: MUTE, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 8.5 }}>
      <span>{spec.wordmark} · Vendor invoice {spec.invoiceNo} · {spec.commitmentNo}</span>
      <span>Page {page} of {total}</span>
    </div>
  );
}

function SummaryRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, padding: "5px 0", color: tone ?? INK, fontSize: 11.5, fontWeight: strong ? 800 : 400 }}>
      <span>{label}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export const VendorInvoiceDocument = forwardRef<HTMLDivElement, { spec: VendorInvoiceSpec }>(
  function VendorInvoiceDocument({ spec }, ref) {
    const sortedPayments = [...spec.payments].sort((a, b) => a.paidDate.localeCompare(b.paidDate));
    const totalPaid = sortedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const invoiceCeiling = Number(spec.approvedAmount || spec.submittedAmount || 0);
    const netPayable = Math.max(0, invoiceCeiling - Number(spec.retainageHeld || 0));
    const balance = Math.max(0, netPayable - totalPaid);
    const latest = sortedPayments[sortedPayments.length - 1];
    const paidDate = spec.paidDate ?? latest?.paidDate ?? null;
    const linePages = chunks(spec.lines, 18);
    const paymentPages = chunks(sortedPayments, 20);
    const totalPages = linePages.length + paymentPages.length;

    return (
      <div ref={ref}>
        {linePages.map((pageLines, pageIndex) => (
          <div data-pdf-page style={PAGE} key={`invoice-${pageIndex}`}>
            <Header spec={spec} label={pageIndex === 0 ? "Vendor Invoice" : "Invoice Detail — Schedule of Values"} />

            {pageIndex === 0 && (
              <>
                <div style={{ display: "flex", gap: 22, marginTop: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: MUTE, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 8.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Submitted by</div>
                    <div style={{ marginTop: 2, fontSize: 15, fontWeight: 800 }}>{spec.vendorName}</div>
                    <div style={{ marginTop: 8, color: MUTE, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 8.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Against commitment</div>
                    <div style={{ marginTop: 2, fontSize: 12.5, fontWeight: 700 }}>{spec.commitmentNo} · {spec.commitmentTitle}</div>
                    <div style={{ marginTop: 3, color: MUTE, fontSize: 10.5 }}>Base {money(spec.originalValue)} · Revised {money(spec.revisedValue)}</div>
                  </div>
                  <div style={{ width: 310 }}>
                    {spec.fullyPaid && latest && paidDate ? (
                      <ProcessedPaidStamp
                        processedDate={spec.processedDate}
                        paidDate={paidDate}
                        totalPaid={totalPaid}
                        latestReference={latest.reference}
                        style={{ width: "100%", boxSizing: "border-box", transform: "rotate(-2deg)" }}
                      />
                    ) : (
                      <div style={{ border: `2px solid ${SAPPHIRE}`, borderRadius: 10, padding: "12px 14px", color: SAPPHIRE, fontFamily: "ui-sans-serif, system-ui, sans-serif", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{spec.status}</div>
                        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900 }}>{money(invoiceCeiling)}</div>
                        <div style={{ marginTop: 3, fontSize: 9 }}>Current recorded invoice status</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24, marginTop: 16, border: `1px solid ${RULE}`, borderRadius: 9, padding: 12 }}>
                  <div style={{ flex: 1 }}>
                    <SummaryRow label="Submitted amount" value={money(spec.submittedAmount)} />
                    <SummaryRow label="Approved amount" value={money(spec.approvedAmount)} strong />
                    <SummaryRow label={`Retainage tracked (${spec.retainagePct.toFixed(2)}%)`} value={money(spec.retainageHeld)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SummaryRow label="Payments recorded" value={money(totalPaid)} strong tone="#0F9F6E" />
                    <SummaryRow label="Open payment balance" value={money(balance)} strong tone={balance > 0.005 ? "#B56B00" : "#0F9F6E"} />
                    <SummaryRow label="Payment count" value={String(sortedPayments.length)} />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: 18, marginBottom: 6, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Schedule of values {linePages.length > 1 ? `· ${pageIndex + 1} of ${linePages.length}` : ""}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, width: 38 }}>Line</th><th style={th}>Description</th>
                <th style={{ ...th, width: 106, textAlign: "right" }}>Scheduled</th>
                <th style={{ ...th, width: 106, textAlign: "right" }}>This period</th>
                <th style={{ ...th, width: 98, textAlign: "right" }}>Materials</th>
                <th style={{ ...th, width: 105, textAlign: "right" }}>Line billed</th>
              </tr></thead>
              <tbody>
                {pageLines.map((line) => (
                  <tr key={line.lineNo}>
                    <td style={{ ...td, color: MUTE }}>{line.lineNo}</td><td style={td}>{line.description}</td>
                    <td style={num}>{money(line.scheduledValue)}</td><td style={num}>{money(line.workThisPeriod)}</td>
                    <td style={num}>{money(line.materialsStored)}</td><td style={{ ...num, fontWeight: 700 }}>{money(line.workThisPeriod + line.materialsStored)}</td>
                  </tr>
                ))}
                {!pageLines.length && <tr><td colSpan={6} style={{ ...td, padding: 18, color: MUTE, textAlign: "center" }}>No invoice lines recorded.</td></tr>}
              </tbody>
            </table>
            <Footer spec={spec} page={pageIndex + 1} total={totalPages} />
          </div>
        ))}

        {paymentPages.map((pagePayments, pageIndex) => {
          const preceding = sortedPayments.slice(0, pageIndex * 20).reduce((s, p) => s + p.amount, 0);
          let running = preceding;
          return (
            <div data-pdf-page style={PAGE} key={`payments-${pageIndex}`}>
              <Header spec={spec} label="Payment Register" />
              <div style={{ marginTop: 14, color: MUTE, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10.5 }}>
                Every disbursement recorded against this invoice, including its bank reference and cumulative paid balance.
              </div>
              <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ ...th, width: 96 }}>Paid date</th><th style={{ ...th, width: 75 }}>Method</th>
                  <th style={th}>Bank reference</th><th style={{ ...th, width: 105, textAlign: "right" }}>Amount</th>
                  <th style={{ ...th, width: 115, textAlign: "right" }}>Running paid</th>
                </tr></thead>
                <tbody>
                  {pagePayments.map((payment) => {
                    running += payment.amount;
                    return (
                      <tr key={payment.id}>
                        <td style={td}>{formatPaidStampDate(payment.paidDate)}</td>
                        <td style={{ ...td, textTransform: "capitalize" }}>{payment.method ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9.5 }}>{payment.reference ?? "—"}</td>
                        <td style={num}>{money(payment.amount)}</td><td style={{ ...num, fontWeight: 700 }}>{money(running)}</td>
                      </tr>
                    );
                  })}
                  {!pagePayments.length && <tr><td colSpan={5} style={{ ...td, padding: 18, color: MUTE, textAlign: "center" }}>No payments recorded against this invoice.</td></tr>}
                </tbody>
              </table>
              <div style={{ marginTop: 14, marginLeft: "auto", width: 300 }}>
                <SummaryRow label="Invoice amount" value={money(invoiceCeiling)} />
                <SummaryRow label="Less retainage held" value={`− ${money(spec.retainageHeld)}`} />
                <SummaryRow label="Net payable" value={money(netPayable)} strong />
                <SummaryRow label="Total paid" value={money(totalPaid)} strong tone="#0F9F6E" />
                <SummaryRow label="Balance" value={money(balance)} strong tone={balance > 0.005 ? "#B56B00" : "#0F9F6E"} />
              </div>
              {spec.fullyPaid && latest && paidDate && pageIndex === paymentPages.length - 1 && (
                <div style={{ marginTop: 22, textAlign: "center" }}>
                  <ProcessedPaidStamp processedDate={spec.processedDate} paidDate={paidDate} totalPaid={totalPaid} latestReference={latest.reference} />
                </div>
              )}
              <Footer spec={spec} page={linePages.length + pageIndex + 1} total={totalPages} />
            </div>
          );
        })}
      </div>
    );
  },
);
