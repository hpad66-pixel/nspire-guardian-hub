/**
 * Prime-contract pay-application continuation logic (AIA G702/G703).
 *
 * Pure functions — no I/O — so the money math is unit-tested in isolation.
 * The hooks in usePayAppContinuation / useGeneratePayApp call these.
 *
 * Model: each prime contract has a Schedule of Values (`sov_line_items`, the
 * G703 column C — constant per contract, base + change_order kinds). Each pay
 * application records per-line progress (`pay_app_line_progress`, the G703
 * column G — work completed to date). A new pay app carries forward the prior
 * pay app's to-date as its starting balance; the GC enters "this period" and
 * to-date = prior + this period.
 */

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const round4 = (n: number) => Math.round((Number(n) || 0) * 1e4) / 1e4;
const sum = (xs: number[]) => xs.reduce((a, b) => a + (Number(b) || 0), 0);

// ── Change order → SOV line ──────────────────────────────────────────────────

export interface CoLineInput {
  id: string;
  co_no: number | null;
  title: string | null;
  description: string | null;
  amount: number;
}

/**
 * Shape an approved/executed change order as an `sov_line_items` insert payload
 * (a lump-sum line valued at the CO amount). Mirrors how imported pay apps
 * carried COs as G703 items 17+.
 */
export function coToSovLine(
  co: CoLineInput,
  opts: { sortOrder: number; itemNo: string },
): {
  item_no: string;
  kind: "change_order";
  change_order_id: string;
  budget_code: string | null;
  description: string;
  unit: string;
  scheduled_qty: number;
  unit_price: number;
  scheduled_value: number;
  sort_order: number;
} {
  const value = round2(co.amount);
  const label =
    (co.title && co.title.trim()) ||
    (co.description && co.description.trim()) ||
    `Change Order ${co.co_no ?? ""}`.trim();
  return {
    item_no: opts.itemNo,
    kind: "change_order",
    change_order_id: co.id,
    budget_code: co.co_no != null ? `PCO #${String(co.co_no).padStart(3, "0")}` : null,
    description: label,
    unit: "LS",
    scheduled_qty: 1,
    unit_price: value,
    scheduled_value: value,
    sort_order: opts.sortOrder,
  };
}

// ── Per-line to-date ─────────────────────────────────────────────────────────

export interface LineToDate {
  value_to_date: number;
  qty_to_date: number;
  pct_complete: number;
  retainage: number;
}

/** Compute a line's to-date figures from prior to-date + this-period entry. */
export function computeLineToDate(input: {
  scheduledValue: number;
  priorValueToDate: number;
  priorQtyToDate: number;
  valueThisPeriod: number;
  qtyThisPeriod: number;
  retainagePct: number;
}): LineToDate {
  const value_to_date = round2(input.priorValueToDate + input.valueThisPeriod);
  const qty_to_date = round4(input.priorQtyToDate + input.qtyThisPeriod);
  const pct_complete =
    input.scheduledValue > 0 ? round2((value_to_date / input.scheduledValue) * 100) : 0;
  const retainage = round2(value_to_date * ((Number(input.retainagePct) || 0) / 100));
  return { value_to_date, qty_to_date, pct_complete, retainage };
}

// ── Continuation seeding ─────────────────────────────────────────────────────

export interface PriorProgressLike {
  sov_line_item_id: string;
  value_to_date: number;
  qty_to_date: number;
  retainage: number;
}

/**
 * Seed a new pay app's progress rows: every SOV line gets a row whose to-date is
 * carried forward from the prior pay app (this-period zeroed). Lines with no
 * prior progress start at zero.
 */
export function seedContinuationRows(input: {
  payAppId: string;
  tenantId: string;
  sovLines: Array<{ id: string; scheduled_value: number }>;
  priorByLineId: Record<string, PriorProgressLike | undefined>;
}): Array<{
  tenant_id: string;
  pay_app_id: string;
  sov_line_item_id: string;
  qty_to_date: number;
  value_to_date: number;
  pct_complete: number;
  qty_this_period: number;
  value_this_period: number;
  retainage: number;
}> {
  return input.sovLines.map((li) => {
    const prior = input.priorByLineId[li.id];
    const value_to_date = prior ? round2(prior.value_to_date) : 0;
    const qty_to_date = prior ? round4(prior.qty_to_date) : 0;
    const pct_complete =
      li.scheduled_value > 0 ? round2((value_to_date / li.scheduled_value) * 100) : 0;
    return {
      tenant_id: input.tenantId,
      pay_app_id: input.payAppId,
      sov_line_item_id: li.id,
      qty_to_date,
      value_to_date,
      pct_complete,
      qty_this_period: 0,
      value_this_period: 0,
      retainage: prior ? round2(prior.retainage) : 0,
    };
  });
}

// ── G702 cover ───────────────────────────────────────────────────────────────

export interface G702Summary {
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  completed_stored_to_date: number;
  retainage_total: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish: number;
}

/**
 * Compute the G702 cover summary from the full line set + prior certificates.
 * `previousCertificates` = the prior pay app's total-earned-less-retainage
 * (what's already been billed), so current_payment_due is the increment.
 */
export function computeG702(input: {
  originalContractSum: number;
  lines: Array<{
    kind: "base" | "change_order";
    scheduled_value: number;
    value_to_date: number;
    retainage: number;
  }>;
  previousCertificates: number;
}): G702Summary {
  const original_contract_sum = round2(input.originalContractSum);
  const net_change_orders = round2(
    sum(input.lines.filter((l) => l.kind === "change_order").map((l) => l.scheduled_value)),
  );
  const contract_sum_to_date = round2(original_contract_sum + net_change_orders);
  const completed_stored_to_date = round2(sum(input.lines.map((l) => l.value_to_date)));
  const retainage_total = round2(sum(input.lines.map((l) => l.retainage)));
  const total_earned_less_retainage = round2(completed_stored_to_date - retainage_total);
  const less_previous_certificates = round2(input.previousCertificates);
  const current_payment_due = round2(total_earned_less_retainage - less_previous_certificates);
  const balance_to_finish = round2(contract_sum_to_date - completed_stored_to_date);
  return {
    original_contract_sum,
    net_change_orders,
    contract_sum_to_date,
    completed_stored_to_date,
    retainage_total,
    total_earned_less_retainage,
    less_previous_certificates,
    current_payment_due,
    balance_to_finish,
  };
}
