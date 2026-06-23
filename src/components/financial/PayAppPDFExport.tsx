/**
 * PayAppPDFExport — assembles the branded AIA G702/G703 "Application and
 * Certificate for Payment" (parties, G702 cover, contractor certification +
 * signature, and the G703 quantity continuation) from the live continuation
 * data, renders it off-screen, and downloads a paginated PDF.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePayAppContinuation } from "@/hooks/usePayAppContinuation";
import { useCoSettings } from "@/hooks/useCoSettings";
import { PayApplicationDocument } from "@/lib/payApp/PayApplicationDocument";
import { buildPayAppSpec } from "@/lib/payApp/buildSpec";
import { downloadPayAppPdf } from "@/lib/payApp/payAppPdf";
import type { PrimeContract } from "@/hooks/usePrimeContract";

export interface PayAppPDFExportProps {
  payAppId: string;
  projectId: string;
  contract: PrimeContract;
}

export function PayAppPDFExport({ payAppId, contract }: PayAppPDFExportProps) {
  const { detail, lines, g702 } = usePayAppContinuation(payAppId);
  const { data: coSettings } = useCoSettings();
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const pa = detail.data;
  const s: any = coSettings ?? {};

  const spec = pa ? buildPayAppSpec(pa, contract, s, g702, lines) : null;

  async function handleExport() {
    if (!docRef.current || !spec) { toast.error("Pay app not loaded"); return; }
    setBusy(true);
    try {
      await downloadPayAppPdf(docRef.current, `pay-app-${spec.payAppNo}-${contract.contract_no || "g702"}.pdf`);
      toast.success(`Pay App #${spec.payAppNo} exported.`);
    } catch (e: any) {
      toast.error(`PDF failed: ${e.message}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={busy || !spec} onClick={handleExport}>
        <Download className="h-4 w-4 mr-1" />{busy ? "Exporting…" : "Export G702/G703 PDF"}
      </Button>
      {/* Off-screen render target for rasterization */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none", opacity: 0 }} aria-hidden>
        {spec && <PayApplicationDocument ref={docRef} spec={spec} />}
      </div>
    </>
  );
}
