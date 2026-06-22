/**
 * Canonical change-order label (e.g. "PCO-007") — derived from the LIVE co_no
 * column so it is the single source of truth. Anything user-facing (the page
 * header, the client email subject/body, the document) should compute the label
 * from co_no via this helper rather than reading the cached spec.doc.co_label,
 * which can drift after a renumber. Format matches the generator/editor:
 * `${type}-${co_no padded to 3 digits}`.
 */
export function coLabel(coType: string | null | undefined, coNo: number | null | undefined): string {
  if (coNo == null) return "";
  return `${coType ?? "CO"}-${String(coNo).padStart(3, "0")}`;
}
