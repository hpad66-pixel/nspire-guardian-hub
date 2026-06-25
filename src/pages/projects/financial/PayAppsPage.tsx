import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ExternalLink, FileText, Trash2 } from "lucide-react";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract, usePayApps } from "@/hooks/usePrimeContract";
import { useGeneratePayApp } from "@/hooks/usePayAppContinuation";
import { useDeletePayApp } from "@/hooks/usePayApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PayAppStatusSelect } from "@/components/financial/PayAppStatusSelect";

const fmt2 = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—");

export default function PayAppsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contract, isLoading } = usePrimeContract(projectId ?? null);
  const { data: payApps = [] } = usePayApps(contract?.id ?? null);
  const generate = useGeneratePayApp(contract?.id ?? null, projectId ?? null);
  const del = useDeletePayApp();
  const [creating, setCreating] = useState(false);

  function deleteDraft(e: React.MouseEvent, pa: any) {
    e.stopPropagation();
    if (!window.confirm(`Delete draft Pay App #${pa.pay_app_no}? This cannot be undone.`)) return;
    del.mutate(pa.id, {
      onSuccess: () => toast.success(`Deleted draft Pay App #${pa.pay_app_no}.`),
      onError: (err: any) => toast.error(err.message),
    });
  }

  async function generatePayApp() {
    setCreating(true);
    try {
      const res = await generate.mutateAsync({});
      toast.success(`Pay App #${res.payAppNo} generated — ${res.lineCount} SOV lines seeded from the contract + approved change orders.`);
      window.location.href = `/projects/${projectId}/financials/prime-contract/pay-apps/${res.payAppId}`;
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2">
          <FileText className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Pay Applications</h1>
            <p className="text-muted-foreground text-sm">
              Bill the client (owner) against the prime contract. Generate the next pay app from the
              Schedule of Values + approved change orders, then enter this period&apos;s quantities.
            </p>
          </div>
        </div>
        {contract && (
          <Button onClick={generatePayApp} disabled={creating} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />{creating ? "Generating…" : "Generate Pay App"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !contract ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No prime contract yet for this project — create one on the{" "}
          <a className="underline" href={`/projects/${projectId}/financials/prime-contract`}>Prime Contract</a> tab first.
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{contract.title} · {contract.contract_no}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3">#</th><th className="text-left p-3">Period ending</th>
                <th className="text-right p-3">Submitted</th><th className="text-right p-3">Approved</th>
                <th className="text-center p-3">Status</th><th className="p-3" />
              </tr></thead>
              <tbody>
                {(payApps as any[]).length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No pay apps yet. Click <strong>Generate Pay App</strong> to create the first one from the SOV.
                  </td></tr>
                )}
                {(payApps as any[]).map((pa) => (
                  <tr key={pa.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => (window.location.href = `/projects/${projectId}/financials/prime-contract/pay-apps/${pa.id}`)}>
                    <td className="p-3 font-mono font-medium">#{pa.pay_app_no}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(pa.period_end)}</td>
                    <td className="p-3 text-right font-mono">{fmt2(pa.submitted_amount)}</td>
                    <td className="p-3 text-right font-mono">{fmt2(pa.approved_amount)}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <PayAppStatusSelect payAppId={pa.id} value={pa.status} />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {pa.status === "draft" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-[var(--apas-rose)]"
                            disabled={del.isPending}
                            title="Delete draft"
                            onClick={(e) => deleteDraft(e, pa)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
