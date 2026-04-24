/**
 * D4 · CoPdfExport — G701 Change Order PDF button.
 * Wires the existing src/lib/pdf/changeOrder.ts generator to a real CO row.
 */
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useChangeOrderLines, type ChangeOrder } from "@/hooks/useProcoreChangeOrders";
import { downloadChangeOrderPdf } from "@/lib/pdf/changeOrder";
import { toast } from "sonner";

export function CoPdfExport({ co, tenantName }: { co: ChangeOrder; tenantName?: string }) {
  const { data: lines = [] } = useChangeOrderLines(co.id);

  async function handleExport() {
    try {
      await downloadChangeOrderPdf({
        tenantName,
        co: {
          co_no: co.co_no ?? 0,
          co_type: co.co_type ?? "PCO",
          title: co.title,
          description: co.description,
          amount: Number(co.amount),
          days_impact: co.days_impact,
          status: co.status,
          reason_code: co.reason_code,
          executed_date: co.executed_date,
        },
        lines: lines.map((l) => ({
          cost_code: l.cost_code_id.slice(0, 8),
          description: l.description,
          amount: Number(l.amount),
        })),
      });
      toast.success(`${co.co_type}-${co.co_no} exported`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1" /> Export G701 PDF
    </Button>
  );
}
