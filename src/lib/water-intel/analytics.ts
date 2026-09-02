import type {
  AccountRollup,
  MonthlyPoint,
  WaterBill,
  WaterKpis,
  WaterServiceAccount,
  YearRollup,
} from './types';

export const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function money(v: unknown, digits = 0) {
  return n(v).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function gallons(v: unknown) {
  return `${Math.round(n(v)).toLocaleString('en-US')} gal`;
}

export function pct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

export function monthKey(iso: string) {
  return String(iso || '').slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export function startOfYear(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export function addMonths(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

function parseDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function billSpend(b: WaterBill) {
  const charges = n(b.current_charges);
  if (charges > 0) return charges;
  return n(b.water_charges) + n(b.sewer_charges) + n(b.other_fees);
}

export function buildMonthlySeries(bills: WaterBill[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  for (const b of bills) {
    const key = monthKey(b.bill_period_start);
    if (!key) continue;
    const row =
      map.get(key) ??
      ({
        month: key,
        label: monthLabel(key),
        spend: 0,
        water: 0,
        sewer: 0,
        fees: 0,
        gallons: 0,
        estimatedGallons: 0,
        actualGallons: 0,
        billCount: 0,
      } satisfies MonthlyPoint);
    row.spend += billSpend(b);
    row.water += n(b.water_charges);
    row.sewer += n(b.sewer_charges);
    row.fees += n(b.other_fees);
    row.gallons += n(b.consumption_gallons);
    if (b.is_estimated) row.estimatedGallons += n(b.consumption_gallons);
    else row.actualGallons += n(b.consumption_gallons);
    row.billCount += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function yearOverYear(bills: WaterBill[]): YearRollup[] {
  const map = new Map<number, YearRollup>();
  for (const b of bills) {
    const year = Number(String(b.bill_period_start).slice(0, 4));
    if (!year) continue;
    const row =
      map.get(year) ??
      ({ year, spend: 0, gallons: 0, estimatedSpend: 0 } satisfies YearRollup);
    const spend = billSpend(b);
    row.spend += spend;
    row.gallons += n(b.consumption_gallons);
    if (b.is_estimated) row.estimatedSpend += spend;
    map.set(year, row);
  }
  return [...map.values()].sort((a, b) => a.year - b.year);
}

export function rollupAccounts(
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  asOf = new Date(),
): AccountRollup[] {
  const ytdStart = startOfYear(asOf).toISOString().slice(0, 10);
  const last12 = addMonths(asOf, -12).toISOString().slice(0, 10);
  const prior12 = addMonths(asOf, -24).toISOString().slice(0, 10);
  const asOfKey = asOf.toISOString().slice(0, 10);

  return accounts
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.service_address.localeCompare(b.service_address))
    .map((account) => {
      const mine = bills.filter((b) => b.account_id === account.id);
      let ytdSpend = 0;
      let ytdGallons = 0;
      let last12Spend = 0;
      let last12Gallons = 0;
      let prior12Spend = 0;
      let estimatedSpend = 0;
      let openAmount = 0;
      let latest: WaterBill | null = null;

      for (const b of mine) {
        const start = b.bill_period_start;
        const spend = billSpend(b);
        if (start >= ytdStart && start <= asOfKey) {
          ytdSpend += spend;
          ytdGallons += n(b.consumption_gallons);
        }
        if (start >= last12 && start <= asOfKey) {
          last12Spend += spend;
          last12Gallons += n(b.consumption_gallons);
        }
        if (start >= prior12 && start < last12) prior12Spend += spend;
        if (b.is_estimated) estimatedSpend += spend;
        if (b.status === 'open' || b.status === 'past_due' || b.status === 'disputed') {
          openAmount += n(b.amount_due) || spend;
        }
        if (!latest || b.bill_period_start > latest.bill_period_start) latest = b;
      }

      const spendDeltaPct =
        prior12Spend > 0 ? ((last12Spend - prior12Spend) / prior12Spend) * 100 : last12Spend > 0 ? 100 : null;

      return {
        accountId: account.id,
        accountNumber: account.account_number,
        buildingLabel: account.building_label || account.service_address,
        serviceAddress: account.service_address,
        status: account.status,
        folioNumber: account.folio_number,
        ytdSpend,
        ytdGallons,
        last12Spend,
        last12Gallons,
        prior12Spend,
        spendDeltaPct,
        estimatedSpend,
        latestBill: latest,
        openAmount,
      };
    });
}

export function computeKpis(
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  asOf = new Date(),
): WaterKpis {
  const ytdStart = startOfYear(asOf).toISOString().slice(0, 10);
  const priorYtdStart = startOfYear(new Date(Date.UTC(asOf.getUTCFullYear() - 1, 0, 1)))
    .toISOString()
    .slice(0, 10);
  const priorYtdEnd = new Date(Date.UTC(asOf.getUTCFullYear() - 1, asOf.getUTCMonth(), asOf.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  const last12 = addMonths(asOf, -12).toISOString().slice(0, 10);
  const asOfKey = asOf.toISOString().slice(0, 10);

  let ytdSpend = 0;
  let priorYtdSpend = 0;
  let last12Spend = 0;
  let last12Gallons = 0;
  let openAmount = 0;
  let pastDueAmount = 0;
  let estimatedSpend = 0;
  let disputedSpend = 0;
  let latestPeriod: string | null = null;

  for (const b of bills) {
    const start = b.bill_period_start;
    const spend = billSpend(b);
    if (start >= ytdStart && start <= asOfKey) ytdSpend += spend;
    if (start >= priorYtdStart && start <= priorYtdEnd) priorYtdSpend += spend;
    if (start >= last12 && start <= asOfKey) {
      last12Spend += spend;
      last12Gallons += n(b.consumption_gallons);
    }
    if (b.status === 'open' || b.status === 'past_due' || b.status === 'disputed') {
      openAmount += n(b.amount_due) || spend;
    }
    if (b.status === 'past_due') pastDueAmount += n(b.amount_due) || spend;
    if (b.is_estimated) estimatedSpend += spend;
    if (b.status === 'disputed') disputedSpend += spend;
    if (!latestPeriod || start > latestPeriod) latestPeriod = start;
  }

  return {
    ytdSpend,
    priorYtdSpend,
    ytdDeltaPct: priorYtdSpend > 0 ? ((ytdSpend - priorYtdSpend) / priorYtdSpend) * 100 : ytdSpend > 0 ? 100 : null,
    last12Spend,
    last12Gallons,
    openAmount,
    pastDueAmount,
    estimatedSpend,
    disputedSpend,
    accountCount: accounts.length,
    latestPeriod,
  };
}

export function compactSnapshot(
  propertyName: string,
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  asOf = new Date(),
) {
  const kpis = computeKpis(accounts, bills, asOf);
  const rollups = rollupAccounts(accounts, bills, asOf);
  const years = yearOverYear(bills);
  const monthly = buildMonthlySeries(bills).slice(-18);
  return {
    propertyName,
    asOf: asOf.toISOString().slice(0, 10),
    kpis,
    accounts: rollups.map((r) => ({
      building: r.buildingLabel,
      account: r.accountNumber,
      address: r.serviceAddress,
      status: r.status,
      ytdSpend: Math.round(r.ytdSpend),
      last12Spend: Math.round(r.last12Spend),
      last12Gallons: Math.round(r.last12Gallons),
      deltaPct: r.spendDeltaPct == null ? null : Number(r.spendDeltaPct.toFixed(1)),
      estimatedSpend: Math.round(r.estimatedSpend),
      openAmount: Math.round(r.openAmount),
      notes: accounts.find((a) => a.id === r.accountId)?.notes ?? null,
    })),
    years,
    monthly,
  };
}
