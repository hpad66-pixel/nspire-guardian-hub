import { describe, expect, it } from 'vitest';
import {
  billSpend,
  buildMonthlySeries,
  compactSnapshot,
  computeEfficiencyAnalytics,
  computeKpis,
  inferPeriodFromFilename,
  matchServiceAccount,
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
  connected_units: null,
  occupied_units: null,
  resident_count: null,
  occupancy_as_of: null,
  meter_scope: 'mixed',
  allocation_source: 'unmapped',
  allocation_notes: null,
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

  it('normalizes use by units and population and converts avoided gallons to bill-rate dollars', () => {
    const profiled = account({
      connected_units: 10,
      occupied_units: 8,
      resident_count: 20,
      allocation_source: 'verified',
    });
    const bills: WaterBill[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const mm = String(month).padStart(2, '0');
      bills.push(bill({
        id: `base-${mm}`,
        bill_period_start: `2025-${mm}-01`,
        bill_period_end: `2025-${mm}-28`,
        days_of_service: 30,
        consumption_gallons: 10_000,
        current_charges: 1_000,
        water_charges: 600,
        sewer_charges: 400,
        other_fees: 0,
        is_estimated: false,
        source: 'upload',
      }));
      bills.push(bill({
        id: `report-${mm}`,
        bill_period_start: `2026-${mm}-01`,
        bill_period_end: `2026-${mm}-28`,
        days_of_service: 30,
        consumption_gallons: 8_000,
        current_charges: 800,
        water_charges: 480,
        sewer_charges: 320,
        other_fees: 0,
        is_estimated: false,
        source: 'upload',
      }));
    }

    const analytics = computeEfficiencyAnalytics([profiled], bills, { totalUnits: 10, occupiedUnits: 8 });
    expect(analytics.reportingStart).toBe('2026-01-01');
    expect(analytics.reportingEnd).toBe('2026-12-28');
    expect(analytics.readingCoveragePct).toBe(100);
    expect(analytics.sourceDocumentCoveragePct).toBe(100);
    expect(analytics.comparisonCoveragePct).toBe(100);
    expect(analytics.avoidedGallons).toBe(24_000);
    expect(analytics.avoidedCost).toBe(2_400);
    expect(analytics.meters[0].gallonsPerUnitDay).toBeCloseTo(26.667, 2);
    expect(analytics.meters[0].gallonsPerCapitaDay).toBeCloseTo(13.333, 2);
    expect(analytics.meters[0].costPerThousandGallons).toBe(100);
    expect(analytics.status).toBe('verified');
  });

  it('keeps seeded history modeled even when reads and comparisons are complete', () => {
    const profiled = account({
      connected_units: 10,
      occupied_units: 8,
      resident_count: 20,
      allocation_source: 'verified',
    });
    const bills = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0');
      return [
        bill({ id: `prior-${month}`, bill_period_start: `2025-${month}-01`, is_estimated: false }),
        bill({ id: `current-${month}`, bill_period_start: `2026-${month}-01`, is_estimated: false }),
      ];
    }).flat();

    const analytics = computeEfficiencyAnalytics([profiled], bills, { totalUnits: 10, occupiedUnits: 8 });
    expect(analytics.sourceDocumentCoveragePct).toBe(0);
    expect(analytics.status).toBe('modeled');
  });

  it('excludes estimated reads from performance and marks incomplete evidence', () => {
    const analytics = computeEfficiencyAnalytics(
      [account({ connected_units: 10, occupied_units: 5, allocation_source: 'unit_roster' })],
      [bill({ is_estimated: true, bill_period_start: '2026-06-01' })],
      { totalUnits: 10, occupiedUnits: 5 },
    );
    expect(analytics.actualGallons).toBe(0);
    expect(analytics.avoidedCost).toBeNull();
    expect(analytics.status).toBe('insufficient');
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

  it('parses a real WASD June 2026 statement including KGW', () => {
    const parsed = parseMiamiDadeBillText(`
Name: GLORETTA APARTMENTS LTD Account Number: 2745714336 Billing Date: 07/13/2026 Past Due Date: 08/03/2026
Account Summary Previous Balance $ 113,874.41 Current Charges 8,793.24 Total Account Balance $ 122,667.65
From To Number Service Reading Reading in GAL 06/01/26 06/29/26 61302354 28 5994 6417 423
Service Address: 13010 ALEXANDRIA DR
Water Charges Subtotal 3,426.54 $ 3,426.54
Sewer Charges Subtotal $ 4,868.97
Consumption KGW (Thousands gallons water)
    `);
    expect(parsed.accountNumber).toBe('2745714336');
    expect(parsed.meterNumber).toBe('61302354');
    expect(parsed.periodStart).toBe('2026-06-01');
    expect(parsed.periodEnd).toBe('2026-06-29');
    expect(parsed.currentCharges).toBe(8793.24);
    expect(parsed.amountDue).toBe(122667.65);
    expect(parsed.previousBalance).toBe(113874.41);
    expect(parsed.consumptionGallons).toBe(423000);
    expect(parsed.waterCharges).toBe(3426.54);
    expect(parsed.sewerCharges).toBe(4868.97);
  });

  it('infers Glorieta filename periods and matches accounts without falling back to Building 8', () => {
    expect(inferPeriodFromFilename('BILL 05-2024 TO 06-2024 13235 ALEXANDRIA DR.pdf')).toEqual({
      start: '2024-05-01',
      end: '2024-06-30',
    });
    expect(inferPeriodFromFilename('BILL 06-2026 13180 PORT SAID RD.pdf')).toEqual({
      start: '2026-06-01',
      end: '2026-06-30',
    });
    const roster = [
      account(),
      account({ id: 'a2', account_number: '1674911185', service_address: '13235 Alexandria Dr', building_label: 'Building 3' }),
      account({ id: 'a3', account_number: '8082997418', service_address: '13210 Alexandria Dr', building_label: '13210' }),
      account({ id: 'a4', account_number: '2218802663', service_address: '13210 Alexandria Dr', building_label: 'idle meter' }),
    ];
    expect(matchServiceAccount(roster, { filename: 'BILL 06-2026 13235 ALEXANDRIA DR.pdf' })?.id).toBe('a2');
    expect(matchServiceAccount(roster, { filename: 'BILL 06-2026 ACCOUNT 8082997418.pdf' })?.id).toBe('a3');
    expect(matchServiceAccount(roster, { filename: '2026.07.13_Account 2663.pdf' })?.id).toBe('a4');
    expect(matchServiceAccount(roster, { filename: 'unrelated.pdf' })).toBeNull();
  });

  it('builds a compact AI snapshot and answers locally', () => {
    const snap = compactSnapshot('Glorieta Gardens', [account()], [bill()], new Date('2026-09-01T00:00:00Z'));
    expect(snap.propertyName).toBe('Glorieta Gardens');
    expect(snap.accounts[0].account).toBe('2745714336');
    expect(localChatAnswer('what is the building 8 dispute?', snap)).toMatch(/216k/i);
  });
});
