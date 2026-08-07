import { downloadPayAppPdf, payAppPdfBlob } from "@/lib/payApp/payAppPdf";

/** Rasterize the deterministic paid-invoice document for archival upload. */
export function vendorInvoicePdfBlob(node: HTMLElement): Promise<Blob> {
  return payAppPdfBlob(node);
}

/** Download a blob that was already rendered (and may also have been archived). */
export function downloadVendorInvoiceBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dedicated entry point for rasterizing the vendor-invoice document. */
export function downloadVendorInvoicePdf(node: HTMLElement, filename: string): Promise<void> {
  return downloadPayAppPdf(node, filename);
}
