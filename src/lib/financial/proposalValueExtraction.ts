import { extractFiles } from "@/lib/proposals/extractFileText";

export interface ExtractedProposalValueLine {
  description: string;
  unit_cost: number;
  markup_pct: number;
  confidence: "high" | "medium" | "low";
  source_text: string;
}

const MONEY_RE = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.(\d{2}))?/g;
const TOTAL_WORDS = /\b(grand\s+total|total|subtotal|amount\s+due|contract\s+sum|proposal\s+amount|lump\s+sum)\b/i;
const WEAK_LINE_WORDS = /\b(scope|work|service|repair|install|replacement|labor|material|subcontract|consulting|engineering|mobilization|permit|inspection|management|design|survey|testing)\b/i;
const IGNORE_WORDS = /\b(page|invoice\s+#|proposal\s+#|date|phone|email|fax|zip|address)\b/i;

function money(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function cleanDescription(line: string, amountText: string): string {
  return line
    .replace(amountText, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—#:.\d)]+/, "")
    .replace(/[\s\-–—#:]+$/, "")
    .trim()
    .slice(0, 180);
}

function pickDescription(lines: string[], index: number, amountText: string): string {
  const current = cleanDescription(lines[index] ?? "", amountText);
  if (current.length >= 8 && !TOTAL_WORDS.test(current)) return current;

  for (let offset = 1; offset <= 2; offset += 1) {
    const before = cleanDescription(lines[index - offset] ?? "", "");
    if (before.length >= 8 && !TOTAL_WORDS.test(before) && !IGNORE_WORDS.test(before)) return before;
  }

  return current || "Approved proposal value";
}

export function extractProposalValueLinesFromText(text: string): ExtractedProposalValueLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const candidates: ExtractedProposalValueLine[] = [];

  lines.forEach((line, index) => {
    const amounts = Array.from(line.matchAll(MONEY_RE));
    if (!amounts.length) return;
    if (IGNORE_WORDS.test(line) && !WEAK_LINE_WORDS.test(line) && !TOTAL_WORDS.test(line)) return;

    const last = amounts[amounts.length - 1];
    const rawAmount = last[0];
    const value = money(rawAmount);
    if (value <= 0) return;
    if (value < 50 && !TOTAL_WORDS.test(line)) return;

    const description = pickDescription(lines, index, rawAmount);
    const isTotal = TOTAL_WORDS.test(line) || TOTAL_WORDS.test(description);
    const confidence: ExtractedProposalValueLine["confidence"] =
      !isTotal && WEAK_LINE_WORDS.test(`${description} ${line}`) ? "high" : isTotal ? "medium" : "low";

    candidates.push({
      description: isTotal && description.toLowerCase() === "total" ? "Approved proposal total" : description,
      unit_cost: value,
      markup_pct: 0,
      confidence,
      source_text: line,
    });
  });

  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      const key = `${candidate.description.toLowerCase()}|${candidate.unit_cost}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.confidence] - rank[b.confidence];
    })
    .slice(0, 12);
}

export async function extractProposalValueLinesFromFile(file: File): Promise<ExtractedProposalValueLine[]> {
  const extracted = await extractFiles([file]);
  if (!extracted.text.trim()) return [];
  return extractProposalValueLinesFromText(extracted.text);
}
