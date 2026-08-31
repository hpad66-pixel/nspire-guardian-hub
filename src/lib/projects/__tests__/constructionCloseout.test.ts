import { describe, expect, it } from 'vitest';
import {
  computeConstructionCloseoutReadiness,
  constructionPctFromInvoice,
  finalInvoiceFromPayApp,
} from '@/lib/projects/constructionCloseout';

const glorietaPa5 = {
  pay_app_no: 5,
  status: 'approved',
  is_final_invoice: true,
  submitted_amount: 144332.82,
  pay_app_data: {
    is_final_invoice: true,
    use_reconciled_snapshot: true,
    contract_sum_to_date: 953350.35,
    completed_stored_to_date: 921212.36,
    cash_received_to_date: 742871.38,
    current_payment_due: 144332.82,
    amount_certified: 144332.82,
    retainage_total: 34008.16,
    balance_to_finish: 32137.99,
  },
};

describe('finalInvoiceFromPayApp', () => {
  it('reads Glorieta Pay App 5 reconciled snapshot', () => {
    const inv = finalInvoiceFromPayApp(glorietaPa5);
    expect(inv?.isFinalInvoice).toBe(true);
    expect(inv?.contractSumToDate).toBe(953350.35);
    expect(inv?.completedStoredToDate).toBe(921212.36);
    expect(inv?.currentPaymentDue).toBe(144332.82);
  });

  it('returns null for empty pay app', () => {
    expect(finalInvoiceFromPayApp(null)).toBeNull();
    expect(finalInvoiceFromPayApp({ pay_app_no: 1, pay_app_data: {} })).toBeNull();
  });
});

describe('constructionPctFromInvoice', () => {
  it('computes ~96.6% for Glorieta final invoice', () => {
    const inv = finalInvoiceFromPayApp(glorietaPa5)!;
    const pct = constructionPctFromInvoice(inv);
    expect(pct).toBeGreaterThanOrEqual(96.5);
    expect(pct).toBeLessThanOrEqual(96.7);
  });
});

describe('computeConstructionCloseoutReadiness', () => {
  it('marks construction complete on final invoice and keeps city items open', () => {
    const readiness = computeConstructionCloseoutReadiness({
      invoice: finalInvoiceFromPayApp(glorietaPa5),
      counts: {
        punchOpen: 0,
        punchTotal: 0,
        trackerOpen: 4, // D7 / J3 / J4 / AL1
        trackerTotal: 28,
        closeoutDone: 5,
        closeoutTotal: 9,
        permitsClosed: 22,
        permitsTotal: 31,
      },
    });
    expect(readiness.isConstructionComplete).toBe(true);
    expect(readiness.openCityItems).toBe(9);
    expect(readiness.openFieldItems).toBe(4);
    expect(readiness.headline).toMatch(/City conveyance/i);
    expect(readiness.remainingDue).toBe(144332.82);
    expect(readiness.overallPct).toBeGreaterThan(70);
  });

  it('shows in-progress when no final invoice and low completion', () => {
    const readiness = computeConstructionCloseoutReadiness({
      invoice: {
        isFinalInvoice: false,
        contractSumToDate: 100,
        completedStoredToDate: 40,
        cashReceivedToDate: 0,
        currentPaymentDue: 40,
        retainageTotal: 0,
        balanceToFinish: 60,
      },
      counts: {
        punchOpen: 5,
        punchTotal: 10,
        trackerOpen: 0,
        trackerTotal: 0,
        closeoutDone: 0,
        closeoutTotal: 0,
        permitsClosed: 0,
        permitsTotal: 0,
      },
    });
    expect(readiness.isConstructionComplete).toBe(false);
    expect(readiness.constructionPct).toBe(40);
    expect(readiness.headline).toMatch(/in progress/i);
  });
});
