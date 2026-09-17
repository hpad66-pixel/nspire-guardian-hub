import { GLORIETA_CANONICAL_BILLS, GLORIETA_CORPUS_BILLS, GLORIETA_CORPUS_SUMMARY } from './glorietaCorpus.generated';
import { money } from './analytics';

export interface GlorietaMonthlyPoint {
  month: string;
  label: string;
  gallons: number;
  spend: number;
  disputeGallons: number;
  disputeSpend: number;
}

export interface GlorietaAccountPoint {
  accountNumber: string;
  label: string;
  meterNumber?: string;
  gallons: number;
  spend: number;
  billCount: number;
}

export interface GlorietaMeterTimelinePoint {
  accountNumber: string;
  label: string;
  meterNumber?: string;
  preVacancySpend: number;
  vacancySpend: number;
  postRehabSpend: number;
  preVacancyGallons: number;
  vacancyGallons: number;
  postRehabGallons: number;
  isDispute: boolean;
}

export interface GlorietaFocusedPhasePoint {
  accountNumber: string;
  label: string;
  meterNumber?: string;
  unitContext: string;
  phases: {
    pre: GlorietaPhaseSummary;
    vacancy: GlorietaPhaseSummary;
    current: GlorietaPhaseSummary;
  };
}

export interface GlorietaPhaseSummary {
  charges: number;
  gallons: number;
  billCount: number;
  firstRead?: number;
  lastRead?: number;
  firstPeriod?: string;
  lastPeriod?: string;
}

export interface GlorietaBuildingMonthlyRecord {
  accountNumber: string;
  label: string;
  servicePeriod: string;
  periodStart: string;
  gallons: number;
  spend: number;
  priorReading?: number;
  currentReading?: number;
  phase: 'Pre-vacancy' | 'Vacancy/rehab' | 'Current/post-rehab';
}

export interface GlorietaDisputeCase {
  summary: typeof GLORIETA_CORPUS_SUMMARY;
  monthly: GlorietaMonthlyPoint[];
  accounts: GlorietaAccountPoint[];
  meterTimeline: GlorietaMeterTimelinePoint[];
  focusedPhase: GlorietaFocusedPhasePoint[];
  focusedMonthly: GlorietaBuildingMonthlyRecord[];
  disputeMonthly: GlorietaMonthlyPoint[];
  evidenceFacts: string[];
  regulatoryPoints: Array<{
    label: string;
    body: string;
    href: string;
  }>;
  draftLetterHtml: string;
}

export const GLORIETA_FORMAL_RETROACTIVE_REBILL = 95017.57;
export const GLORIETA_FORMAL_UNPAID_BALANCE = 113874.41;
export const GLORIETA_BUILDING_7_ACCOUNT = '1692380502';
export const GLORIETA_BUILDING_8_ACCOUNT = GLORIETA_CORPUS_SUMMARY.disputeAccount;
export const GLORIETA_BUILDING_UNITS: Record<string, string> = {
  [GLORIETA_BUILDING_7_ACCOUNT]: '63 visible units from 07-W123 through 07-W345',
  [GLORIETA_BUILDING_8_ACCOUNT]: '58 visible units from 08-W103 through 08-W322',
};

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function monthKey(date?: string) {
  return String(date || '').slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return MONTH_FORMAT.format(new Date(Date.UTC(year, month - 1, 1)));
}

function titleCaseAddress(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bNw\b/g, 'NW');
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function corpusRecords() {
  return GLORIETA_CANONICAL_BILLS
    .filter((bill) => bill.accountNumber && bill.periodStart)
    .slice()
    .sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)));
}

function phaseFor(periodStart?: string) {
  const start = String(periodStart || '');
  if (start < '2023-08-01') return 'pre' as const;
  if (start <= '2025-02-28') return 'vacancy' as const;
  return 'post' as const;
}

function phaseName(periodStart?: string): GlorietaBuildingMonthlyRecord['phase'] {
  const phase = phaseFor(periodStart);
  if (phase === 'pre') return 'Pre-vacancy';
  if (phase === 'vacancy') return 'Vacancy/rehab';
  return 'Current/post-rehab';
}

function blankPhase(): GlorietaPhaseSummary {
  return {
    charges: 0,
    gallons: 0,
    billCount: 0,
  };
}

function addPhaseBill(phase: GlorietaPhaseSummary, bill: (typeof GLORIETA_CANONICAL_BILLS)[number]) {
  const start = String(bill.periodStart || '');
  const end = String(bill.periodEnd || '');
  phase.charges += number(bill.currentCharges || bill.amountDue);
  phase.gallons += number(bill.consumptionGallons);
  phase.billCount += 1;
  if (!phase.firstPeriod || start < phase.firstPeriod) {
    phase.firstPeriod = start;
    phase.firstRead = typeof bill.priorReading === 'number' ? bill.priorReading : undefined;
  }
  if (!phase.lastPeriod || end > phase.lastPeriod) {
    phase.lastPeriod = end;
    phase.lastRead = typeof bill.currentReading === 'number' ? bill.currentReading : undefined;
  }
}

function buildFocusedPhase(canonical: ReturnType<typeof corpusRecords>): GlorietaFocusedPhasePoint[] {
  const focusOrder = [GLORIETA_BUILDING_7_ACCOUNT, GLORIETA_BUILDING_8_ACCOUNT];
  const map = new Map<string, GlorietaFocusedPhasePoint>();

  for (const bill of canonical) {
    const accountNumber = String(bill.accountNumber || '');
    if (!focusOrder.includes(accountNumber)) continue;
    const existing =
      map.get(accountNumber)
      ?? {
        accountNumber,
        label: bill.buildingLabel || titleCaseAddress(bill.serviceAddress) || accountNumber,
        meterNumber: bill.meterNumber,
        unitContext: GLORIETA_BUILDING_UNITS[accountNumber] || '',
        phases: {
          pre: blankPhase(),
          vacancy: blankPhase(),
          current: blankPhase(),
        },
      };
    if (!existing.meterNumber && bill.meterNumber) existing.meterNumber = bill.meterNumber;
    const phase = phaseFor(bill.periodStart);
    addPhaseBill(phase === 'post' ? existing.phases.current : existing.phases[phase], bill);
    map.set(accountNumber, existing);
  }

  return focusOrder.map((accountNumber) => map.get(accountNumber)).filter(Boolean) as GlorietaFocusedPhasePoint[];
}

function buildFocusedMonthly(canonical: ReturnType<typeof corpusRecords>): GlorietaBuildingMonthlyRecord[] {
  return canonical
    .filter((bill) => [GLORIETA_BUILDING_7_ACCOUNT, GLORIETA_BUILDING_8_ACCOUNT].includes(String(bill.accountNumber || '')))
    .map((bill) => ({
      accountNumber: String(bill.accountNumber || ''),
      label: bill.buildingLabel || titleCaseAddress(bill.serviceAddress) || String(bill.accountNumber || ''),
      servicePeriod: `${bill.periodStart || ''} to ${bill.periodEnd || ''}`,
      periodStart: String(bill.periodStart || ''),
      gallons: number(bill.consumptionGallons),
      spend: number(bill.currentCharges || bill.amountDue),
      priorReading: typeof bill.priorReading === 'number' ? bill.priorReading : undefined,
      currentReading: typeof bill.currentReading === 'number' ? bill.currentReading : undefined,
      phase: phaseName(bill.periodStart),
    }))
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber) || a.periodStart.localeCompare(b.periodStart));
}

export function buildGlorietaDisputeCase(): GlorietaDisputeCase {
  const canonical = corpusRecords();
  const monthlyMap = new Map<string, GlorietaMonthlyPoint>();
  const accountMap = new Map<string, GlorietaAccountPoint>();
  const timelineMap = new Map<string, GlorietaMeterTimelinePoint>();

  for (const bill of canonical) {
    const key = monthKey(bill.periodStart);
    if (!key) continue;
    const spend = number(bill.currentCharges || bill.amountDue);
    const gallons = number(bill.consumptionGallons);
    const isDisputeAccount = bill.accountNumber === GLORIETA_CORPUS_SUMMARY.disputeAccount;
    const inDisputeWindow =
      isDisputeAccount
      && String(bill.periodStart) >= GLORIETA_CORPUS_SUMMARY.disputePeriodStart
      && String(bill.periodStart) <= GLORIETA_CORPUS_SUMMARY.disputePeriodEnd;

    const month =
      monthlyMap.get(key)
      ?? {
        month: key,
        label: monthLabel(key),
        gallons: 0,
        spend: 0,
        disputeGallons: 0,
        disputeSpend: 0,
      };
    month.gallons += gallons;
    month.spend += spend;
    if (inDisputeWindow) {
      month.disputeGallons += gallons;
      month.disputeSpend += spend;
    }
    monthlyMap.set(key, month);

    const accountNumber = String(bill.accountNumber);
    const account =
      accountMap.get(accountNumber)
      ?? {
        accountNumber,
        label: bill.buildingLabel || titleCaseAddress(bill.serviceAddress) || accountNumber,
        meterNumber: bill.meterNumber,
        gallons: 0,
        spend: 0,
        billCount: 0,
      };
    account.gallons += gallons;
    account.spend += spend;
    account.billCount += 1;
    if (!account.meterNumber && bill.meterNumber) account.meterNumber = bill.meterNumber;
    accountMap.set(accountNumber, account);

    const timeline =
      timelineMap.get(accountNumber)
      ?? {
        accountNumber,
        label: bill.buildingLabel || titleCaseAddress(bill.serviceAddress) || accountNumber,
        meterNumber: bill.meterNumber,
        preVacancySpend: 0,
        vacancySpend: 0,
        postRehabSpend: 0,
        preVacancyGallons: 0,
        vacancyGallons: 0,
        postRehabGallons: 0,
        isDispute: isDisputeAccount,
      };
    const phase = phaseFor(bill.periodStart);
    if (phase === 'pre') {
      timeline.preVacancySpend += spend;
      timeline.preVacancyGallons += gallons;
    } else if (phase === 'vacancy') {
      timeline.vacancySpend += spend;
      timeline.vacancyGallons += gallons;
    } else {
      timeline.postRehabSpend += spend;
      timeline.postRehabGallons += gallons;
    }
    if (!timeline.meterNumber && bill.meterNumber) timeline.meterNumber = bill.meterNumber;
    timelineMap.set(accountNumber, timeline);
  }

  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const accounts = [...accountMap.values()].sort((a, b) => b.spend - a.spend);
  const meterTimeline = [...timelineMap.values()].sort((a, b) => {
    if (a.isDispute !== b.isDispute) return a.isDispute ? -1 : 1;
    return b.vacancySpend - a.vacancySpend;
  });
  const focusedPhase = buildFocusedPhase(canonical);
  const focusedMonthly = buildFocusedMonthly(canonical);
  const disputeMonthly = monthly.filter((row) => row.disputeSpend > 0 || row.disputeGallons > 0);

  const summary = GLORIETA_CORPUS_SUMMARY;
  const reviewCount = GLORIETA_CORPUS_BILLS.filter((bill) => bill.parseStatus !== 'parsed').length;

  return {
    summary,
    monthly,
    accounts,
    meterTimeline,
    focusedPhase,
    focusedMonthly,
    disputeMonthly,
    evidenceFacts: [
      `${summary.sourceFileCount} WASD PDFs were reviewed from the Water Meter Files folder; ${summary.canonicalBillCount} account-period records are usable for trends after duplicate control.`,
      `${reviewCount} records remain in the review queue because the account or service-period line needs human confirmation before it should drive the client-facing billing position.`,
      `Account ${summary.disputeAccount}, meter ${summary.disputeMeter}, is the Building 8 dispute account for the April 2024 through January 2026 vacant or rehab window.`,
      `The extracted Building 8 dispute-window subtotal is ${money(summary.disputeCurrentCharges)} in current charges, ${summary.disputeGallons.toLocaleString()} gallons, ${money(summary.disputeWaterCharges)} water, and ${money(summary.disputeSewerCharges)} sewer.`,
      `The formal dispute letter dated ${summary.formalDisputeDate} identifies a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill, an unpaid ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} balance, and estimated usage of about 216,000 gallons per month.`,
      'The billing case should stay anchored to actual statements, actual reads, the cited rebill, and the unpaid balance until the City or WASD supplies its rebill worksheet.',
    ],
    regulatoryPoints: [
      {
        label: 'Rules bind WASD customer handling',
        body: 'Miami-Dade Implementing Order 10-8 states that WASD must act under its Rules and Regulations when dealing with water and sewer customers. That lets the request be framed as a rules-based correction, not only a courtesy request.',
        href: 'https://documents.miamidade.gov/ao-io/IO/IO-10-08.pdf',
      },
      {
        label: 'Corrected billing must use actual consumption when available',
        body: 'The corrected-billing rule says overbilled charges must be corrected, and if true readings are unavailable, another actual service-location period or average anticipated consumption is used. A vacant building with no ordinary occupancy is exactly why estimated usage needs strict review.',
        href: 'https://documents.miamidade.gov/ao-io/IO/IO-10-08.pdf',
      },
      {
        label: 'High-bill investigation threshold is triggered',
        body: 'The high-bill policy calls for investigation when consumption is materially above prior average usage. The Building 8 estimate of roughly 216,000 gallons per month during vacancy is far beyond ordinary review thresholds.',
        href: 'https://documents.miamidade.gov/ao-io/IO/IO-10-08.pdf',
      },
      {
        label: 'County Code recognizes extreme high-bill relief',
        body: 'Miami-Dade Code section 32-101 addresses one-time lifetime credit concepts for extreme high bills. The argument here is broader than a routine leak credit: the record points to estimated/back-billed usage for a condemned and unoccupied building.',
        href: 'https://www.miamidade.gov/govaction/legistarfiles/Matters/Y2025/251156.pdf',
      },
      {
        label: 'Chapter 32 is a public-interest utility framework',
        body: 'County legislative materials describe Chapter 32 as governing water and sewer utilities and protecting public health, safety, welfare, rates, and standards of service. That supports a transparent review before collection or service consequences are imposed.',
        href: 'https://www.miamidade.gov/govaction/matter.asp?file=false&fileAnalysis=false&matter=252106&yearFolder=Y2025',
      },
    ],
    draftLetterHtml: buildDraftLetterHtml(),
  };
}

function buildDraftLetterHtml() {
  const summary = GLORIETA_CORPUS_SUMMARY;
  return `
    <h2>Draft for review - Formal request for corrected billing and credit</h2>
    <p><strong>To:</strong> City of Opa-locka Public Works Department and Miami-Dade Water and Sewer Department</p>
    <p><strong>Re:</strong> Glorieta Gardens - Account ${summary.disputeAccount}, Meter ${summary.disputeMeter}, Building 8 / 13200 Alexandria Drive</p>
    <p>Dear Public Works and WASD Billing Review Team,</p>
    <p>We are requesting a corrected billing review and credit for the Building 8 water and sewer account at Glorieta Gardens. The disputed period covers the vacancy and rehabilitation window beginning in April 2024 and continuing through January 2026, when Building 8 was not operating as an occupied residential building.</p>
    <p>The owner-side record shows that the account was billed using estimated usage of approximately 216,000 gallons per month during a period when ordinary residential consumption could not have occurred. The July 23, 2026 dispute letter identifies a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill and a ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} unpaid balance. The available billing backup currently shows ${summary.disputeGallons.toLocaleString()} gallons and ${money(summary.disputeCurrentCharges)} in current charges tied to Account ${summary.disputeAccount} within the dispute window.</p>
    <p>Our request is straightforward: please remove charges that are not supported by actual consumption, actual meter reads, or a reasonable service-location consumption basis for the period when the building was condemned, vacant, and under rehabilitation. Where actual reads are unavailable, please apply the corrected-billing principles in WASD's rules using actual consumption from a comparable service-location period or average anticipated consumption appropriate to a vacant building, not an occupied multifamily building.</p>
    <p>We also request the meter-change work order, installation date, starting register reading, read history, estimate basis, adjustment worksheet, payment ledger, late charge ledger, and any internal investigation notes used to support the rebill.</p>
    <p>Until the review is complete, please suspend any past-due classification, late charge escalation, collection action, discontinuance process, or adverse account action related to the disputed estimated amount.</p>
    <p>Respectfully,</p>
    <p><strong>R4</strong></p>
  `;
}
