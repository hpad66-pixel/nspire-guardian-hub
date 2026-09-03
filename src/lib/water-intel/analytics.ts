import type {
  AccountRollup,
  MeterWaterPerformance,
  MonthlyPoint,
  MonthlyWaterPerformance,
  WaterBill,
  WaterEfficiencyAnalytics,
  WaterKpis,
  WaterServiceAccount,
  WaterUnitSummary,
  YearRollup,
} from './types';

export const EPA_MULTIFAMILY_MEDIAN_GALLONS_PER_UNIT_YEAR = 43_600;
export const EPA_AVERAGE_INDOOR_GPCD = 58.6;
export const WATERSENSE_EFFICIENT_HOME_GPCD = 36.7;
export const MODELED_RESIDENTS_PER_OCCUPIED_UNIT = 2;

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

function shiftMonthKey(key: string, months: number) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return '';
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthKeysEndingAt(endKey: string, count: number) {
  return Array.from({ length: count }, (_, index) => shiftMonthKey(endKey, index - count + 1));
}

function daysBetweenInclusive(start: string, end: string) {
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last || last < first) return 0;
  return Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
}

export function billServiceDays(bill: WaterBill) {
  const stated = n(bill.days_of_service);
  return stated > 0 ? stated : daysBetweenInclusive(bill.bill_period_start, bill.bill_period_end);
}

export function billVariableCharges(bill: WaterBill) {
  const itemized = n(bill.water_charges) + n(bill.sewer_charges);
  return itemized > 0 ? itemized : billSpend(bill);
}

function residentDenominator(account: WaterServiceAccount) {
  const verified = n(account.resident_count);
  if (verified > 0) return { count: verified, modeled: false };
  const occupied = n(account.occupied_units);
  if (occupied > 0) {
    return { count: occupied * MODELED_RESIDENTS_PER_OCCUPIED_UNIT, modeled: true };
  }
  return { count: null, modeled: false };
}

function performanceBand(value: number | null, reference: number) {
  if (value == null) return 'unavailable' as const;
  if (value < reference * 0.9) return 'below_reference' as const;
  if (value <= reference * 1.1) return 'near_reference' as const;
  return 'above_reference' as const;
}

function ratioPct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.min(100, (numerator / denominator) * 100) : 0;
}

/**
 * Meter-normalized performance using the latest complete statement month.
 *
 * Billing exposure keeps every bill elsewhere in the module. Performance and
 * savings deliberately exclude duplicate and estimated reads. Avoided gallons
 * compare each actual bill to the same meter/month one year earlier, adjusted
 * for service days. Avoided cost uses the reporting-period water + sewer rate,
 * so rate changes are not mislabeled as operational savings.
 */
export function computeEfficiencyAnalytics(
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  units: WaterUnitSummary = { totalUnits: 0, occupiedUnits: 0 },
): WaterEfficiencyAnalytics {
  const eligibleAccounts = accounts.filter((account) => !['closed', 'inactive'].includes(account.status));
  const usable = bills.filter((bill) => !bill.is_duplicate && monthKey(bill.bill_period_start));
  const actual = usable.filter((bill) => !bill.is_estimated);
  const latestMonth = actual.map((bill) => monthKey(bill.bill_period_start)).sort().at(-1) ?? null;
  const epaUnitDay = EPA_MULTIFAMILY_MEDIAN_GALLONS_PER_UNIT_YEAR / 365;

  if (!latestMonth) {
    return {
      reportingStart: null,
      reportingEnd: null,
      baselineStart: null,
      baselineEnd: null,
      totalUnits: units.totalUnits,
      occupiedUnits: units.occupiedUnits,
      modeledResidents: units.occupiedUnits > 0 ? units.occupiedUnits * MODELED_RESIDENTS_PER_OCCUPIED_UNIT : null,
      actualGallons: 0,
      actualSpend: 0,
      variableCharges: 0,
      gallonsPerUnitDay: null,
      gallonsPerCapitaDay: null,
      annualizedCostPerUnit: null,
      costPerThousandGallons: null,
      epaMedianGallonsPerUnitYear: EPA_MULTIFAMILY_MEDIAN_GALLONS_PER_UNIT_YEAR,
      epaMedianGallonsPerUnitDay: epaUnitDay,
      epaAverageIndoorGpcd: EPA_AVERAGE_INDOOR_GPCD,
      waterSenseEfficientGpcd: WATERSENSE_EFFICIENT_HOME_GPCD,
      benchmarkGallons: null,
      benchmarkCost: null,
      benchmarkGapGallons: null,
      benchmarkGapCost: null,
      avoidedGallons: null,
      avoidedCost: null,
      readingCoveragePct: 0,
      sourceDocumentCoveragePct: 0,
      comparisonCoveragePct: 0,
      meterMappingCoveragePct: 0,
      status: 'insufficient',
      meters: [],
      monthly: [],
    };
  }

  const reportingMonths = monthKeysEndingAt(latestMonth, 12);
  const reportingMonthSet = new Set(reportingMonths);
  const baselineMonths = reportingMonths.map((key) => shiftMonthKey(key, -12));
  const reportingStart = `${reportingMonths[0]}-01`;
  const lastMonthBills = actual.filter((bill) => monthKey(bill.bill_period_start) === latestMonth);
  const reportingEnd = lastMonthBills.map((bill) => bill.bill_period_end).sort().at(-1)
    ?? new Date(Date.UTC(Number(latestMonth.slice(0, 4)), Number(latestMonth.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const baselineStart = `${baselineMonths[0]}-01`;
  const baselineEndKey = baselineMonths.at(-1)!;
  const baselineEnd = new Date(Date.UTC(Number(baselineEndKey.slice(0, 4)), Number(baselineEndKey.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const periodDays = daysBetweenInclusive(reportingStart, reportingEnd);

  const reportingAll = usable.filter((bill) => reportingMonthSet.has(monthKey(bill.bill_period_start)));
  const reporting = reportingAll.filter((bill) => !bill.is_estimated);
  const actualByAccountMonth = new Map<string, WaterBill>();
  for (const bill of actual) actualByAccountMonth.set(`${bill.account_id}:${monthKey(bill.bill_period_start)}`, bill);

  const paired = reporting.flatMap((current) => {
    const prior = actualByAccountMonth.get(`${current.account_id}:${shiftMonthKey(monthKey(current.bill_period_start), -12)}`);
    if (!prior) return [];
    const currentDays = billServiceDays(current);
    const priorDays = billServiceDays(prior);
    if (currentDays <= 0 || priorDays <= 0) return [];
    return [{
      current,
      prior,
      expectedGallons: n(prior.consumption_gallons) * (currentDays / priorDays),
    }];
  });

  const expectedGallons = paired.reduce((sum, row) => sum + row.expectedGallons, 0);
  const comparedGallons = paired.reduce((sum, row) => sum + n(row.current.consumption_gallons), 0);
  const pairedVariableCharges = paired.reduce((sum, row) => sum + billVariableCharges(row.current), 0);
  const pairedRate = comparedGallons > 0 ? pairedVariableCharges / comparedGallons : 0;
  const avoidedGallons = paired.length > 0 ? expectedGallons - comparedGallons : null;
  const avoidedCost = avoidedGallons == null ? null : avoidedGallons * pairedRate;

  const totalGallons = reporting.reduce((sum, bill) => sum + n(bill.consumption_gallons), 0);
  const totalSpend = reporting.reduce((sum, bill) => sum + billSpend(bill), 0);
  const variableCharges = reporting.reduce((sum, bill) => sum + billVariableCharges(bill), 0);
  const costPerThousandGallons = totalGallons > 0 ? (variableCharges / totalGallons) * 1_000 : null;
  const modeledResidents = units.occupiedUnits > 0
    ? units.occupiedUnits * MODELED_RESIDENTS_PER_OCCUPIED_UNIT
    : null;
  const gallonsPerUnitDay = units.totalUnits > 0 && periodDays > 0
    ? totalGallons / units.totalUnits / periodDays
    : null;
  const gallonsPerCapitaDay = modeledResidents && periodDays > 0
    ? totalGallons / modeledResidents / periodDays
    : null;
  const annualizedCostPerUnit = units.totalUnits > 0 && periodDays > 0
    ? (totalSpend / units.totalUnits) * (365 / periodDays)
    : null;
  const benchmarkGallons = units.totalUnits > 0 && periodDays > 0
    ? EPA_MULTIFAMILY_MEDIAN_GALLONS_PER_UNIT_YEAR * units.totalUnits * (periodDays / 365)
    : null;
  const benchmarkRate = totalGallons > 0 ? variableCharges / totalGallons : 0;
  const benchmarkCost = benchmarkGallons == null ? null : benchmarkGallons * benchmarkRate;
  const benchmarkGapGallons = benchmarkGallons == null ? null : totalGallons - benchmarkGallons;
  const benchmarkGapCost = benchmarkGapGallons == null ? null : benchmarkGapGallons * benchmarkRate;

  const expectedBillCount = eligibleAccounts.length * reportingMonths.length;
  const readingCoveragePct = ratioPct(reporting.length, expectedBillCount);
  const sourceDocumentCoveragePct = ratioPct(
    paired.filter(({ current, prior }) =>
      ['upload', 'ocr', 'api'].includes(current.source)
      && ['upload', 'ocr', 'api'].includes(prior.source),
    ).length,
    expectedBillCount,
  );
  const comparisonCoveragePct = ratioPct(paired.length, expectedBillCount);
  const mappedUnits = accounts.reduce((sum, account) => sum + Math.max(0, n(account.connected_units)), 0);
  const meterMappingCoveragePct = ratioPct(mappedUnits, units.totalUnits);

  const meterRows: MeterWaterPerformance[] = accounts.map((account) => {
    const meterBills = reporting.filter((bill) => bill.account_id === account.id);
    const meterPairs = paired.filter((row) => row.current.account_id === account.id);
    const meterGallons = meterBills.reduce((sum, bill) => sum + n(bill.consumption_gallons), 0);
    const meterSpend = meterBills.reduce((sum, bill) => sum + billSpend(bill), 0);
    const meterVariableCharges = meterBills.reduce((sum, bill) => sum + billVariableCharges(bill), 0);
    const reportingDays = meterBills.reduce((sum, bill) => sum + billServiceDays(bill), 0);
    const connectedUnits = account.connected_units == null ? null : n(account.connected_units);
    const occupiedUnits = account.occupied_units == null ? null : n(account.occupied_units);
    const residents = residentDenominator(account);
    const gpud = connectedUnits && reportingDays > 0
      ? meterGallons / connectedUnits / reportingDays
      : null;
    const gpcd = residents.count && reportingDays > 0
      ? meterGallons / residents.count / reportingDays
      : null;
    const annualCost = connectedUnits && reportingDays > 0
      ? (meterSpend / connectedUnits) * (365 / reportingDays)
      : null;
    const meterExpected = meterPairs.reduce((sum, row) => sum + row.expectedGallons, 0);
    const meterCompared = meterPairs.reduce((sum, row) => sum + n(row.current.consumption_gallons), 0);
    const meterRate = meterCompared > 0
      ? meterPairs.reduce((sum, row) => sum + billVariableCharges(row.current), 0) / meterCompared
      : 0;
    const meterAvoidedGallons = meterPairs.length > 0 ? meterExpected - meterCompared : null;

    return {
      accountId: account.id,
      accountNumber: account.account_number,
      meterNumber: account.meter_number,
      buildingLabel: account.building_label || account.service_address,
      serviceAddress: account.service_address,
      meterScope: account.meter_scope || 'mixed',
      allocationSource: account.allocation_source || 'unmapped',
      allocationNotes: account.allocation_notes,
      occupancyAsOf: account.occupancy_as_of,
      connectedUnits,
      occupiedUnits,
      residentCount: residents.count,
      residentCountIsModeled: residents.modeled,
      reportingBillCount: meterBills.length,
      reportingDays,
      readingCoveragePct: ratioPct(meterBills.length, reportingMonths.length),
      actualGallons: meterGallons,
      actualSpend: meterSpend,
      variableCharges: meterVariableCharges,
      gallonsPerUnitDay: gpud,
      gallonsPerCapitaDay: gpcd,
      annualizedCostPerUnit: annualCost,
      costPerThousandGallons: meterGallons > 0 ? (meterVariableCharges / meterGallons) * 1_000 : null,
      baselineGallons: meterExpected,
      comparedGallons: meterCompared,
      avoidedGallons: meterAvoidedGallons,
      avoidedCost: meterAvoidedGallons == null ? null : meterAvoidedGallons * meterRate,
      comparisonCoveragePct: ratioPct(meterPairs.length, reportingMonths.length),
      benchmarkVariancePct: gpud == null ? null : ((gpud - epaUnitDay) / epaUnitDay) * 100,
      performanceBand: performanceBand(gpud, epaUnitDay),
    };
  });

  const monthly: MonthlyWaterPerformance[] = reportingMonths.map((key) => {
    const current = reporting.filter((bill) => monthKey(bill.bill_period_start) === key);
    const monthPairs = paired.filter((row) => monthKey(row.current.bill_period_start) === key);
    const allMonthGallons = current.reduce((sum, bill) => sum + n(bill.consumption_gallons), 0);
    const monthExpected = monthPairs.reduce((sum, row) => sum + row.expectedGallons, 0);
    const monthCompared = monthPairs.reduce((sum, row) => sum + n(row.current.consumption_gallons), 0);
    const monthRate = monthCompared > 0
      ? monthPairs.reduce((sum, row) => sum + billVariableCharges(row.current), 0) / monthCompared
      : 0;
    const monthAvoided = monthPairs.length > 0 ? monthExpected - monthCompared : null;
    return {
      month: key,
      label: monthLabel(key),
      // Keep the chart comparison apples-to-apples whenever a matched baseline
      // exists. Months without pairs still show their full ledger consumption.
      actualGallons: monthPairs.length > 0 ? monthCompared : allMonthGallons,
      baselineGallons: monthPairs.length > 0 ? monthExpected : null,
      avoidedGallons: monthAvoided,
      avoidedCost: monthAvoided == null ? null : monthAvoided * monthRate,
    };
  });

  const allProfilesVerified = eligibleAccounts.length > 0 && eligibleAccounts.every((account) =>
    account.allocation_source === 'verified' && n(account.resident_count) > 0,
  );
  const status = readingCoveragePct < 50 || comparisonCoveragePct < 50
    ? 'insufficient'
    : allProfilesVerified
      && readingCoveragePct >= 90
      && sourceDocumentCoveragePct >= 90
      && comparisonCoveragePct >= 90
      ? 'verified'
      : 'modeled';

  return {
    reportingStart,
    reportingEnd,
    baselineStart,
    baselineEnd,
    totalUnits: units.totalUnits,
    occupiedUnits: units.occupiedUnits,
    modeledResidents,
    actualGallons: totalGallons,
    actualSpend: totalSpend,
    variableCharges,
    gallonsPerUnitDay,
    gallonsPerCapitaDay,
    annualizedCostPerUnit,
    costPerThousandGallons,
    epaMedianGallonsPerUnitYear: EPA_MULTIFAMILY_MEDIAN_GALLONS_PER_UNIT_YEAR,
    epaMedianGallonsPerUnitDay: epaUnitDay,
    epaAverageIndoorGpcd: EPA_AVERAGE_INDOOR_GPCD,
    waterSenseEfficientGpcd: WATERSENSE_EFFICIENT_HOME_GPCD,
    benchmarkGallons,
    benchmarkCost,
    benchmarkGapGallons,
    benchmarkGapCost,
    avoidedGallons,
    avoidedCost,
    readingCoveragePct,
    sourceDocumentCoveragePct,
    comparisonCoveragePct,
    meterMappingCoveragePct,
    status,
    meters: meterRows,
    monthly,
  };
}

export function compactSnapshot(
  propertyName: string,
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  asOf = new Date(),
  units: WaterUnitSummary = { totalUnits: 0, occupiedUnits: 0 },
) {
  const kpis = computeKpis(accounts, bills, asOf);
  const rollups = rollupAccounts(accounts, bills, asOf);
  const efficiency = computeEfficiencyAnalytics(accounts, bills, units);
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
      meter: accounts.find((a) => a.id === r.accountId)?.meter_number ?? null,
      connectedUnits: efficiency.meters.find((m) => m.accountId === r.accountId)?.connectedUnits ?? null,
      occupiedUnits: efficiency.meters.find((m) => m.accountId === r.accountId)?.occupiedUnits ?? null,
      gallonsPerUnitDay: efficiency.meters.find((m) => m.accountId === r.accountId)?.gallonsPerUnitDay ?? null,
      gallonsPerCapitaDay: efficiency.meters.find((m) => m.accountId === r.accountId)?.gallonsPerCapitaDay ?? null,
      annualizedCostPerUnit: efficiency.meters.find((m) => m.accountId === r.accountId)?.annualizedCostPerUnit ?? null,
      avoidedCost: efficiency.meters.find((m) => m.accountId === r.accountId)?.avoidedCost ?? null,
      notes: accounts.find((a) => a.id === r.accountId)?.notes ?? null,
    })),
    efficiency: {
      reportingStart: efficiency.reportingStart,
      reportingEnd: efficiency.reportingEnd,
      status: efficiency.status,
      totalUnits: efficiency.totalUnits,
      occupiedUnits: efficiency.occupiedUnits,
      modeledResidents: efficiency.modeledResidents,
      gallonsPerUnitDay: efficiency.gallonsPerUnitDay,
      gallonsPerCapitaDay: efficiency.gallonsPerCapitaDay,
      annualizedCostPerUnit: efficiency.annualizedCostPerUnit,
      costPerThousandGallons: efficiency.costPerThousandGallons,
      avoidedGallons: efficiency.avoidedGallons,
      avoidedCost: efficiency.avoidedCost,
      benchmarkGapGallons: efficiency.benchmarkGapGallons,
      benchmarkGapCost: efficiency.benchmarkGapCost,
      readingCoveragePct: efficiency.readingCoveragePct,
      sourceDocumentCoveragePct: efficiency.sourceDocumentCoveragePct,
      comparisonCoveragePct: efficiency.comparisonCoveragePct,
      meterMappingCoveragePct: efficiency.meterMappingCoveragePct,
    },
    years,
    monthly,
  };
}
