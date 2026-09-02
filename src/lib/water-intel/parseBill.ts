export interface ParsedWaterBill {
  accountNumber?: string;
  meterNumber?: string;
  serviceAddress?: string;
  periodStart?: string;
  periodEnd?: string;
  billingDate?: string;
  dueDate?: string;
  currentCharges?: number;
  amountDue?: number;
  waterCharges?: number;
  sewerCharges?: number;
  otherFees?: number;
  consumptionGallons?: number;
  priorReading?: number;
  currentReading?: number;
  isEstimated?: boolean;
  confidence: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function toIso(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (ISO.test(trimmed)) return trimmed;
  const mdy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, '0');
    const dd = mdy[2].padStart(2, '0');
    const yy = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${yy}-${mm}-${dd}`;
  }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

function moneyNum(raw: string | undefined) {
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function galNum(raw: string | undefined) {
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Best-effort parse of Miami-Dade / Opa-locka water-sewer bill text or filename. */
export function parseMiamiDadeBillText(text: string): ParsedWaterBill {
  const src = text.replace(/\u00a0/g, ' ');
  const out: ParsedWaterBill = { confidence: 0 };

  const acct = src.match(/account(?:\s*(?:no|number|#))?[:\s#-]*([0-9]{6,12})/i);
  if (acct) {
    out.accountNumber = acct[1];
    out.confidence += 0.25;
  }

  const meter = src.match(/meter(?:\s*(?:no|number|#))?[:\s#-]*([0-9]{5,12})/i);
  if (meter) out.meterNumber = meter[1];

  const addr = src.match(/(1\d{4}\s+(?:alexandria|port said|aswan|nw\s*32)[^\n,]{0,40})/i);
  if (addr) {
    out.serviceAddress = addr[1].replace(/\s+/g, ' ').trim();
    out.confidence += 0.1;
  }

  const period = src.match(
    /(?:service|billing)\s+period[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\s*(?:to|-|through)\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
  );
  if (period) {
    out.periodStart = toIso(period[1]);
    out.periodEnd = toIso(period[2]);
    out.confidence += 0.2;
  }

  const due = src.match(/due(?:\s*date)?[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (due) out.dueDate = toIso(due[1]);

  const billed = src.match(/bill(?:ing)?\s+date[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (billed) out.billingDate = toIso(billed[1]);

  const gallons = src.match(/(?:consumption|usage|water\s+used)[:\s]*([0-9,]{2,9})\s*(?:gal|gallons)?/i);
  if (gallons) {
    out.consumptionGallons = galNum(gallons[1]);
    out.confidence += 0.2;
  }

  const amountDue = src.match(/(?:amount\s+due|total\s+due|pay\s+this\s+amount)[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  if (amountDue) {
    out.amountDue = moneyNum(amountDue[1]);
    out.currentCharges = out.amountDue;
    out.confidence += 0.15;
  }

  const water = src.match(/water(?:\s+charges)?[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  if (water) out.waterCharges = moneyNum(water[1]);
  const sewer = src.match(/sewer(?:\s+charges)?[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  if (sewer) out.sewerCharges = moneyNum(sewer[1]);

  if (/estimat/i.test(src)) {
    out.isEstimated = true;
    out.confidence += 0.05;
  }

  return out;
}

export function inferPeriodFromFilename(name: string): { start?: string; end?: string } {
  const ym = name.match(/(20\d{2})[-_ ]?(0[1-9]|1[0-2])/);
  if (!ym) return {};
  const year = Number(ym[1]);
  const month = Number(ym[2]);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}
