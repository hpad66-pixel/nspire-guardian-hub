import {
  billSpend,
  computeEfficiencyAnalytics,
  computeKpis,
  gallons,
  money,
  n,
  pct,
  rollupAccounts,
} from './analytics';
import type { WaterBill, WaterInsight, WaterServiceAccount, WaterUnitSummary } from './types';

export function deriveInsights(
  accounts: WaterServiceAccount[],
  bills: WaterBill[],
  asOf = new Date(),
  unitSummary: WaterUnitSummary = { totalUnits: 0, occupiedUnits: 0 },
): WaterInsight[] {
  const out: WaterInsight[] = [];
  const kpis = computeKpis(accounts, bills, asOf);
  const rollups = rollupAccounts(accounts, bills, asOf);
  const efficiency = computeEfficiencyAnalytics(accounts, bills, unitSummary);

  const highestIntensity = efficiency.meters
    .filter((meter) => meter.performanceBand === 'above_reference')
    .sort((a, b) => (b.benchmarkVariancePct ?? 0) - (a.benchmarkVariancePct ?? 0))[0];
  if (highestIntensity) {
    out.push({
      id: `unit-intensity-${highestIntensity.accountId}`,
      severity: 'watch',
      title: `${highestIntensity.buildingLabel} is high per connected unit`,
      body: `${highestIntensity.gallonsPerUnitDay?.toFixed(1)} gal/unit/day is ${pct(highestIntensity.benchmarkVariancePct)} against the EPA multifamily median reference.`,
      action: 'Verify the meter-to-unit count, occupancy, and actual read; then inspect continuous-flow and common-area uses.',
      accountId: highestIntensity.accountId,
    });
  }

  if (efficiency.status !== 'insufficient' && efficiency.avoidedCost != null) {
    const saving = efficiency.avoidedCost >= 0;
    out.push({
      id: 'rate-normalized-savings',
      severity: saving ? 'opportunity' : 'watch',
      title: saving
        ? `${money(efficiency.avoidedCost)} in rate-normalized avoided cost`
        : `${money(Math.abs(efficiency.avoidedCost))} above the normalized baseline`,
      body: `${gallons(Math.abs(efficiency.avoidedGallons ?? 0))} ${saving ? 'below' : 'above'} the matched prior-year meter baseline. Estimated reads and duplicate bills are excluded.`,
      action: saving
        ? 'Document the efficiency measures responsible and keep actual-read coverage current before claiming verified savings.'
        : 'Rank meters by normalized excess cost and investigate the largest avoidable-use driver first.',
    });
  }

  const building8 = accounts.find(
    (a) => a.account_number === '2745714336' || /building 8/i.test(a.building_label || ''),
  );
  if (building8) {
    const mine = bills.filter((b) => b.account_id === building8.id);
    const estimated = mine.filter((b) => b.is_estimated);
    const estGal = estimated.reduce((s, b) => s + n(b.consumption_gallons), 0);
    const estSpend = estimated.reduce((s, b) => s + billSpend(b), 0);
    if (estimated.length > 0) {
      out.push({
        id: 'dispute-b8',
        severity: 'critical',
        title: 'Building 8 estimated-usage dispute',
        body: `${estimated.length} office-estimated bills on acct ${building8.account_number} total ${gallons(estGal)} and ${money(estSpend)}. Formal dispute filed 23 Jul 2026 for ~216k gal/mo during the vacant/rehab window.`,
        action: 'Keep the Opa-locka brief current. Instruct counsel/PM to request actual reads and a credit memo before the next hearing.',
        accountId: building8.id,
      });
    }
  }

  if (kpis.pastDueAmount > 0) {
    out.push({
      id: 'past-due',
      severity: 'watch',
      title: 'Past-due water/sewer exposure',
      body: `${money(kpis.pastDueAmount)} is sitting past due across the property. Late fees compound faster than consumption variance.`,
      action: 'Send payment instructions this week and flag any account still on estimate.',
    });
  }

  const risers = rollups
    .filter((r) => r.spendDeltaPct != null && r.spendDeltaPct >= 25 && r.last12Spend > 500)
    .sort((a, b) => (b.spendDeltaPct ?? 0) - (a.spendDeltaPct ?? 0));
  if (risers[0]) {
    out.push({
      id: `riser-${risers[0].accountId}`,
      severity: risers[0].spendDeltaPct! >= 60 ? 'critical' : 'watch',
      title: `${risers[0].buildingLabel} spend is up ${pct(risers[0].spendDeltaPct)}`,
      body: `Trailing-12 spend is ${money(risers[0].last12Spend)} vs ${money(risers[0].prior12Spend)} the year before (${gallons(risers[0].last12Gallons)}).`,
      action: 'Walk the meter, confirm occupancy, and compare the last three actual reads against the office estimate.',
      accountId: risers[0].accountId,
    });
  }

  const concentration = rollups.slice().sort((a, b) => b.last12Spend - a.last12Spend);
  const top = concentration[0];
  const totalL12 = concentration.reduce((s, r) => s + r.last12Spend, 0);
  if (top && totalL12 > 0 && top.last12Spend / totalL12 >= 0.35) {
    out.push({
      id: 'concentration',
      severity: 'info',
      title: `${top.buildingLabel} is ${Math.round((top.last12Spend / totalL12) * 100)}% of trailing spend`,
      body: `Service account ${top.accountNumber} is the cost center. Portfolio decisions should not be made from a single-building sample.`,
      action: 'Review the account table with the owner — this is the first place a leak or estimate error shows up.',
      accountId: top.accountId,
    });
  }

  if (kpis.estimatedSpend > 0) {
    out.push({
      id: 'estimates',
      severity: 'watch',
      title: `${money(kpis.estimatedSpend)} billed on estimates`,
      body: 'Estimated reads are the #1 source of Opa-locka overcharges on this portfolio. Actual consumption during vacancy should be near zero.',
      action: 'Require actual meter photos with every disputed period and stop paying estimates without a credit path.',
    });
  }

  if (kpis.ytdDeltaPct != null && kpis.ytdDeltaPct <= -8) {
    out.push({
      id: 'ytd-down',
      severity: 'opportunity',
      title: `YTD spend is ${pct(kpis.ytdDeltaPct)} vs last year`,
      body: `${money(kpis.ytdSpend)} year-to-date versus ${money(kpis.priorYtdSpend)} at this point last year.`,
      action: 'Lock the savings into the next owner report and keep vacant buildings on actual reads.',
    });
  } else if (kpis.ytdDeltaPct != null && kpis.ytdDeltaPct >= 12) {
    out.push({
      id: 'ytd-up',
      severity: 'watch',
      title: `YTD spend is ${pct(kpis.ytdDeltaPct)} vs last year`,
      body: `${money(kpis.ytdSpend)} year-to-date versus ${money(kpis.priorYtdSpend)} at this point last year.`,
      action: 'Identify which accounts drove the lift before the next budget meeting.',
    });
  }

  const quiet = rollups.filter((r) => r.last12Gallons < 1500 && r.status === 'active');
  if (quiet.length >= 2) {
    out.push({
      id: 'low-use',
      severity: 'info',
      title: `${quiet.length} accounts are near-idle`,
      body: quiet.map((r) => r.buildingLabel).slice(0, 4).join(', ') + ' show very low trailing consumption.',
      action: 'Confirm vacancy vs. unread meters so they are not later estimated at occupied volumes.',
    });
  }

  if (out.length === 0) {
    out.push({
      id: 'steady',
      severity: 'info',
      title: 'Portfolio is within a normal band',
      body: 'No estimate spike, past-due pile, or 25%+ account riser is currently flagged.',
      action: 'Keep ingesting the next PDF cycle so the trend line stays live.',
    });
  }

  return out.slice(0, 6);
}

export function localChatAnswer(question: string, snapshot: Record<string, unknown>) {
  const q = question.toLowerCase();
  const kpis = (snapshot.kpis ?? {}) as Record<string, number | null>;
  const accounts = (snapshot.accounts ?? []) as Array<Record<string, unknown>>;
  const efficiency = (snapshot.efficiency ?? {}) as Record<string, number | string | null>;
  if (/dispute|building 8|216|estimate/.test(q)) {
    return 'Building 8 (acct 2745714336) is the formal dispute. Miami-Dade estimated ~216k gallons/month while the building was vacant. Ask for actual reads and a credit memo; do not treat those estimates as consumption.';
  }
  if (/per capita|gpcd|per person|per unit|intensity|benchmark/.test(q)) {
    return `The latest normalized period is ${Number(efficiency.gallonsPerUnitDay || 0).toFixed(1)} gallons per connected unit per day and ${Number(efficiency.gallonsPerCapitaDay || 0).toFixed(1)} modeled gallons per capita per day. The EPA multifamily median reference is 43,600 gallons per unit per year; confirm meter mappings and resident counts before treating the modeled result as verified.`;
  }
  if (/saving|avoided|efficien/.test(q)) {
    const value = Number(efficiency.avoidedCost || 0);
    return `Rate-normalized avoided cost is ${money(value)} for the aligned comparison period, based on ${gallons(efficiency.avoidedGallons)} versus matched prior-year meter bills. Status: ${String(efficiency.status || 'insufficient')}. Estimated reads and duplicate bills are excluded.`;
  }
  if (/ytd|year|spend|cost/.test(q)) {
    return `Year-to-date water/sewer spend is ${money(kpis.ytdSpend)} (${pct(kpis.ytdDeltaPct as number)} vs the same point last year). Trailing-12 is ${money(kpis.last12Spend)} on ${gallons(kpis.last12Gallons)}.`;
  }
  if (/who|account|building|highest|most/.test(q)) {
    const top = [...accounts].sort((a, b) => n(b.last12Spend) - n(a.last12Spend))[0];
    if (top) {
      return `${top.building} (acct ${top.account}) is the largest trailing-12 cost center at ${money(top.last12Spend)}.`;
    }
  }
  if (/past due|open|owe|unpaid/.test(q)) {
    return `Open / unpaid exposure is ${money(kpis.openAmount)}, of which ${money(kpis.pastDueAmount)} is past due.`;
  }
  return `I can brief spend, consumption, estimates, and the Building 8 dispute. Trailing-12 spend is ${money(kpis.last12Spend)} across ${accounts.length} service accounts. Ask about a building or “what should we do next?”`;
}
