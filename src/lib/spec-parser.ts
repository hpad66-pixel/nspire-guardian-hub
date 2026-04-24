/**
 * B3 · Spec section parser — extracted from SpecUploadDialog so the logic is
 * reusable and unit-testable.
 *
 * Accepts one spec section per line:
 *   "03 30 00  Cast-in-Place Concrete"    ← two+ spaces between number + title
 *   "03 30 00<TAB>Cast-in-Place Concrete" ← tab-separated
 *   "03 30 00, Cast-in-Place Concrete"    ← comma-separated
 *
 * Returns { section_number, title, division } for each parseable line and
 * drops invalid lines silently (callers should show the parsed-vs-raw count
 * so the user notices when lines are rejected).
 */
export interface ParsedSection {
  section_number: string;
  title: string;
  division: string;
}

export function divisionFrom(num: string): string {
  const first = num.trim().split(/\s+/)[0] ?? "";
  return first.padStart(2, "0").slice(0, 2);
}

export function parseSections(text: string): ParsedSection[] {
  return text.split("\n").map((raw) => raw.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(\d{2}(?:\s?\d{2}){1,2})\s{2,}(.+)$/) ||
              line.match(/^(\d{2}(?:\s?\d{2}){1,2})\t+(.+)$/) ||
              line.match(/^(\d{2}(?:\s?\d{2}){1,2}),\s*(.+)$/);
    if (!m) return null;
    const section_number = m[1].replace(/\s+/g, " ").trim();
    return {
      section_number,
      title: m[2].trim(),
      division: divisionFrom(section_number),
    };
  }).filter((x): x is ParsedSection => x !== null);
}
