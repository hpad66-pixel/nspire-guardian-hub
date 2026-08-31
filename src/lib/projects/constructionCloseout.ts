/**
 * Construction closeout readiness — derived from Final Invoice (G702) +
 * field punch / project-log + permit register + closeout checklist.
 * Pure helpers so Vitest can lock the maths without React.
 */

export interface FinalInvoiceSnapshot {
  isFinalInvoice: boolean;
  payAppNo?: number | null;
  status?: string | null;
  contractSumToDate: number;
  completedStoredToDate: number;
  cashReceivedToDate: number;
  currentPaymentDue: number;
  retainageTotal: number;
  balanceToFinish: number;
}

export interface CloseoutCounts {
  punchOpen: number;
  punchTotal: number;
  trackerOpen: number;
  trackerTotal: number;
  closeoutDone: number;
  closeoutTotal: number;
  permitsClosed: number;
  permitsTotal: number;
}

export interface ConstructionCloseoutReadiness {
  constructionPct: number;
  constructionLabel: string;
  punchPct: number;
  closeoutPct: number;
  permitPct: number;
  overallPct: number;
  isConstructionComplete: boolean;
  remainingDue: number;
  openFieldItems: number;
  openCityItems: number;
  headline: string;
  subline: string;
}

const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

/** Prefer pay_app_data reconciled snapshot; fall back to column mirrors. */
export function finalInvoiceFromPayApp(pa: any | null | undefined): FinalInvoiceSnapshot | null {
  if (!pa) return null;
  const data = (pa.pay_app_data ?? {}) as Record<string, unknown>;
  const isFinal =
    Boolean(pa.is_final_invoice) ||
    Boolean(data.is_final_invoice);
  if (!isFinal && !data.use_reconciled_snapshot) {
    // Still allow a non-final latest app to drive % complete when present
  }
  const contract = n(data.contract_sum_to_date);
  const completed = n(data.completed_stored_to_date);
  if (contract <= 0 && completed <= 0 && !isFinal) return null;
  return {
    isFinalInvoice: isFinal,
    payAppNo: pa.pay_app_no ?? data.app_no ?? null,
    status: pa.status ?? null,
    contractSumToDate: contract,
    completedStoredToDate: completed,
    cashReceivedToDate: n(data.cash_received_to_date ?? data.less_previous_certificates),
    currentPaymentDue: n(data.current_payment_due ?? data.amount_certified ?? pa.submitted_amount),
    retainageTotal: n(data.retainage_total),
    balanceToFinish: n(data.balance_to_finish),
  };
}

export function constructionPctFromInvoice(inv: FinalInvoiceSnapshot | null): number {
  if (!inv || inv.contractSumToDate <= 0) return 0;
  return Math.min(100, Math.round((inv.completedStoredToDate / inv.contractSumToDate) * 1000) / 10);
}

export function computeConstructionCloseoutReadiness(opts: {
  invoice: FinalInvoiceSnapshot | null;
  counts: CloseoutCounts;
}): ConstructionCloseoutReadiness {
  const { invoice, counts } = opts;
  const constructionPct = constructionPctFromInvoice(invoice);
  const isFinal = Boolean(invoice?.isFinalInvoice);
  // Final invoice means intended scope is done even if leftover contract $ remains.
  const isConstructionComplete = isFinal || constructionPct >= 99.5;

  const punchClosed = Math.max(0, counts.punchTotal - counts.punchOpen);
  const trackerClosed = Math.max(0, counts.trackerTotal - counts.trackerOpen);
  const fieldTotal = counts.punchTotal + counts.trackerTotal;
  const fieldClosed = punchClosed + trackerClosed;
  const punchPct = fieldTotal > 0 ? Math.round((fieldClosed / fieldTotal) * 100) : (isConstructionComplete ? 100 : 0);

  const closeoutPct = counts.closeoutTotal > 0
    ? Math.round((counts.closeoutDone / counts.closeoutTotal) * 100)
    : 0;
  const permitPct = counts.permitsTotal > 0
    ? Math.round((counts.permitsClosed / counts.permitsTotal) * 100)
    : 0;

  // Weighted: construction 40 · field punch 25 · closeout checklist 20 · permits 15
  const overallPct = Math.round(
    constructionPct * 0.4 +
    punchPct * 0.25 +
    closeoutPct * 0.2 +
    permitPct * 0.15,
  );

  const openFieldItems = counts.punchOpen + counts.trackerOpen;
  const openCityItems = Math.max(0, counts.permitsTotal - counts.permitsClosed);

  let headline: string;
  let subline: string;
  if (isConstructionComplete && openCityItems > 0) {
    headline = 'Construction complete — City conveyance in progress';
    subline = invoice
      ? `Final Invoice #${invoice.payAppNo ?? '—'} · $${invoice.currentPaymentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} still due · ${openCityItems} permit(s) open with the City`
      : `${openCityItems} permit(s) still open with the City`;
  } else if (isConstructionComplete && openCityItems === 0 && closeoutPct >= 100) {
    headline = 'Project closed out';
    subline = 'Construction, punch, permits, and checklist are all complete.';
  } else if (isConstructionComplete) {
    headline = 'Construction complete — finishing closeout paperwork';
    subline = `${closeoutPct}% checklist · ${openFieldItems} field item(s) still open`;
  } else {
    headline = 'Construction in progress';
    subline = `${constructionPct}% of contract completed to date`;
  }

  return {
    constructionPct,
    constructionLabel: isFinal
      ? `Final invoice · ${constructionPct}% of contract billed`
      : `${constructionPct}% of contract completed`,
    punchPct,
    closeoutPct,
    permitPct,
    overallPct,
    isConstructionComplete,
    remainingDue: invoice?.currentPaymentDue ?? 0,
    openFieldItems,
    openCityItems,
    headline,
    subline,
  };
}
