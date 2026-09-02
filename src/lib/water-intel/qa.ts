import { monthKey, n, yearOverYear } from './analytics';
import {
  BUILDING_8_AMOUNT_DUE,
  GLORIETA_WASD_JUNE_2026,
} from './glorietaArchive';
import type { WaterBill, WaterServiceAccount } from './types';

export type WaterQaSeverity = 'pass' | 'fail' | 'info';

export interface WaterQaCheck {
  id: string;
  label: string;
  detail: string;
  status: WaterQaSeverity;
}

export interface WaterQaReport {
  ok: boolean;
  checks: WaterQaCheck[];
  ocrMatched: number;
  ocrExpected: number;
  years: number[];
  latestPeriod: string | null;
}

function cents(v: unknown) {
  return Math.round(n(v) * 100);
}

function findBill(bills: WaterBill[], accountNumber: string, periodStart: string, accounts: WaterServiceAccount[]) {
  const ids = new Set(accounts.filter((a) => a.account_number === accountNumber).map((a) => a.id));
  return bills.find((b) => ids.has(b.account_id) && b.bill_period_start === periodStart) ?? null;
}

export function auditWaterIntel(
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
): WaterQaReport {
  const accountNumbers = new Set(accounts.map((a) => a.account_number));
  const years = yearOverYear(bills).map((y) => y.year);
  const latestPeriod = bills.reduce<string | null>((acc, b) => {
    const start = b.bill_period_start;
    if (!start) return acc;
    return !acc || start > acc ? start : acc;
  }, null);

  let ocrMatched = 0;
  const missing: string[] = [];
  const mismatches: string[] = [];
  for (const stmt of GLORIETA_WASD_JUNE_2026) {
    const bill = findBill(bills, stmt.accountNumber, stmt.periodStart, accounts);
    if (!bill) {
      missing.push(`${stmt.buildingLabel} (${stmt.accountNumber})`);
      continue;
    }
    const amountOk = cents(bill.amount_due) === cents(stmt.amountDue);
    const gallonsOk = n(bill.consumption_gallons) === stmt.gallons;
    const chargesOk = cents(bill.current_charges) === cents(stmt.currentCharges);
    if (amountOk && gallonsOk && chargesOk) {
      ocrMatched += 1;
    } else {
      mismatches.push(
        `${stmt.accountNumber}: due ${bill.amount_due} vs ${stmt.amountDue}, gal ${bill.consumption_gallons} vs ${stmt.gallons}`,
      );
    }
  }

  const b8 = findBill(bills, '2745714336', '2026-06-01', accounts);
  const b8Ok = cents(b8?.amount_due) === cents(BUILDING_8_AMOUNT_DUE);
  const historyOk = [2022, 2023, 2024, 2025, 2026].every((y) => years.includes(y));
  const latestOk = Boolean(latestPeriod && monthKey(latestPeriod) >= '2026-06');
  const rosterOk = GLORIETA_WASD_JUNE_2026.every((s) => accountNumbers.has(s.accountNumber));
  const ocrOk = ocrMatched === GLORIETA_WASD_JUNE_2026.length && mismatches.length === 0 && missing.length === 0;

  const checks: WaterQaCheck[] = [
    {
      id: 'roster',
      label: '10 WASD service accounts on the property',
      detail: rosterOk
        ? `${accounts.length} meters wired, including every June 2026 account.`
        : `Missing accounts: ${GLORIETA_WASD_JUNE_2026.filter((s) => !accountNumbers.has(s.accountNumber)).map((s) => s.accountNumber).join(', ') || 'unknown'}.`,
      status: rosterOk ? 'pass' : 'fail',
    },
    {
      id: 'ocr-cycle',
      label: 'June/July 2026 WASD cycle — 10/10 statements',
      detail: ocrOk
        ? 'Every OCR’d statement matches amount due, current charges, and gallons.'
        : [missing.length ? `Missing: ${missing.join('; ')}.` : '', mismatches.length ? `Mismatch: ${mismatches.join('; ')}.` : '']
            .filter(Boolean)
            .join(' ') || `${ocrMatched}/${GLORIETA_WASD_JUNE_2026.length} matched.`,
      status: ocrOk ? 'pass' : 'fail',
    },
    {
      id: 'building-8',
      label: 'Building 8 amount due $122,667.65',
      detail: b8Ok
        ? 'Acct 2745714336 / meter 61302354 matches the 13 Jul 2026 statement.'
        : `Building 8 latest due is ${b8 ? `$${n(b8.amount_due).toLocaleString('en-US')}` : 'missing'}.`,
      status: b8Ok ? 'pass' : 'fail',
    },
    {
      id: 'latest',
      label: 'Latest billed period is the Jun 2026 cycle',
      detail: latestOk
        ? `Latest period ${String(latestPeriod).slice(0, 10)}.`
        : `Latest period is ${latestPeriod ?? 'none'} — expected June 2026.`,
      status: latestOk ? 'pass' : 'fail',
    },
    {
      id: 'history',
      label: 'Ledger spans 2022–2026 for trend charts',
      detail: historyOk
        ? `Years on file: ${years.join(', ')}. Months before the Jun 2026 OCR overlay are seeded trend history, not original WASD PDFs.`
        : `Years on file: ${years.join(', ') || 'none'}. Need 2022 through 2026.`,
      status: historyOk ? 'pass' : 'fail',
    },
    {
      id: 'pdf-backup',
      label: 'Statement backup in the repository',
      detail: 'Quick-view HTML for each OCR’d statement lives at /water-bills and in docs/water-intel. Original WASD PDFs were never committed; drop them on the staff desk to replace seed months.',
      status: 'info',
    },
  ];

  return {
    ok: checks.filter((c) => c.status !== 'info').every((c) => c.status === 'pass'),
    checks,
    ocrMatched,
    ocrExpected: GLORIETA_WASD_JUNE_2026.length,
    years,
    latestPeriod,
  };
}
