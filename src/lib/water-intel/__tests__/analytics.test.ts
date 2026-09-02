import { describe, expect, it } from 'vitest';
import {
  billSpend,
  buildMonthlySeries,
  compactSnapshot,
  computeKpis,
  money,
  parseMiamiDadeBillText,
  parseRecipients,
  rollupAccounts,
  yearOverYear,
} from '@/lib/water-intel';
import { deriveInsights, localChatAnswer } from '@/lib/water-intel/insights';
import type { WaterBill, WaterServiceAccount } from '@/lib/water-intel/types';

const account = (over: Partial<WaterServiceAccount> = {}): WaterServiceAccount => ({
  id: 'a1',
  tenant_id: 't1',
  property_id: 'p1',
  account_number: '2745714336',
  meter_number: '61302354',
  service_address: '13200 Alexandria Dr',
  building_label: 'Building 8',
  folio_number: '08-2128-007-0210',
  provider_name: 'Miami-Dade',
  status: 'disputed',
  notes: 'Formal dispute',
  sort_order: 10,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...over,
});

const bill = (over: Partial<WaterBill> = {}): WaterBill => ({
  id: 'b1',
  tenant_id: 't1',
  property_id: 'p1',
  account_id: 'a1',
  bill_period_start: '2025-06-01',
  bill_period_end: '2025-06-30',
  billing_date: '2025-07-10',
  due_date: '2025-07-30',
  previous_balance: 0,
  current_charges: 9300,
  amount_due: 0,
  amount_paid: 9300,
  water_charges: 4000,
  sewer_charges: 4900,
  other_fees: 400,
  consumption_gallons: 216000,
  prior_reading: null,
  current_reading: null,
  days_of_service: 30,
  is_estimated: true,
  is_duplicate: false,
  status: 'disputed',
  document_url: null,
  document_name: null,
  source: 'seed',
  raw_extract: {},
  notes: null,
  created_by: null,
  created_at: '2025-07-10',
  updated_at: '2025-07-10',
  ...over,
});

describe('water intel analytics', () => {
  it('formats money and prefers current_charges for spend', () => {
    expect(money(1234)).toBe('$1,234');
    expect(billSpend(bill())).toBe(9300);
    expect(billSpend(bill({ current_charges: 0, water_charges: 10, sewer_charges: 5, other_fees: 1 }))).toBe(16);
  });

  it('rolls monthly series and YoY', () => {
    const bills = [
      bill({ id: '1', bill_period_start: '2025-01-01', current_charges: 100 }),
      bill({ id: '2', bill_period_start: '2025-01-15', current_charges: 50, consumption_gallons: 1000, is_estimated: false }),
      bill({ id: '3', bill_period_start: '2024-01-01', current_charges: 80 }),
    ];
    const monthly = buildMonthlySeries(bills);
    expect(monthly.find((m) => m.month === '2025-01')?.spend).toBe(150);
    expect(yearOverYear(bills).find((y) => y.year === 2025)?.spend).toBe(150);
  });

  it('computes KPIs and account rollups for the whole property', () => {
    const accounts = [
      account(),
      account({ id: 'a2', account_number: '1674911185', building_label: 'Building 3', status: 'active', sort_order: 20 }),
    ];
    const bills = [
      bill({ bill_period_start: '2026-03-01', current_charges: 200, amount_due: 200, status: 'past_due', is_estimated: false, consumption_gallons: 4000 }),
      bill({ id: 'b2', account_id: 'a2', bill_period_start: '2026-03-01', current_charges: 80, amount_due: 0, status: 'paid', is_estimated: false, consumption_gallons: 2000 }),
      bill({ id: 'b3', bill_period_start: '2025-03-01', current_charges: 100, is_estimated: true }),
    ];
    const asOf = new Date('2026-09-01T00:00:00Z');
    const kpis = computeKpis(accounts, bills, asOf);
    expect(kpis.accountCount).toBe(2);
    expect(kpis.ytdSpend).toBe(280);
    expect(kpis.pastDueAmount).toBe(200);
    const rollups = rollupAccounts(accounts, bills, asOf);
    expect(rollups).toHaveLength(2);
    expect(rollups[0].buildingLabel).toBe('Building 8');
    expect(rollups[0].openAmount).toBe(300);
  });

  it('flags the Building 8 dispute as a critical insight', () => {
    const insights = deriveInsights([account()], [bill()], new Date('2026-09-01T00:00:00Z'));
    expect(insights[0]?.id).toBe('dispute-b8');
    expect(insights[0]?.severity).toBe('critical');
  });

  it('parses Miami-Dade bill text and recipient lists', () => {
    const parsed = parseMiamiDadeBillText(
      'Account Number: 2745714336\nService Period: 04/01/2026 to 04/30/2026\nAmount Due: $1,234.56\nConsumption: 12,000 gallons\nESTIMATED',
    );
    expect(parsed.accountNumber).toBe('2745714336');
    expect(parsed.periodStart).toBe('2026-04-01');
    expect(parsed.amountDue).toBe(1234.56);
    expect(parsed.consumptionGallons).toBe(12000);
    expect(parsed.isEstimated).toBe(true);
    expect(parseRecipients('a@x.com; b@y.com, bad')).toEqual(['a@x.com', 'b@y.com']);
  });

  it('builds a compact AI snapshot and answers locally', () => {
    const snap = compactSnapshot('Glorieta Gardens', [account()], [bill()], new Date('2026-09-01T00:00:00Z'));
    expect(snap.propertyName).toBe('Glorieta Gardens');
    expect(snap.accounts[0].account).toBe('2745714336');
    expect(localChatAnswer('what is the building 8 dispute?', snap)).toMatch(/216k/i);
  });
});
