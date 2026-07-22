/**
 * FinancialReportViews — the branded, chart-rich report bodies for the Financial
 * Reports center. Each view takes the shared ReportData + brand header info and
 * renders KPIs + recharts visuals + a supporting table. Views are self-contained
 * so they render identically on screen and when rasterized to a branded PDF.
 */
import {
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";
import type { ReportData } from "@/lib/reports/financialReports";
import {
  financialSummary, billingHistory, changeOrderLog, cashFlow, commitmentStatus, lienCompliance,
  paymentsReceived, subcontractorPayments,
} from "@/lib/reports/financialReports";

const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

// Build OS brand palette
export const BRAND = {
  ink: "#1A1714", sapphire: "#1D6FE8", gold: "#C4A35A",
  emerald: "#10B981", amber: "#F59E0B", rose: "#F43F5E", mute: "#878581", rule: "#e7e2d9",
};
const STATUS_COLORS: Record<string, string> = {
  executed: BRAND.emerald, approved: BRAND.emerald, paid: BRAND.emerald,
  out_for_signature: BRAND.amber, submitted: BRAND.sapphire, draft: BRAND.mute,
  pending: BRAND.amber, rejected: BRAND.rose, sent: BRAND.sapphire, void: BRAND.mute,
};
const PIE = [BRAND.sapphire, BRAND.gold, BRAND.emerald, BRAND.amber, BRAND.rose, BRAND.mute];

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n) || 0);
const money2 = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(n) || 0);
const pct = (n: number) => `${(Number(n) || 0).toFixed(1)}%`;
const kmoney = (n: number) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;
};

export interface ReportBrand {
  wordmark: string; projectName: string; contractTitle: string; contractNo: string; asOf: string;
  // Optional letterhead fields (from company settings) — enrich the header/footer.
  companyName?: string | null; contact?: string | null; email?: string | null;
  address?: string | null; footer?: string | null;
}

// ── shared chrome ────────────────────────────────────────────────────────────
function ReportHeader({ brand, title, subtitle }: { brand: ReportBrand; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${BRAND.ink}`, paddingBottom: 10, marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700 }}>{brand.wordmark}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.ink, fontFamily: "Georgia, serif" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: BRAND.mute }}>{subtitle}</div>}
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: BRAND.mute }}>
        <div style={{ fontWeight: 700, color: BRAND.ink }}>{brand.projectName}</div>
        <div>{brand.contractTitle} · {brand.contractNo}</div>
        <div>As of {brand.asOf}</div>
        {(brand.contact || brand.email) && (
          <div style={{ marginTop: 2 }}>{[brand.contact, brand.email].filter(Boolean).join(" · ")}</div>
        )}
      </div>
    </div>
  );
}

/** Branded letterhead footer, rendered once beneath every report (so it appears
 *  on the exported/emailed PDF). Company line + contact + confidentiality note. */
export function ReportFooter({ brand }: { brand: ReportBrand }) {
  const company = brand.companyName || brand.wordmark;
  const contactLine = [brand.address, brand.contact, brand.email].filter(Boolean).join("  ·  ");
  const note = (brand.footer && brand.footer.trim())
    || `${company}  ·  Confidential — prepared for the named recipient only.`;
  return (
    <div style={{ marginTop: 18, paddingTop: 8, borderTop: `2px solid ${BRAND.ink}`, fontSize: 9.5, color: BRAND.mute, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <span style={{ color: BRAND.gold, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{company}</span>
        {contactLine && <span>{"  ·  " + contactLine}</span>}
      </div>
      <div style={{ textAlign: "right" }}>{note}  ·  Generated {brand.asOf}</div>
    </div>
  );
}

function Kpi({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 130, border: `1px solid ${BRAND.rule}`, borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
      <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", color: BRAND.mute }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: accent ?? BRAND.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: BRAND.mute }}>{sub}</div>}
    </div>
  );
}
const kpiRow: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 };
const chartCard: React.CSSProperties = { border: `1px solid ${BRAND.rule}`, borderRadius: 10, padding: 12, background: "#fff", marginBottom: 14 };
const cardTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: BRAND.ink, marginBottom: 8 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 11 };
const td: React.CSSProperties = { padding: "5px 8px", borderBottom: `1px solid ${BRAND.rule}`, fontVariantNumeric: "tabular-nums" };
const tdr: React.CSSProperties = { ...td, textAlign: "right" };
const thL: React.CSSProperties = { ...td, textAlign: "left", color: BRAND.mute, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${BRAND.ink}` };
const thR: React.CSSProperties = { ...thL, textAlign: "right" };

const StatusPill = ({ s }: { s: string }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, color: "#fff", background: STATUS_COLORS[s] ?? BRAND.mute, textTransform: "capitalize" }}>
    {s.replace(/_/g, " ")}
  </span>
);

// ── 1 · Financial Summary ────────────────────────────────────────────────────
export function SummaryReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const s = financialSummary(data);
  const waterfall = [
    { name: "Original", value: s.originalValue, fill: BRAND.ink },
    { name: "Approved COs", value: s.approvedCoValue, fill: BRAND.gold },
    { name: "Revised", value: s.revisedValue, fill: BRAND.sapphire },
    { name: "Billed", value: s.billedToDate, fill: BRAND.emerald },
    { name: "Paid", value: s.paidToDate, fill: BRAND.amber },
  ];
  const donut = [
    { name: "Paid (net)", value: Math.max(0, s.paidToDate) },
    { name: "Retainage held", value: Math.max(0, s.retainageHeld) },
    { name: "Billed, unpaid", value: Math.max(0, s.billedToDate - s.paidToDate - s.retainageHeld) },
    { name: "Balance to finish", value: Math.max(0, s.balanceToFinish) },
  ];
  return (
    <div>
      <ReportHeader brand={brand} title="Project Financial Summary" subtitle="Contract value, billings, payments and retainage to date" />
      <div style={kpiRow}>
        <Kpi label="Revised Contract" value={money(s.revisedValue)} sub={`${money(s.originalValue)} + ${money(s.approvedCoValue)} COs`} />
        <Kpi label="Billed to Date" value={money(s.billedToDate)} accent={BRAND.sapphire} sub={pct(s.pctComplete) + " complete"} />
        <Kpi label="Paid to Date" value={money(s.paidToDate)} accent={BRAND.emerald} sub={pct(s.pctPaid) + " of billed"} />
        <Kpi label="Retainage Held" value={money(s.retainageHeld)} accent={BRAND.amber} />
        <Kpi label="Balance to Finish" value={money(s.balanceToFinish)} accent={BRAND.rose} />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ ...chartCard, flex: 1.4 }}>
          <div style={cardTitle}>Contract → Billed → Paid</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={waterfall} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
              <Tooltip formatter={(v: any) => money2(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={kmoney} style={{ fontSize: 10, fill: BRAND.ink }} />
                {waterfall.map((w, i) => <Cell key={i} fill={w.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...chartCard, flex: 1 }}>
          <div style={cardTitle}>Where the contract value sits</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>
                {donut.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => money2(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── 2 · Billing / Pay App History ────────────────────────────────────────────
export function BillingReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const rows = billingHistory(data.payApps);
  const totalThisPeriod = rows.reduce((s, r) => s + r.thisPeriod, 0);
  const lastCompleted = rows.length ? rows[rows.length - 1].completedToDate : 0;
  const lastRetainage = rows.length ? rows[rows.length - 1].retainage : 0;
  return (
    <div>
      <ReportHeader brand={brand} title="Billing & Pay Application History" subtitle="Per-application billings, retainage and amounts certified" />
      <div style={kpiRow}>
        <Kpi label="Applications" value={String(rows.length)} />
        <Kpi label="Completed to Date" value={money(lastCompleted)} accent={BRAND.sapphire} />
        <Kpi label="Retainage Held" value={money(lastRetainage)} accent={BRAND.amber} />
        <Kpi label="Total Billed (periods)" value={money(totalThisPeriod)} accent={BRAND.emerald} />
      </div>
      <div style={chartCard}>
        <div style={cardTitle}>Billed this period vs. completed-to-date</div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v: any) => money2(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="thisPeriod" name="This period" fill={BRAND.sapphire} radius={[4, 4, 0, 0]} />
            <Bar dataKey="retainage" name="Retainage" fill={BRAND.amber} radius={[4, 4, 0, 0]} />
            <Line dataKey="completedToDate" name="Completed to date" stroke={BRAND.emerald} strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={chartCard}>
        <div className="overflow-x-auto"><table style={tableStyle}>
          <thead><tr><th style={thL}>App</th><th style={thL}>Period</th><th style={thR}>This Period</th><th style={thR}>Completed</th><th style={thR}>Retainage</th><th style={thR}>Current Due</th><th style={thL}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.payAppNo}>
                <td style={td}>{r.name}</td><td style={td}>{r.periodEnd ?? "—"}</td>
                <td style={tdr}>{money2(r.thisPeriod)}</td><td style={tdr}>{money2(r.completedToDate)}</td>
                <td style={tdr}>{money2(r.retainage)}</td><td style={tdr}>{money2(r.currentDue)}</td>
                <td style={td}><StatusPill s={r.status} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td style={td} colSpan={7}>No pay applications yet.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── 3 · Change Order Log ─────────────────────────────────────────────────────
export function ChangeOrderReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const log = changeOrderLog(data.changeOrders);
  return (
    <div>
      <ReportHeader brand={brand} title="Change Order Log" subtitle="Prime change orders — approved value and pending exposure" />
      <div style={kpiRow}>
        <Kpi label="Change Orders" value={String(log.rows.length)} />
        <Kpi label="Approved Value" value={money(log.approvedValue)} accent={BRAND.emerald} />
        <Kpi label="Pending Exposure" value={money(log.pendingValue)} accent={BRAND.amber} />
      </div>
      <div style={chartCard}>
        <div style={cardTitle}>Value by status</div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={log.byStatus} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} tickFormatter={(s) => s.replace(/_/g, " ")} />
            <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v: any) => money2(v)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" formatter={kmoney} style={{ fontSize: 10, fill: BRAND.ink }} />
              {log.byStatus.map((b, i) => <Cell key={i} fill={STATUS_COLORS[b.status] ?? BRAND.mute} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={chartCard}>
        <div className="overflow-x-auto"><table style={tableStyle}>
          <thead><tr><th style={thL}>CO</th><th style={thL}>Title</th><th style={thR}>Amount</th><th style={thL}>Status</th></tr></thead>
          <tbody>
            {log.rows.map((r) => (
              <tr key={r.label}>
                <td style={td}>{r.label}</td><td style={td}>{r.title}</td>
                <td style={tdr}>{money2(r.amount)}</td><td style={td}><StatusPill s={r.status} /></td>
              </tr>
            ))}
            {!log.rows.length && <tr><td style={td} colSpan={4}>No change orders.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── 4 · Cash Flow ────────────────────────────────────────────────────────────
export function CashFlowReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const rows = cashFlow(data.primePayments, data.commitmentPayments);
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  return (
    <div>
      <ReportHeader brand={brand} title="Cash Flow" subtitle="Money in (owner → us) vs money out (us → subcontractors)" />
      <div style={kpiRow}>
        <Kpi label="Received (in)" value={money(totalIn)} accent={BRAND.emerald} />
        <Kpi label="Paid out" value={money(totalOut)} accent={BRAND.rose} />
        <Kpi label="Net position" value={money(totalIn - totalOut)} accent={totalIn - totalOut >= 0 ? BRAND.emerald : BRAND.rose} />
      </div>
      <div style={chartCard}>
        <div style={cardTitle}>Monthly in / out with running net</div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v: any) => money2(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="in" name="In" fill={BRAND.emerald} radius={[4, 4, 0, 0]} />
            <Bar dataKey="out" name="Out" fill={BRAND.rose} radius={[4, 4, 0, 0]} />
            <Line dataKey="cumulative" name="Cumulative net" stroke={BRAND.sapphire} strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 5 · Subcontractor / Commitment Status ────────────────────────────────────
export function CommitmentReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const rows = commitmentStatus(data.commitments, data.commitmentPayments, data.changeOrders);
  const committed = rows.reduce((s, r) => s + r.committed, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  return (
    <div>
      <ReportHeader brand={brand} title="Subcontractor / Commitment Status" subtitle="Committed vs paid vs remaining by subcontract" />
      <div style={kpiRow}>
        <Kpi label="Commitments" value={String(rows.length)} />
        <Kpi label="Total Committed" value={money(committed)} accent={BRAND.sapphire} />
        <Kpi label="Paid" value={money(paid)} accent={BRAND.emerald} />
        <Kpi label="Remaining" value={money(committed - paid)} accent={BRAND.amber} />
      </div>
      <div style={chartCard}>
        <div style={cardTitle}>Paid vs remaining</div>
        <ResponsiveContainer width="100%" height={Math.max(150, rows.length * 56 + 30)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} horizontal={false} />
            <XAxis type="number" tickFormatter={kmoney} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
            <Tooltip formatter={(v: any) => money2(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="paid" name="Paid" stackId="a" fill={BRAND.emerald} radius={[4, 0, 0, 4]} />
            <Bar dataKey="remaining" name="Remaining" stackId="a" fill={BRAND.amber} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={chartCard}>
        <div className="overflow-x-auto"><table style={tableStyle}>
          <thead><tr><th style={thL}>Subcontract</th><th style={thR}>Committed</th><th style={thR}>Paid</th><th style={thR}>Remaining</th><th style={thR}>% Paid</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.name}</td><td style={tdr}>{money2(r.committed)}</td>
                <td style={tdr}>{money2(r.paid)}</td><td style={tdr}>{money2(r.remaining)}</td><td style={tdr}>{pct(r.pctPaid)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td style={td} colSpan={5}>No commitments.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── 6 · Lien Waiver Compliance ───────────────────────────────────────────────
export function LienReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const lc = lienCompliance(data.liens);
  return (
    <div>
      <ReportHeader brand={brand} title="Lien Waiver Compliance" subtitle="Outbound (we issue) and inbound (subs sign) waiver status" />
      <div style={kpiRow}>
        <Kpi label="Outbound waivers" value={String(lc.totalOutbound)} accent={BRAND.sapphire} />
        <Kpi label="Inbound waivers" value={String(lc.totalInbound)} accent={BRAND.emerald} />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {([["Outbound", lc.outbound], ["Inbound", lc.inbound]] as const).map(([label, series]) => (
          <div style={{ ...chartCard, flex: 1 }} key={label}>
            <div style={cardTitle}>{label} by status</div>
            {series.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={series} dataKey="count" nameKey="status" innerRadius={42} outerRadius={76} paddingAngle={2}>
                    {series.map((x, i) => <Cell key={i} fill={STATUS_COLORS[x.status] ?? PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ fontSize: 11, color: BRAND.mute, padding: 20 }}>No {label.toLowerCase()} waivers.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Owner-safe summary (NO payments-out, NO subcontractor costs/margins) ──────
export function OwnerSummaryReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const s = financialSummary(data);
  const netBilled = Math.max(0, s.billedToDate - s.retainageHeld);
  const bars = [
    { name: "Original", value: s.originalValue, fill: BRAND.ink },
    { name: "Approved COs", value: s.approvedCoValue, fill: BRAND.gold },
    { name: "Revised", value: s.revisedValue, fill: BRAND.sapphire },
    { name: "Billed", value: s.billedToDate, fill: BRAND.emerald },
  ];
  const donut = [
    { name: "Earned (less retainage)", value: netBilled },
    { name: "Retainage held", value: Math.max(0, s.retainageHeld) },
    { name: "Balance to finish", value: Math.max(0, s.balanceToFinish) },
  ];
  return (
    <div>
      <ReportHeader brand={brand} title="Project Financial Summary" subtitle="Contract value, approved changes, billings and retainage to date" />
      <div style={kpiRow}>
        <Kpi label="Revised Contract" value={money(s.revisedValue)} sub={`${money(s.originalValue)} + ${money(s.approvedCoValue)} COs`} />
        <Kpi label="Billed to Date" value={money(s.billedToDate)} accent={BRAND.sapphire} sub={pct(s.pctComplete) + " complete"} />
        <Kpi label="Retainage Held" value={money(s.retainageHeld)} accent={BRAND.amber} />
        <Kpi label="Balance to Finish" value={money(s.balanceToFinish)} accent={BRAND.emerald} />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ ...chartCard, flex: 1.4 }}>
          <div style={cardTitle}>Contract value &amp; progress</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={bars} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
              <Tooltip formatter={(v: any) => money2(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={kmoney} style={{ fontSize: 10, fill: BRAND.ink }} />
                {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...chartCard, flex: 1 }}>
          <div style={cardTitle}>Completion of the contract</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>
                {donut.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => money2(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── 7 · Payments Received (owner → us) ───────────────────────────────────────
export function PaymentsReceivedReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const r = paymentsReceived(data.primePayments);
  const owner = data.parties?.owner ?? "Owner";
  const contractor = data.parties?.contractor ?? "Us";
  const chart = r.rows.map((row, i) => ({ label: fmtDate(row.date), amount: row.amount, runningTotal: row.runningTotal, i }));
  return (
    <div>
      <ReportHeader brand={brand} title="Payments Received" subtitle={`${owner} → ${contractor} · every receipt recorded, with running total`} />
      <div style={kpiRow}>
        <Kpi label="Total Received" value={money(r.total)} accent={BRAND.emerald} sub={`${r.count} payment${r.count === 1 ? "" : "s"}`} />
        <Kpi label="Payments" value={String(r.count)} />
        <Kpi label="First Receipt" value={fmtDate(r.firstDate)} />
        <Kpi label="Latest Receipt" value={fmtDate(r.lastDate)} accent={BRAND.sapphire} />
      </div>
      <div style={chartCard}>
        <div style={cardTitle}>Receipts &amp; cumulative total</div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chart} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={kmoney} tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v: any) => money2(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="amount" name="Payment" fill={BRAND.emerald} radius={[4, 4, 0, 0]} />
            <Line dataKey="runningTotal" name="Cumulative received" stroke={BRAND.sapphire} strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={chartCard}>
        <div className="overflow-x-auto"><table style={tableStyle}>
          <thead><tr>
            <th style={thL}>#</th><th style={thL}>Date</th><th style={thL}>Pay App</th>
            <th style={thL}>Method</th><th style={thL}>Reference</th>
            <th style={thR}>Amount</th><th style={thR}>Running Total</th>
          </tr></thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i}>
                <td style={td}>{i + 1}</td><td style={td}>{fmtDate(row.date)}</td>
                <td style={td}>{row.payAppNo != null ? `#${row.payAppNo}` : "—"}</td>
                <td style={td}>{cap(row.method)}</td><td style={td}>{row.reference || "—"}</td>
                <td style={tdr}>{money2(row.amount)}</td><td style={tdr}>{money2(row.runningTotal)}</td>
              </tr>
            ))}
            {!r.rows.length && <tr><td style={td} colSpan={7}>No payments recorded yet.</td></tr>}
          </tbody>
          {r.rows.length > 0 && (
            <tfoot><tr>
              <td style={{ ...td, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }} colSpan={5}>TOTAL RECEIVED</td>
              <td style={{ ...tdr, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }}>{money2(r.total)}</td>
              <td style={{ ...tdr, borderTop: `2px solid ${BRAND.ink}` }} />
            </tr></tfoot>
          )}
        </table></div>
      </div>
    </div>
  );
}

// ── 8 · Subcontractor Payments (us → subs) ───────────────────────────────────
export function SubcontractorPaymentsReportView({ data, brand }: { data: ReportData; brand: ReportBrand }) {
  const r = subcontractorPayments(data.commitments, data.commitmentPayments);
  const contractor = data.parties?.contractor ?? "Us";
  const top = r.byVendor[0];
  const chart = r.byVendor.map((v) => ({ name: v.vendor.length > 22 ? v.vendor.slice(0, 21) + "…" : v.vendor, paid: v.subtotal }));
  return (
    <div>
      <ReportHeader brand={brand} title="Subcontractor Payments" subtitle={`${contractor} → subcontractors · individual payments and collective totals`} />
      <div style={kpiRow}>
        <Kpi label="Total Paid Out" value={money(r.total)} accent={BRAND.rose} sub={`${r.count} payment${r.count === 1 ? "" : "s"}`} />
        <Kpi label="Subcontractors" value={String(r.vendorCount)} accent={BRAND.sapphire} />
        <Kpi label="Payments" value={String(r.count)} />
        <Kpi label="Largest Sub" value={top ? money(top.subtotal) : "—"} accent={BRAND.amber} sub={top?.vendor} />
      </div>

      {r.byVendor.length > 0 && (
        <div style={chartCard}>
          <div style={cardTitle}>Total paid per subcontractor</div>
          <ResponsiveContainer width="100%" height={Math.max(150, r.byVendor.length * 48 + 30)}>
            <BarChart data={chart} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.rule} horizontal={false} />
              <XAxis type="number" tickFormatter={kmoney} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
              <Tooltip formatter={(v: any) => money2(v)} />
              <Bar dataKey="paid" name="Paid" fill={BRAND.sapphire} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="paid" position="right" formatter={kmoney} style={{ fontSize: 9, fill: BRAND.ink }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Collective summary — one row per subcontractor */}
      <div style={chartCard}>
        <div style={cardTitle}>Summary by subcontractor</div>
        <div className="overflow-x-auto"><table style={tableStyle}>
          <thead><tr>
            <th style={thL}>Subcontractor</th><th style={thR}>Payments</th>
            <th style={thR}>Total Paid</th><th style={thR}>% of Total</th>
          </tr></thead>
          <tbody>
            {r.byVendor.map((v) => (
              <tr key={v.vendor}>
                <td style={td}>{v.vendor}</td><td style={tdr}>{v.count}</td>
                <td style={tdr}>{money2(v.subtotal)}</td><td style={tdr}>{pct(v.pctOfTotal)}</td>
              </tr>
            ))}
            {!r.byVendor.length && <tr><td style={td} colSpan={4}>No subcontractor payments recorded yet.</td></tr>}
          </tbody>
          {r.byVendor.length > 0 && (
            <tfoot><tr>
              <td style={{ ...td, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }}>ALL SUBCONTRACTORS</td>
              <td style={{ ...tdr, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }}>{r.count}</td>
              <td style={{ ...tdr, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }}>{money2(r.total)}</td>
              <td style={{ ...tdr, fontWeight: 800, borderTop: `2px solid ${BRAND.ink}` }}>100.0%</td>
            </tr></tfoot>
          )}
        </table></div>
      </div>

      {/* Individual payments, grouped per subcontractor */}
      {r.byVendor.map((v) => (
        <div style={chartCard} key={v.vendor}>
          <div style={{ ...cardTitle, display: "flex", justifyContent: "space-between" }}>
            <span>{v.vendor}</span>
            <span style={{ color: BRAND.emerald }}>{money2(v.subtotal)} · {v.count} payment{v.count === 1 ? "" : "s"}</span>
          </div>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thL}>Date</th><th style={thL}>Commitment</th>
              <th style={thL}>Method</th><th style={thL}>Reference</th><th style={thR}>Amount</th>
            </tr></thead>
            <tbody>
              {v.payments.map((p, i) => (
                <tr key={i}>
                  <td style={td}>{fmtDate(p.date)}</td><td style={td}>{p.commitment}</td>
                  <td style={td}>{cap(p.method)}</td><td style={td}>{p.reference || "—"}</td>
                  <td style={tdr}>{money2(p.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td style={{ ...td, fontWeight: 700, borderTop: `2px solid ${BRAND.ink}` }} colSpan={4}>Subtotal — {v.vendor}</td>
              <td style={{ ...tdr, fontWeight: 700, borderTop: `2px solid ${BRAND.ink}` }}>{money2(v.subtotal)}</td>
            </tr></tfoot>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── registry ─────────────────────────────────────────────────────────────────
export interface ReportDef {
  key: string; title: string; description: string;
  Component: (p: { data: ReportData; brand: ReportBrand }) => JSX.Element;
}
export const FINANCIAL_REPORTS: ReportDef[] = [
  { key: "summary", title: "Project Financial Summary", description: "Contract, billings, payments & retainage to date", Component: SummaryReportView },
  { key: "billing", title: "Billing & Pay App History", description: "Per-application billings, retainage & certified amounts", Component: BillingReportView },
  { key: "payments-received", title: "Payments Received (Owner → Us)", description: "Every owner receipt, incremental, with running total", Component: PaymentsReceivedReportView },
  { key: "sub-payments", title: "Subcontractor Payments (Us → Subs)", description: "Paid to each subcontractor — individually & collectively", Component: SubcontractorPaymentsReportView },
  { key: "change-orders", title: "Change Order Log", description: "Approved value & pending exposure by status", Component: ChangeOrderReportView },
  { key: "cash-flow", title: "Cash Flow", description: "Money in vs out with running net position", Component: CashFlowReportView },
  { key: "commitments", title: "Subcontractor Status", description: "Committed vs paid vs remaining by subcontract", Component: CommitmentReportView },
  { key: "liens", title: "Lien Waiver Compliance", description: "Outbound & inbound waiver status", Component: LienReportView },
];

// Owner/client-facing reports — deliberately EXCLUDES cash-flow (sub payments) and
// subcontractor status (our costs/margins). Owner sees contract, billings, and COs.
export const OWNER_REPORTS: ReportDef[] = [
  { key: "summary", title: "Project Financial Summary", description: "Contract value, approved changes, billings & retainage", Component: OwnerSummaryReportView },
  { key: "billing", title: "Billing & Pay App History", description: "Per-application billings, retainage & amounts due", Component: BillingReportView },
  { key: "change-orders", title: "Change Order Log", description: "Approved value & pending change orders", Component: ChangeOrderReportView },
];
