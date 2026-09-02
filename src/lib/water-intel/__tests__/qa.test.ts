import { describe, expect, it } from 'vitest';
import { GLORIETA_WASD_JUNE_2026 } from '@/lib/water-intel/glorietaArchive';
import { auditWaterIntel } from '@/lib/water-intel/qa';
import type { WaterBill, WaterServiceAccount } from '@/lib/water-intel/types';

function account(over: Partial<WaterServiceAccount> & { id: string; account_number: string }): WaterServiceAccount {
  return {
    tenant_id: 't1',
    property_id: 'p1',
    meter_number: null,
    service_address: 'addr',
    building_label: over.account_number,
    folio_number: null,
    provider_name: 'Miami-Dade',
    status: 'active',
    notes: null,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  };
}

function bill(over: Partial<WaterBill> & { id: string; account_id: string }): WaterBill {
  return {
    tenant_id: 't1',
    property_id: 'p1',
    bill_period_start: '2026-06-01',
    bill_period_end: '2026-06-29',
    billing_date: '2026-07-13',
    due_date: '2026-08-03',
    previous_balance: 0,
    current_charges: 0,
    amount_due: 0,
    amount_paid: 0,
    water_charges: 0,
    sewer_charges: 0,
    other_fees: 0,
    consumption_gallons: 0,
    prior_reading: null,
    current_reading: null,
    days_of_service: 28,
    is_estimated: false,
    is_duplicate: false,
    status: 'open',
    document_url: null,
    document_name: null,
    source: 'ocr',
    raw_extract: {},
    notes: null,
    created_by: null,
    created_at: '2026-07-13',
    updated_at: '2026-07-13',
    ...over,
  };
}

function liveSet() {
  const accounts = GLORIETA_WASD_JUNE_2026.map((s, i) =>
    account({
      id: `a${i}`,
      account_number: s.accountNumber,
      meter_number: s.meterNumber,
      service_address: s.serviceAddress,
      building_label: s.buildingLabel,
      status: s.status === 'disputed' ? 'disputed' : 'active',
    }),
  );
  const ocr = GLORIETA_WASD_JUNE_2026.map((s, i) =>
    bill({
      id: `ocr${i}`,
      account_id: `a${i}`,
      bill_period_start: s.periodStart,
      bill_period_end: s.periodEnd,
      current_charges: s.currentCharges,
      amount_due: s.amountDue,
      consumption_gallons: s.gallons,
      source: 'ocr',
      status: s.status,
    }),
  );
  const history = [2022, 2023, 2024, 2025].map((year) =>
    bill({
      id: `h${year}`,
      account_id: 'a0',
      bill_period_start: `${year}-12-01`,
      bill_period_end: `${year}-12-31`,
      current_charges: 100,
      amount_due: 0,
      source: 'seed',
      status: 'paid',
    }),
  );
  return { accounts, bills: [...ocr, ...history] };
}

describe('auditWaterIntel', () => {
  it('passes when the June 2026 OCR archive and 2022–2026 history are wired', () => {
    const { accounts, bills } = liveSet();
    const report = auditWaterIntel(accounts, bills);
    expect(report.ok).toBe(true);
    expect(report.ocrMatched).toBe(10);
    expect(report.checks.find((c) => c.id === 'building-8')?.status).toBe('pass');
    expect(report.checks.find((c) => c.id === 'history')?.status).toBe('pass');
  });

  it('fails when Building 8 amount due is wrong (validation path)', () => {
    const { accounts, bills } = liveSet();
    const b8 = bills.find((b) => b.account_id === 'a0' && b.bill_period_start === '2026-06-01');
    if (b8) b8.amount_due = 1;
    const report = auditWaterIntel(accounts, bills);
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === 'building-8')?.status).toBe('fail');
  });

  it('fails when the roster is missing a WASD account (permission/data path)', () => {
    const { accounts, bills } = liveSet();
    const report = auditWaterIntel(accounts.slice(1), bills);
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === 'roster')?.status).toBe('fail');
  });
});
