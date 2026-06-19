/**
 * Pure document classify/parse helpers (F0). Used by the intake-ingest edge
 * function and the manual "process submission" UI so both share one heuristic.
 * No I/O — takes already-extracted text, returns a structured guess.
 */

export type DocType = "invoice" | "lien_release" | "co_request" | "unknown";

export interface ParsedFields {
  amount?: number;
  invoice_no?: string;
  period_end?: string;   // ISO
  through_date?: string;  // ISO (lien waivers)
  release_type?:
    | "conditional_progress" | "unconditional_progress"
    | "conditional_final" | "unconditional_final";
}

export interface ParseResult {
  doc_type: DocType;
  parsed: ParsedFields;
  /** confident enough to auto-create a draft record */
  confident: boolean;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseDate(text: string): string | undefined {
  let m = text.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
  }
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(+m[1]).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
  return undefined;
}

export function parseAmount(text: string): number | undefined {
  // Prefer an amount following a TOTAL/AMOUNT DUE label, else the largest $ figure.
  const labeled = text.match(/\b(?:total|amount\s*due|balance\s*due)\b[^\d$]{0,12}\$?\s*([\d,]+\.\d{2})/i);
  if (labeled) return Number(labeled[1].replace(/,/g, ""));
  const all = [...text.matchAll(/\$\s*([\d,]+\.\d{2})/g)].map((x) => Number(x[1].replace(/,/g, "")));
  return all.length ? Math.max(...all) : undefined;
}

export function classifyDoc(text: string): DocType {
  const t = text.toLowerCase();
  if (/(lien\s+(waiver|release)|waiver\s+of\s+lien|conditional\s+(waiver|release)|unconditional\s+(waiver|release))/.test(t))
    return "lien_release";
  if (/(change\s+order|co\s+request|change\s+proposal|pco)/.test(t)) return "co_request";
  if (/(invoice|pay\s*app|application\s+for\s+payment|bill\s+to|amount\s+due|remit)/.test(t))
    return "invoice";
  return "unknown";
}

function classifyReleaseType(text: string): ParsedFields["release_type"] | undefined {
  const t = text.toLowerCase();
  const cond = t.includes("unconditional") ? "unconditional" : t.includes("conditional") ? "conditional" : undefined;
  if (!cond) return undefined;
  const stage = /(final|retainage|retention)/.test(t) ? "final" : "progress";
  return `${cond}_${stage}` as ParsedFields["release_type"];
}

export function parseSubmission(text: string): ParseResult {
  const doc_type = classifyDoc(text);
  const parsed: ParsedFields = {};

  if (doc_type === "invoice") {
    parsed.amount = parseAmount(text);
    const inv = text.match(/invoice\s*#?\s*[:.]?\s*([A-Za-z0-9-]{2,})/i);
    if (inv) parsed.invoice_no = inv[1];
    parsed.period_end = parseDate(text);
  } else if (doc_type === "lien_release") {
    parsed.release_type = classifyReleaseType(text);
    parsed.through_date = parseDate(text);
    parsed.amount = parseAmount(text);
  }

  const confident =
    (doc_type === "invoice" && parsed.amount != null) ||
    (doc_type === "lien_release" && parsed.release_type != null);

  return { doc_type, parsed, confident };
}
