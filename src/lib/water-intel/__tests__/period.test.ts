import { describe, expect, it } from 'vitest';
import { filterWaterBills, findWaterDataGaps, resolveWaterPeriod, summarizeWaterPeriod } from '../period';
import type { WaterBill, WaterServiceAccount } from '../types';

function bill(id: string, accountId: string, month: string, overrides: Partial<WaterBill> = {}): WaterBill {
  return {
    id, tenant_id: 't', property_id: 'p', account_id: accountId,
    bill_period_start: `${month}-01`, bill_period_end: `${month}-28`, billing_date: null, due_date: null,
    previous_balance: 0, current_charges: 100, amount_due: 100, amount_paid: 0,
    water_charges: 40, sewer_charges: 60, other_fees: 0, consumption_gallons: 1_000,
    prior_reading: null, current_reading: null, days_of_service: 28, is_estimated: false, is_duplicate: false,
    status: 'paid', document_url: 'p.pdf', document_name: 'p.pdf', source: 'upload', raw_extract: {}, notes: null,
    created_by: null, created_at: `${month}-01`, updated_at: `${month}-01`, ...overrides,
  };
}

function account(id: string, overrides: Partial<WaterServiceAccount> = {}): WaterServiceAccount {
  return {
    id, tenant_id: 't', property_id: 'p', account_number: id, meter_number: `M-${id}`,
    service_address: `${id} Main St`, building_label: `Building ${id}`, folio_number: null,
    provider_name: 'WASD', status: 'active', notes: null, sort_order: 0,
    connected_units: 10, occupied_units: 9, resident_count: 18, occupancy_as_of: '2026-08-01',
    meter_scope: 'mixed', allocation_source: 'verified', allocation_notes: null,
    created_at: '2026-01-01', updated_at: '2026-01-01', ...overrides,
  };
}

describe('water period filtering', () => {
  const bills = [bill('1', 'a', '2025-08'), bill('2', 'a', '2026-01'), bill('3', 'b', '2026-08')];

  it('keeps the full inception range', () => {
    const selection = resolveWaterPeriod(bills, 'all');
    expect(selection).toMatchObject({ start: '2025-08-01', end: '2026-08-01' });
    expect(filterWaterBills(bills, selection)).toHaveLength(3);
  });

  it('supports inclusive custom dates and selected totals', () => {
    const selection = resolveWaterPeriod(bills, 'custom', '2026-01-01', '2026-08-01');
    const filtered = filterWaterBills(bills, selection);
    expect(filtered.map((row) => row.id)).toEqual(['2', '3']);
    expect(summarizeWaterPeriod(filtered)).toMatchObject({ billCount: 2, accountCount: 2, spend: 200, gallons: 2_000 });
  });
});

describe('water data readiness', () => {
  it('identifies the latest missing account and protects analytical profile edits', () => {
    const gaps = findWaterDataGaps([account('a'), account('b', { meter_number: null, allocation_source: 'unmapped' })], [bill('1', 'a', '2026-08')]);
    expect(gaps.some((gap) => gap.id === 'cycle:b:2026-08' && gap.priority === 'now')).toBe(true);
    expect(gaps.some((gap) => gap.id === 'profile:b' && gap.action.includes('administrator'))).toBe(true);
    expect(gaps.some((gap) => gap.kind === 'next_cycle' && gap.month === '2026-09')).toBe(true);
  });
});
