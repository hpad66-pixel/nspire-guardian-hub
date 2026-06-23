/**
 * financialReports — pure dataset builders for the Financial Reports center.
 *
 * Each function takes already-fetched, normalized rows and returns the numbers +
 * chart series a report needs. No data fetching, no React — so the financial math
 * is unit-tested independently of the UI (the bar/line/donut components just render
 * what these return).
 */

export const APPROVED_CO_STATUSES = ["executed", "approved"];
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface RContract { original_value: number; retainage_pct: number; }
export interface RChangeOrder {
  co_no: number; co_type: string; title: string; amount: number; status: string;
  commitment_id: string | null;
}
export interface RPayApp {
  pay_app_no: number; period_end: string | null; status: string;
  submitted_amount: number | null; approved_amount: number | null;
  pay_app_data: any | null;
}
export interface RPayment { amount: number; received_date: string | null; }
export interface RCommitment { id: string; title: string; original_value: number; }
export interface RCommitmentPayment { commitment_id: string; amount: number; paid_date: string | null; }
export interface RLien { direction: string | null; status: string | null; }

export interface ReportData {
  contract: RContract;
  changeOrders: RChangeOrder[];
  payApps: RPayApp[];
  primePayments: RPayment[];
  commitments: RCommitment[];
  commitmentPayments: RCommitmentPayment[];
  liens: RLien[];
}

const isApproved = (s: string) => APPROVED_CO_STATUSES.includes(s);
const num = (v: any) => Number(v) || 0;
const monthKey = (d: string | null) => (d ? String(d).slice(0, 7) : "unknown"); // YYYY-MM

/** Latest pay app (highest pay_app_no) — the running to-date position. */
export function latestPayApp(payApps: RPayApp[]): RPayApp | null {
  if (!payApps.length) return null;
  return [...payApps].sort((a, b) => b.pay_app_no - a.pay_app_no)[0];
}

// ── 1 · Project Financial Summary ───────────────────────────────────────────
export interface FinancialSummary {
  originalValue: number;
  approvedCoValue: number;
  revisedValue: number;
  billedToDate: number;
  retainageHeld: number;
  paidToDate: number;
  balanceToFinish: number;
  pctComplete: number; // billed / revised
  pctPaid: number;     // paid / billed
}

export function financialSummary(d: ReportData): FinancialSummary {
  const approvedCoValue = round2(
    d.changeOrders.filter((c) => c.co_type === "PCO" && isApproved(c.status)).reduce((s, c) => s + num(c.amount), 0),
  );
  const originalValue = round2(d.contract.original_value);
  const revisedValue = round2(originalValue + approvedCoValue);
  const last = latestPayApp(d.payApps);
  const billedToDate = round2(
    num(last?.pay_app_data?.completed_stored_to_date) || num(last?.submitted_amount),
  );
  const retainageHeld = round2(num(last?.pay_app_data?.retainage_total));
  const paidToDate = round2(d.primePayments.reduce((s, p) => s + num(p.amount), 0));
  const balanceToFinish = round2(revisedValue - billedToDate);
  return {
    originalValue, approvedCoValue, revisedValue, billedToDate, retainageHeld, paidToDate, balanceToFinish,
    pctComplete: revisedValue > 0 ? round2((billedToDate / revisedValue) * 100) : 0,
    pctPaid: billedToDate > 0 ? round2((paidToDate / billedToDate) * 100) : 0,
  };
}

// ── 2 · Billing / Pay Application History ────────────────────────────────────
export interface BillingRow {
  name: string; payAppNo: number; periodEnd: string | null;
  completedToDate: number; thisPeriod: number; retainage: number;
  earnedLessRetainage: number; currentDue: number; status: string;
}

export function billingHistory(payApps: RPayApp[]): BillingRow[] {
  const sorted = [...payApps].sort((a, b) => a.pay_app_no - b.pay_app_no);
  let prevCompleted = 0;
  return sorted.map((p) => {
    const g = p.pay_app_data ?? {};
    const completed = round2(num(g.completed_stored_to_date) || num(p.submitted_amount));
    const row: BillingRow = {
      name: `#${p.pay_app_no}`, payAppNo: p.pay_app_no, periodEnd: p.period_end,
      completedToDate: completed,
      thisPeriod: round2(num(g.completed_stored_to_date) ? completed - prevCompleted : num(p.submitted_amount)),
      retainage: round2(num(g.retainage_total)),
      earnedLessRetainage: round2(num(g.total_earned_less_retainage)),
      currentDue: round2(num(g.current_payment_due) || num(p.approved_amount) || num(p.submitted_amount)),
      status: p.status,
    };
    prevCompleted = completed;
    return row;
  });
}

// ── 3 · Change Order Log ─────────────────────────────────────────────────────
export interface ChangeOrderLog {
  rows: Array<{ label: string; co_no: number; co_type: string; title: string; amount: number; status: string }>;
  approvedValue: number;
  pendingValue: number;
  byStatus: Array<{ status: string; count: number; value: number }>;
}

export function changeOrderLog(cos: RChangeOrder[], opts: { primeOnly?: boolean } = {}): ChangeOrderLog {
  const rows = (opts.primeOnly === false ? cos : cos.filter((c) => c.co_type === "PCO"))
    .sort((a, b) => a.co_no - b.co_no)
    .map((c) => ({
      label: `${c.co_type}-${String(c.co_no).padStart(3, "0")}`,
      co_no: c.co_no, co_type: c.co_type, title: c.title, amount: round2(c.amount), status: c.status,
    }));
  const approvedValue = round2(rows.filter((r) => isApproved(r.status)).reduce((s, r) => s + r.amount, 0));
  const pendingValue = round2(rows.filter((r) => !isApproved(r.status)).reduce((s, r) => s + r.amount, 0));
  const statusMap = new Map<string, { count: number; value: number }>();
  for (const r of rows) {
    const e = statusMap.get(r.status) ?? { count: 0, value: 0 };
    e.count += 1; e.value = round2(e.value + r.amount);
    statusMap.set(r.status, e);
  }
  const byStatus = [...statusMap.entries()].map(([status, v]) => ({ status, ...v }));
  return { rows, approvedValue, pendingValue, byStatus };
}

// ── 4 · Cash Flow (money in vs out, monthly + cumulative) ────────────────────
export interface CashFlowRow { month: string; in: number; out: number; net: number; cumulative: number; }

export function cashFlow(primePayments: RPayment[], commitmentPayments: RCommitmentPayment[]): CashFlowRow[] {
  const months = new Map<string, { in: number; out: number }>();
  const bump = (k: string, field: "in" | "out", amt: number) => {
    const e = months.get(k) ?? { in: 0, out: 0 };
    e[field] = round2(e[field] + amt);
    months.set(k, e);
  };
  primePayments.forEach((p) => bump(monthKey(p.received_date), "in", num(p.amount)));
  commitmentPayments.forEach((p) => bump(monthKey(p.paid_date), "out", num(p.amount)));
  const ordered = [...months.keys()].filter((k) => k !== "unknown").sort();
  if (months.has("unknown")) ordered.push("unknown");
  let cumulative = 0;
  return ordered.map((month) => {
    const e = months.get(month)!;
    const net = round2(e.in - e.out);
    cumulative = round2(cumulative + net);
    return { month, in: e.in, out: e.out, net, cumulative };
  });
}

// ── 5 · Subcontractor / Commitment Status ────────────────────────────────────
export interface CommitmentStatusRow {
  id: string; name: string; committed: number; paid: number; remaining: number; pctPaid: number;
}

export function commitmentStatus(
  commitments: RCommitment[], commitmentPayments: RCommitmentPayment[], cos: RChangeOrder[],
): CommitmentStatusRow[] {
  return commitments.map((c) => {
    const ccoValue = round2(
      cos.filter((co) => co.commitment_id === c.id && isApproved(co.status)).reduce((s, co) => s + num(co.amount), 0),
    );
    const committed = round2(num(c.original_value) + ccoValue);
    const paid = round2(commitmentPayments.filter((p) => p.commitment_id === c.id).reduce((s, p) => s + num(p.amount), 0));
    const remaining = round2(committed - paid);
    return { id: c.id, name: c.title, committed, paid, remaining, pctPaid: committed > 0 ? round2((paid / committed) * 100) : 0 };
  });
}

// ── 6 · Lien Waiver Compliance ───────────────────────────────────────────────
export interface LienCompliance {
  outbound: Array<{ status: string; count: number }>;
  inbound: Array<{ status: string; count: number }>;
  totalOutbound: number;
  totalInbound: number;
}

export function lienCompliance(liens: RLien[]): LienCompliance {
  const tally = (dir: string) => {
    const m = new Map<string, number>();
    liens.filter((l) => l.direction === dir).forEach((l) => m.set(l.status ?? "unknown", (m.get(l.status ?? "unknown") ?? 0) + 1));
    return [...m.entries()].map(([status, count]) => ({ status, count }));
  };
  const outbound = tally("outbound");
  const inbound = tally("inbound");
  return {
    outbound, inbound,
    totalOutbound: outbound.reduce((s, x) => s + x.count, 0),
    totalInbound: inbound.reduce((s, x) => s + x.count, 0),
  };
}
