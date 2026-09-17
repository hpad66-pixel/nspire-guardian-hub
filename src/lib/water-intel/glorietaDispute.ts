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
  gallons: number;
  spend: number;
  billCount: number;
}

export interface GlorietaDisputeCase {
  summary: typeof GLORIETA_CORPUS_SUMMARY;
  monthly: GlorietaMonthlyPoint[];
  accounts: GlorietaAccountPoint[];
  disputeMonthly: GlorietaMonthlyPoint[];
  evidenceFacts: string[];
  regulatoryPoints: Array<{
    label: string;
    body: string;
    href: string;
  }>;
  draftLetterHtml: string;
}

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

export function buildGlorietaDisputeCase(): GlorietaDisputeCase {
  const canonical = corpusRecords();
  const monthlyMap = new Map<string, GlorietaMonthlyPoint>();
  const accountMap = new Map<string, GlorietaAccountPoint>();

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
        gallons: 0,
        spend: 0,
        billCount: 0,
      };
    account.gallons += gallons;
    account.spend += spend;
    account.billCount += 1;
    accountMap.set(accountNumber, account);
  }

  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const accounts = [...accountMap.values()].sort((a, b) => b.spend - a.spend);
  const disputeMonthly = monthly.filter((row) => row.disputeSpend > 0 || row.disputeGallons > 0);

  const summary = GLORIETA_CORPUS_SUMMARY;
  const reviewCount = GLORIETA_CORPUS_BILLS.filter((bill) => bill.parseStatus !== 'parsed').length;

  return {
    summary,
    monthly,
    accounts,
    disputeMonthly,
    evidenceFacts: [
      `${summary.sourceFileCount} WASD PDFs were indexed from the Water Meter Files folder; ${summary.canonicalBillCount} account-period records are usable for trends after duplicate control.`,
      `${reviewCount} records remain in the review queue because the account or service-period line needs human confirmation before it should drive a client claim.`,
      `Account ${summary.disputeAccount}, meter ${summary.disputeMeter}, is the Building 8 dispute account for the April 2024 through January 2026 vacant or rehab window.`,
      `The extracted Building 8 dispute-window subtotal is ${money(summary.disputeCurrentCharges)} in current charges, ${summary.disputeGallons.toLocaleString()} gallons, ${money(summary.disputeWaterCharges)} water, and ${money(summary.disputeSewerCharges)} sewer.`,
      `The formal dispute letter dated ${summary.formalDisputeDate} identifies a $95,017.57 retroactive rebill, an unpaid $113,874.41 balance, and estimated usage of about 216,000 gallons per month.`,
      `The requested ${money(summary.claimedCreditTarget)} claim target is treated as the owner-requested full exposure placeholder until counsel and the billing authority reconcile it to final statements, damages, late charges, and credits.`,
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
    <p>The owner-side record shows that the account was billed using estimated usage of approximately 216,000 gallons per month during a period when ordinary residential consumption could not have occurred. The July 23, 2026 dispute letter identifies a $95,017.57 retroactive rebill and a $113,874.41 unpaid balance. ProjOS Water Intelligence has indexed the available WASD statement backup and currently shows ${summary.disputeGallons.toLocaleString()} gallons and ${money(summary.disputeCurrentCharges)} in current charges tied to Account ${summary.disputeAccount} within the dispute window. The owner has asked that the full disputed exposure, currently carried as ${money(summary.claimedCreditTarget)}, be reviewed and reconciled to the underlying billing record, credits, late charges, and any related service consequences.</p>
    <p>Our request is straightforward: please remove charges that are not supported by actual consumption, actual meter reads, or a reasonable service-location consumption basis for the period when the building was condemned, vacant, and under rehabilitation. Where actual reads are unavailable, please apply the corrected-billing principles in WASD's rules using actual consumption from a comparable service-location period or average anticipated consumption appropriate to a vacant building, not an occupied multifamily building.</p>
    <p>We also request the meter-change work order, installation date, starting register reading, read history, estimate basis, adjustment worksheet, payment ledger, late charge ledger, and any internal investigation notes used to support the rebill.</p>
    <p>Until the review is complete, please suspend any past-due classification, late charge escalation, collection action, discontinuance process, or adverse account action related to the disputed estimated amount.</p>
    <p>Respectfully,</p>
    <p><strong>APAS Consulting LLC</strong><br />Powered by ProjOS Water Intelligence</p>
  `;
}
