export interface ParsedWaterBill {
  accountNumber?: string;
  meterNumber?: string;
  serviceAddress?: string;
  periodStart?: string;
  periodEnd?: string;
  billingDate?: string;
  dueDate?: string;
  previousBalance?: number;
  currentCharges?: number;
  amountDue?: number;
  waterCharges?: number;
  sewerCharges?: number;
  otherFees?: number;
  consumptionGallons?: number;
  priorReading?: number;
  currentReading?: number;
  daysOfService?: number;
  isEstimated?: boolean;
  confidence: number;
}

export interface AccountMatchHint {
  id: string;
  account_number: string;
  meter_number?: string | null;
  service_address: string;
  building_label?: string | null;
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

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function firstMoney(src: string, pattern: RegExp): number | undefined {
  const m = src.match(pattern);
  return m ? moneyNum(m[1]) : undefined;
}

/**
 * Miami-Dade WASD bills consumption in KGW (thousand gallons) even when the
 * column is labeled "in GAL". Reading delta 5994→6417 = 423 KGW = 423,000 gal.
 */
function kgwToGallons(kgw: number | undefined) {
  if (kgw == null || !Number.isFinite(kgw)) return undefined;
  if (kgw === 0) return 0;
  if (kgw >= 5000) return kgw;
  return kgw * 1000;
}

/** Best-effort parse of Miami-Dade / Opa-locka water-sewer bill text or filename. */
export function parseMiamiDadeBillText(text: string): ParsedWaterBill {
  const src = text.replace(/\u00a0/g, ' ');
  const out: ParsedWaterBill = { confidence: 0 };

  const acct = src.match(/account(?:\s*(?:no|number|#))?[:\s#-]*([0-9]{7,12})/i);
  if (acct) {
    out.accountNumber = acct[1];
    out.confidence += 0.25;
  }

  const meterLine = src.match(
    /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{5,12})\s+(\d{1,3})\s+(\d+)\s+(\d+)\s+(\d+)/,
  );
  if (meterLine) {
    out.periodStart = toIso(meterLine[1]);
    out.periodEnd = toIso(meterLine[2]);
    out.meterNumber = meterLine[3];
    out.daysOfService = Number(meterLine[4]);
    out.priorReading = Number(meterLine[5]);
    out.currentReading = Number(meterLine[6]);
    out.consumptionGallons = kgwToGallons(Number(meterLine[7]));
    out.confidence += 0.25;
  } else {
    const meter = src.match(/meter(?:\s*(?:no|number|#))?[:\s#-]*([0-9]{5,12})/i);
    if (meter) out.meterNumber = meter[1];
  }

  const addr = src.match(/(1\d{4}\s+(?:alexandria|alexandr\w*|port said|aswan|nw\s*32)[^\n,]{0,40})/i);
  if (addr) {
    out.serviceAddress = addr[1].replace(/\s+/g, ' ').trim();
    out.confidence += 0.1;
  }

  if (!out.periodStart) {
    const period = src.match(
      /(?:service|billing)\s+period[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\s*(?:to|-|through)\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
    );
    if (period) {
      out.periodStart = toIso(period[1]);
      out.periodEnd = toIso(period[2]);
      out.confidence += 0.2;
    }
  }

  const due = src.match(/(?:past\s+due\s+date|due(?:\s*date)?)[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (due) out.dueDate = toIso(due[1]);

  const billed = src.match(/bill(?:ing)?\s+date[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (billed) out.billingDate = toIso(billed[1]);

  if (out.consumptionGallons == null) {
    const gallons = src.match(/(?:consumption|usage|water\s+used)[:\s]*([0-9,]{1,9})\s*(?:gal|gallons|kgw)?/i);
    if (gallons) {
      const n = galNum(gallons[1]);
      out.consumptionGallons = /kgw/i.test(src) ? kgwToGallons(n) : n;
      out.confidence += 0.2;
    }
  }

  out.previousBalance = firstMoney(src, /previous\s+balance[:\s]*\$?\s*([0-9,-]+\.\d{2})/i);
  out.currentCharges = firstMoney(src, /current\s+charges[:\s]*\$?\s*([0-9,]+\.\d{2})/i);

  const totalBal = firstMoney(src, /total\s+account\s+balance[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  const amountDue = src.match(/(?:amount\s+due|total\s+due|pay\s+this\s+amount)[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  out.amountDue = amountDue ? moneyNum(amountDue[1]) : totalBal ?? out.currentCharges;
  if (out.currentCharges == null && out.amountDue != null) out.currentCharges = out.amountDue;
  if (out.currentCharges != null || out.amountDue != null) out.confidence += 0.15;

  out.waterCharges = firstMoney(src, /water\s+charges\s+subtotal[:\s]*\$?\s*([0-9,]+\.\d{2})/i)
    ?? firstMoney(src, /water(?:\s+charges)?[:\s]*\$?\s*([0-9,]+\.\d{2})/i);
  out.sewerCharges = firstMoney(src, /sewer\s+charges\s+subtotal[:\s]*\$?\s*([0-9,]+\.\d{2})/i)
    ?? firstMoney(src, /sewer(?:\s+charges)?[:\s]*\$?\s*([0-9,]+\.\d{2})/i);

  if (/office\s+estimate|\bestimat/i.test(src)) {
    out.isEstimated = true;
    out.confidence += 0.05;
  }

  return out;
}

export function inferPeriodFromFilename(name: string): { start?: string; end?: string } {
  const rangeMdY = name.match(
    /(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\s+TO\s+(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/i,
  );
  if (rangeMdY) {
    return {
      start: toIso(`${rangeMdY[1]}/${rangeMdY[2]}/${rangeMdY[3]}`),
      end: toIso(`${rangeMdY[4]}/${rangeMdY[5]}/${rangeMdY[6]}`),
    };
  }

  const rangeMy = name.match(/(0?[1-9]|1[0-2])[-_/ ](20\d{2})\s+TO\s+(0?[1-9]|1[0-2])[-_/ ](20\d{2})/i);
  if (rangeMy) {
    const y1 = Number(rangeMy[2]);
    const m1 = Number(rangeMy[1]);
    const y2 = Number(rangeMy[4]);
    const m2 = Number(rangeMy[3]);
    return {
      start: `${y1}-${String(m1).padStart(2, '0')}-01`,
      end: lastDayOfMonth(y2, m2),
    };
  }

  const singleMy = name.match(/\bBILL\s+(0?[1-9]|1[0-2])[-_/ ](20\d{2})\b/i)
    || name.match(/\b(0?[1-9]|1[0-2])[-_/](20\d{2})\s+ACCOUNT/i);
  if (singleMy) {
    const month = Number(singleMy[1]);
    const year = Number(singleMy[2]);
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: lastDayOfMonth(year, month),
    };
  }

  const ym = name.match(/(20\d{2})[-_ /](0[1-9]|1[0-2])(?!\d)/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: lastDayOfMonth(year, month),
    };
  }
  return {};
}

export function accountNumberFromFilename(name: string): string | undefined {
  const full = name.match(/account[#\s_-]*(\d{7,12})/i) || name.match(/\b(\d{10})\b/);
  if (full) return full[1];
  return undefined;
}

export function last4FromFilename(name: string): string | undefined {
  const m = name.match(/account[_\s#-]*(\d{4})\b/i) || name.match(/_(\d{4})\b/);
  return m?.[1];
}

function normalizeAddr(value: string) {
  return value
    .toLowerCase()
    .replace(/alexandr[aei]+/g, 'alexandria')
    .replace(/aleandria/g, 'alexandria')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function streetHintFromFilename(name: string): string | undefined {
  const m = name.match(/(1\d{4})\s+(alexandria|alexandr\w*|aleandria|port said|aswan|nw\s*32)/i);
  if (!m) return undefined;
  return normalizeAddr(`${m[1]} ${m[2]}`);
}

export function matchServiceAccount<T extends AccountMatchHint>(
  accounts: T[],
  hint: { accountNumber?: string; meterNumber?: string; serviceAddress?: string; filename?: string },
): T | null {
  if (accounts.length === 0) return null;

  const fileAcct = hint.filename ? accountNumberFromFilename(hint.filename) : undefined;
  const wanted = hint.accountNumber || fileAcct;
  if (wanted) {
    const exact = accounts.find((a) => a.account_number === wanted);
    if (exact) return exact;
    const last4 = wanted.slice(-4);
    const byTail = accounts.filter((a) => a.account_number.endsWith(last4));
    if (byTail.length === 1) return byTail[0];
  }

  if (hint.meterNumber) {
    const meter = accounts.find((a) => a.meter_number && a.meter_number === hint.meterNumber);
    if (meter) return meter;
  }

  const last4 = hint.filename ? last4FromFilename(hint.filename) : undefined;
  if (last4) {
    const byTail = accounts.filter((a) => a.account_number.endsWith(last4));
    if (byTail.length === 1) return byTail[0];
  }

  const street = hint.filename ? streetHintFromFilename(hint.filename) : undefined;
  const addr = hint.serviceAddress ? normalizeAddr(hint.serviceAddress) : street;
  if (addr) {
    const hits = accounts.filter((a) => {
      const hay = normalizeAddr(`${a.service_address} ${a.building_label || ''}`);
      const num = addr.match(/^(\d{5})/)?.[1];
      return num ? hay.includes(num) : hay.includes(addr);
    });
    if (hits.length === 1) return hits[0];
    // 13210 has two meters — prefer the WASD "BILL" account (8082997418) over the idle 2663 meter.
    if (hits.length > 1 && /13210/.test(addr)) {
      return hits.find((a) => a.account_number.endsWith('7418')) || hits[0];
    }
    if (hits.length > 1) return hits[0];
  }

  return null;
}

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}
