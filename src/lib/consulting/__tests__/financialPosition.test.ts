import { describe, expect, it } from 'vitest';
import {
  coerceFinancialPosition,
  consultingReconciliationChecks,
  netProfitMargin,
} from '../financialPosition';

const position = {
  project_id: 'project-1', tenant_id: 'tenant-1',
  approved_revenue: 70000, invoiced_revenue: 70000, cash_received: 70000,
  total_costs: 15000, cash_paid: 15000, unbilled_revenue: 0, open_ar: 0, open_ap: 0,
  overbilled_revenue: 0, client_credit: 0, projected_net_profit: 55000,
  net_profit: 55000, margin_pct: 78.5714, draft_invoice_count: 0,
  draft_cost_count: 0, is_reconciled: true,
};

describe('consulting financial position', () => {
  it('coerces Postgres numeric strings', () => {
    const result = coerceFinancialPosition({ ...position, cash_received: '70000.00', is_reconciled: true });
    expect(result.cash_received).toBe(70000);
  });

  it('computes cash-basis net profit margin', () => {
    expect(netProfitMargin(55000, 70000)).toBe(78.57);
    expect(netProfitMargin(0, 0)).toBe(0);
  });

  it('marks a fully settled project ready to reconcile', () => {
    expect(consultingReconciliationChecks(position, 'project-1').every((item) => item.complete)).toBe(true);
  });

  it('surfaces unbilled revenue, A/R, A/P, and drafts as blockers', () => {
    const checks = consultingReconciliationChecks({
      ...position,
      unbilled_revenue: 10000,
      open_ar: 5000,
      open_ap: 2500,
      draft_invoice_count: 1,
      is_reconciled: false,
    }, 'project-1');
    expect(checks.map((item) => item.complete)).toEqual([false, false, false, false]);
    expect(checks[0].href).toContain('client-invoices');
  });
});
