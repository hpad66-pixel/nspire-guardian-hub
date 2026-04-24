/**
 * D1 · PayAppPDFExport button.
 * Collects contract + SOV + pay-app line data, assembles the G702/G703 PDF,
 * and triggers download. Uses the shared src/lib/pdf/payApp.ts generator.
 */
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePrimeContractSov, usePrimeContractTotals } from "@/hooks/usePrimeContract";
import { usePayApp } from "@/hooks/usePayApp";
import { downloadPayAppPdf } from "@/lib/pdf/payApp";
import { toast } from "sonner";

export interface PayAppPDFExportProps {
  payAppId: string;
  primeContractId: string;
  contractNo: string;
  contractTitle: string;
  tenantName?: string;
}

export function PayAppPDFExport({
  payAppId, primeContractId, contractNo, contractTitle, tenantName,
}: PayAppPDFExportProps) {
  const { data: sov = [] } = usePrimeContractSov(primeContractId);
  const { data: totals } = usePrimeContractTotals(primeContractId);
  const { detail, lines } = usePayApp(payAppId);

  async function handleExport() {
    const pa = detail.data;
    if (!pa) { toast.error("Pay app not loaded"); return; }

    const linesByS = new Map((lines.data ?? []).map((l) => [l.sov_line_id, l]));
    const mergedLines = sov.map((s) => {
      const l = linesByS.get(s.id);
      return {
        line_no: s.line_no,
        cost_code: "",           // populated once we join cost_codes in a follow-up
        description: s.description,
        scheduled_value: Number(s.scheduled_value ?? 0),
        work_this_period: Number(l?.work_this_period ?? 0),
        materials_stored: Number(l?.materials_stored ?? 0),
        pct_complete: l?.pct_complete ?? null,
      };
    });

    try {
      await downloadPayAppPdf({
        tenantName,
        contract: {
          contract_no: contractNo,
          title: contractTitle,
          original_value: Number(totals?.original_value ?? 0),
          executed_co_value: Number(totals?.executed_co_value ?? 0),
          revised_contract_value: Number(totals?.revised_contract_value ?? 0),
          retainage_pct: 10,
        },
        payApp: {
          pay_app_no: pa.pay_app_no,
          period_end: pa.period_end,
          status: pa.status,
          submitted_amount: pa.submitted_amount,
          approved_amount: pa.approved_amount,
          retainage_held: pa.retainage_held,
        },
        lines: mergedLines,
      });
      toast.success(`Pay App ${pa.pay_app_no} exported`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1" /> Export G702/G703 PDF
    </Button>
  );
}
