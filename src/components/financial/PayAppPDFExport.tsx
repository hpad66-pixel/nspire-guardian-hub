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
import { PayApplicationDocument, type PayApplicationSpec } from "@/lib/payApp/PayApplicationDocument";
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

  const spec: PayApplicationSpec | null = pa
    ? {
        wordmark: s.wordmark || s.company_name || "APAS CONSULTING",
        footer: s.footer ?? null,
        contractor: {
          name: contract.contractor_name || s.company_name || "APAS Consulting LLC",
          address: contract.contractor_address || s.company_address || null,
          contact: contract.contractor_contact || s.company_contact || null,
          email: contract.contractor_email || s.company_email || null,
          title: s.company_title || "Authorized Representative",
        },
        owner: {
          name: contract.owner_name || "Owner",
          address: contract.owner_address || null,
          contact: contract.owner_contact || null,
          email: contract.owner_email || null,
        },
        project: { name: contract.title, address: contract.project_address || null },
        payAppNo: pa.pay_app_no,
        periodEnd: pa.period_end,
        applicationDate: (pa as any).approved_date || new Date().toISOString().slice(0, 10),
        contractNo: contract.contract_no,
        contractTitle: contract.title,
        retainagePct: Number(contract.retainage_pct ?? 0),
        g702,
        lines: lines.map((l) => ({
          item_no: l.item_no,
          description: l.description,
          unit: l.unit,
          kind: l.kind,
          scheduled_qty: l.scheduled_qty,
          scheduled_value: l.scheduled_value,
          prev_value: l.prior_value_to_date,
          this_value: l.value_this_period,
          value_to_date: l.value_to_date,
          pct: l.pct_complete,
          retainage: l.retainage,
        })),
      }
    : null;

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
