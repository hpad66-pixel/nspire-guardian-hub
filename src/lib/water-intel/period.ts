import { addMonths, billSpend, monthKey, n } from './analytics';
import type { WaterBill, WaterServiceAccount } from './types';

export type WaterPeriodPreset = 'all' | 't12' | 'ytd' | 'previous_year' | 'custom';

export interface WaterPeriodSelection {
  preset: WaterPeriodPreset;
  start: string | null;
  end: string | null;
}

export interface WaterPeriodSummary {
  firstDate: string | null;
  lastDate: string | null;
  billCount: number;
  accountCount: number;
  spend: number;
  gallons: number;
}

export type WaterDataGapKind = 'missing_cycle' | 'missing_source' | 'estimated_read' | 'meter_profile' | 'next_cycle';

export interface WaterDataGap {
  id: string;
  kind: WaterDataGapKind;
  priority: 'now' | 'next' | 'improve';
  title: string;
  detail: string;
  action: string;
  accountId?: string;
  month?: string;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function endOfUtcYear(year: number) {
  return `${year}-12-31`;
}

export function resolveWaterPeriod(
  bills: WaterBill[],
  preset: WaterPeriodPreset,
  customStart?: string | null,
  customEnd?: string | null,
  now = new Date(),
): WaterPeriodSelection {
  const sorted = bills.map((bill) => bill.bill_period_start).filter(Boolean).sort();
  const latest = sorted.at(-1) ?? isoDate(now);
  const latestDate = new Date(`${latest}T00:00:00Z`);
  const year = latestDate.getUTCFullYear();

  if (preset === 'all') return { preset, start: sorted[0] ?? null, end: sorted.at(-1) ?? null };
  if (preset === 't12') return { preset, start: isoDate(addMonths(latestDate, -11)), end: latest };
  if (preset === 'ytd') return { preset, start: `${year}-01-01`, end: latest };
  if (preset === 'previous_year') return { preset, start: `${year - 1}-01-01`, end: endOfUtcYear(year - 1) };
  return { preset, start: customStart || null, end: customEnd || null };
}

export function filterWaterBills(bills: WaterBill[], selection: WaterPeriodSelection) {
  if (!selection.start && !selection.end) return bills;
  return bills.filter((bill) => {
    const start = bill.bill_period_start;
    return (!selection.start || start >= selection.start) && (!selection.end || start <= selection.end);
  });
}

export function summarizeWaterPeriod(bills: WaterBill[]): WaterPeriodSummary {
  const dates = bills.map((bill) => bill.bill_period_start).filter(Boolean).sort();
  return {
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    billCount: bills.length,
    accountCount: new Set(bills.map((bill) => bill.account_id)).size,
    spend: bills.reduce((sum, bill) => sum + billSpend(bill), 0),
    gallons: bills.reduce((sum, bill) => sum + n(bill.consumption_gallons), 0),
  };
}

function shiftMonth(key: string, amount: number) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const next = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthName(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function monthsBetween(first: string, last: string) {
  const result: string[] = [];
  let cursor = first;
  while (cursor <= last && result.length < 240) {
    result.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return result;
}

export function findWaterDataGaps(accounts: WaterServiceAccount[], bills: WaterBill[]): WaterDataGap[] {
  const active = accounts.filter((account) => !['closed', 'inactive'].includes(account.status));
  const months = bills.map((bill) => monthKey(bill.bill_period_start)).filter(Boolean).sort();
  const latestMonth = months.at(-1) ?? null;
  const gaps: WaterDataGap[] = [];

  if (!latestMonth) {
    gaps.push({
      id: 'first-cycle', kind: 'missing_cycle', priority: 'now',
      title: 'Upload the first billing cycle',
      detail: 'No utility statements are stored for this property yet.',
      action: 'Upload the latest PDF statement for every active water account.',
    });
  } else {
    for (const account of active) {
      const accountMonths = bills
        .filter((bill) => bill.account_id === account.id)
        .map((bill) => monthKey(bill.bill_period_start))
        .filter(Boolean)
        .sort();
      if (accountMonths.length) {
        const present = new Set(accountMonths);
        for (const missingMonth of monthsBetween(accountMonths[0], latestMonth).filter((month) => !present.has(month) && month !== latestMonth)) {
          gaps.push({
            id: `history:${account.id}:${missingMonth}`, kind: 'missing_cycle', priority: 'improve', accountId: account.id, month: missingMonth,
            title: `${account.building_label || account.service_address} has a historical gap for ${monthName(missingMonth)}`,
            detail: 'A monthly cycle is absent between this account’s first record and the latest property cycle.',
            action: 'Upload the original statement if available, or have an administrator document why the cycle does not exist.',
          });
        }
      }
      const latestBill = bills.find((bill) => bill.account_id === account.id && monthKey(bill.bill_period_start) === latestMonth);
      const label = account.building_label || account.service_address;
      if (!latestBill) {
        gaps.push({
          id: `cycle:${account.id}:${latestMonth}`, kind: 'missing_cycle', priority: 'now', accountId: account.id, month: latestMonth,
          title: `${label} is missing ${monthName(latestMonth)}`,
          detail: `The property's latest recorded cycle is ${monthName(latestMonth)}, but this service account has no bill for it.`,
          action: 'Upload the utility statement for this account and cycle.',
        });
      }
    }

    const nextMonth = shiftMonth(latestMonth, 1);
    gaps.push({
      id: `next:${nextMonth}`, kind: 'next_cycle', priority: 'next', month: nextMonth,
      title: `${monthName(nextMonth)} is the next expected cycle`,
      detail: `${active.length} active service account${active.length === 1 ? '' : 's'} should be represented.`,
      action: 'Upload the new statements together when they arrive; Proj OS will auto-match filenames and account numbers.',
    });
  }

  for (const bill of bills) {
    const account = accounts.find((row) => row.id === bill.account_id);
    const label = account?.building_label || account?.service_address || 'Service account';
    const month = monthKey(bill.bill_period_start);
    if (!bill.document_url) {
      gaps.push({
        id: `source:${bill.id}`, kind: 'missing_source', priority: 'improve', accountId: bill.account_id, month,
        title: `${label} lacks a source statement for ${monthName(month)}`,
        detail: 'The ledger row exists, but no PDF or image is attached for audit support.',
        action: 'Upload the original utility statement; do not recreate or manually alter the bill.',
      });
    }
    if (bill.is_estimated) {
      gaps.push({
        id: `estimated:${bill.id}`, kind: 'estimated_read', priority: 'improve', accountId: bill.account_id, month,
        title: `${label} has an estimated read for ${monthName(month)}`,
        detail: 'The utility estimated consumption, so this period is excluded from verified performance calculations.',
        action: 'Upload the corrected statement when the utility provides an actual meter read.',
      });
    }
  }

  for (const account of active) {
    const missing = [
      !account.meter_number ? 'meter number' : null,
      !n(account.connected_units) ? 'connected-unit count' : null,
      account.allocation_source !== 'verified' ? 'verified meter mapping' : null,
    ].filter(Boolean);
    if (missing.length) {
      gaps.push({
        id: `profile:${account.id}`, kind: 'meter_profile', priority: 'improve', accountId: account.id,
        title: `${account.building_label || account.service_address} needs profile verification`,
        detail: `Missing ${missing.join(', ')}.`,
        action: 'An administrator must verify the meter profile; property managers cannot change these analytical inputs.',
      });
    }
  }

  const order = { now: 0, next: 1, improve: 2 };
  return gaps.sort((a, b) => order[a.priority] - order[b.priority] || a.title.localeCompare(b.title));
}
