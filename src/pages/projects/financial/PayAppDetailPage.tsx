import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { usePayApp } from "@/hooks/usePayApp";
import { PayAppBuilder } from "@/components/financial/PayAppBuilder";
import { PayAppPDFExport } from "@/components/financial/PayAppPDFExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { money } from "@/lib/pdf";

export default function PayAppDetailPage() {
  const { projectId, payAppId } = useParams<{ projectId: string; payAppId: string }>();
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { detail, submit, approve, reject } = usePayApp(payAppId ?? null);
  const [approveAmount, setApproveAmount] = useState<number | "">("");

  const pa = detail.data;

  if (!pa) return <div className="p-6 text-muted-foreground">Loading pay app…</div>;
  if (!contract) return <div className="p-6 text-muted-foreground">Loading contract…</div>;

  async function doSubmit() {
    try { await submit.mutateAsync(); toast.success("Submitted"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doApprove() {
    const amt = typeof approveAmount === "number" ? approveAmount : Number(pa!.submitted_amount ?? 0);
    try { await approve.mutateAsync(amt); toast.success("Approved"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doReject() {
    if (!confirm("Reject this pay app? It will return to Draft.")) return;
    try { await reject.mutateAsync(); toast.success("Rejected"); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <Link
          to={`/projects/${projectId}/financials/prime-contract`}
          className="text-sm text-muted-foreground hover:underline"
        >← Prime Contract</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">Pay Application #{pa.pay_app_no}</h1>
            <div className="text-muted-foreground">
              Period ending {pa.period_end} · {contract.title} ({contract.contract_no})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{pa.status}</Badge>
            <PayAppPDFExport
              payAppId={pa.id}
              primeContractId={contract.id}
              contractNo={contract.contract_no}
              contractTitle={contract.title}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Submitted</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.submitted_amount ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Approved</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.approved_amount ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Retainage held</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.retainage_held ?? 0))}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line-by-line</CardTitle></CardHeader>
        <CardContent>
          <PayAppBuilder payAppId={pa.id} primeContractId={contract.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {pa.status === "draft" && (
            <Button onClick={doSubmit} disabled={submit.isPending}>Submit for review</Button>
          )}
          {pa.status === "submitted" && (
            <>
              <Input
                type="number" inputMode="decimal" step="0.01"
                placeholder="Approved amount"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value ? Number(e.target.value) : "")}
                className="w-48 font-mono"
              />
              <Button onClick={doApprove} disabled={approve.isPending}>Approve</Button>
              <Button variant="destructive" onClick={doReject} disabled={reject.isPending}>Reject</Button>
            </>
          )}
          {(pa.status === "approved" || pa.status === "paid") && (
            <div className="text-sm text-muted-foreground">
              Pay app is {pa.status}. Lines are locked; changes require a new pay app.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
