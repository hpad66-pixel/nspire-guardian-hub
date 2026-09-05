export interface ConsultingFinancialPosition {
  project_id: string;
  tenant_id: string;
  approved_revenue: number;
  invoiced_revenue: number;
  cash_received: number;
  total_costs: number;
  cash_paid: number;
  unbilled_revenue: number;
  open_ar: number;
  open_ap: number;
  overbilled_revenue: number;
  client_credit: number;
  projected_net_profit: number;
  net_profit: number;
  margin_pct: number;
  draft_invoice_count: number;
  draft_cost_count: number;
  is_reconciled: boolean;
}
export interface ReconciliationCheck {
  key: string;
  label: string;
  detail: string;
  amount?: number;
  complete: boolean;
  href?: string;
}

const money2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function coerceFinancialPosition(row: Record<string, unknown>): ConsultingFinancialPosition {
  const numberKeys = [
    'approved_revenue', 'invoiced_revenue', 'cash_received', 'total_costs', 'cash_paid',
    'unbilled_revenue', 'open_ar', 'open_ap', 'overbilled_revenue', 'client_credit',
    'projected_net_profit', 'net_profit', 'margin_pct', 'draft_invoice_count', 'draft_cost_count',
  ] as const;
  const next = { ...row } as Record<string, unknown>;
  for (const key of numberKeys) next[key] = Number(next[key] ?? 0) || 0;
  next.is_reconciled = Boolean(next.is_reconciled);
  return next as unknown as ConsultingFinancialPosition;
}

export function netProfitMargin(netProfit: number, cashReceived: number): number {
  return cashReceived > 0 ? money2((netProfit / cashReceived) * 100) : 0;
}

export function consultingReconciliationChecks(
  position: ConsultingFinancialPosition,
  projectId: string,
): ReconciliationCheck[] {
  const exact = (value: number) => Math.abs(value) <= 0.01;
  return [
    {
      key: 'revenue',
      label: 'Approved work is fully billed',
      detail: exact(position.unbilled_revenue) && exact(position.overbilled_revenue)
        ? 'Client invoices equal the executed proposal value.'
        : position.unbilled_revenue > 0
          ? 'Create the remaining client invoice before closeout.'
          : 'Invoices exceed executed proposal value; void or correct the excess.',
      amount: position.unbilled_revenue > 0 ? position.unbilled_revenue : position.overbilled_revenue,
      complete: exact(position.unbilled_revenue) && exact(position.overbilled_revenue),
      href: `/projects/${projectId}/financials/client-invoices`,
    },
    {
      key: 'receipts',
      label: 'Client invoices are fully collected',
      detail: exact(position.open_ar) && exact(position.client_credit)
        ? 'Every issued invoice is matched to client cash received.'
        : position.open_ar > 0
          ? 'Record the remaining client payment.'
          : 'Client receipts exceed issued invoices; correct the credit.',
      amount: position.open_ar > 0 ? position.open_ar : position.client_credit,
      complete: exact(position.open_ar) && exact(position.client_credit),
      href: `/projects/${projectId}/financials/payments`,
    },
    {
      key: 'costs',
      label: 'Subcontractors and costs are fully paid',
      detail: exact(position.open_ap)
        ? 'All approved consultant, subcontractor, and project costs are paid.'
        : 'Record the remaining vendor and subcontractor payments.',
      amount: position.open_ap,
      complete: exact(position.open_ap),
      href: `/projects/${projectId}/financials/costs`,
    },
    {
      key: 'drafts',
      label: 'No unfinished financial drafts',
      detail: position.draft_invoice_count + position.draft_cost_count === 0
        ? 'No draft invoices or cost records remain.'
        : `${position.draft_invoice_count} invoice draft(s) and ${position.draft_cost_count} cost draft(s) need attention.`,
      complete: position.draft_invoice_count + position.draft_cost_count === 0,
    },
  ];
}
