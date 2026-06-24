import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { usePayApp, useDeletePayApp } from "@/hooks/usePayApp";
import { usePayAppContinuation } from "@/hooks/usePayAppContinuation";
import { usePrimeContractPayments } from "@/hooks/usePrimeContractPayments";
import { RecordPrimePaymentDialog } from "@/components/financial/RecordPrimePaymentDialog";
import { AllocatePaymentDialog } from "@/components/financial/AllocatePaymentDialog";
import { useAllocationTargets, usePaymentAllocations, type AllocationTargets } from "@/hooks/usePaymentAllocations";
import { ReconciledStamp } from "@/components/financial/ReconciledStamp";
import { LienReleasePanel } from "@/components/financial/LienReleasePanel";
import { PayAppContinuationBuilder } from "@/components/financial/PayAppContinuationBuilder";
import { PayAppStatusSelect } from "@/components/financial/PayAppStatusSelect";
import { PayAppPDFExport } from "@/components/financial/PayAppPDFExport";
import { PayAppSignSendDialog } from "@/components/financial/PayAppSignSendDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { money } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentField } from "@/components/common/AttachmentField";
import { Trash2 } from "lucide-react";

export default function PayAppDetailPage() {
  const { projectId, payAppId } = useParams<{ projectId: string; payAppId: string }>();
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { detail, approve, reject } = usePayApp(payAppId ?? null);
  const { submit } = usePayAppContinuation(payAppId ?? null);
  const del = useDeletePayApp();
  const { data: payments = [] } = usePrimeContractPayments(payAppId ?? null);
  const [approveAmount, setApproveAmount] = useState<number | "">("");
  const [payOpen, setPayOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [allocPayment, setAllocPayment] = useState<any>(null);
  const { data: allocTargets } = useAllocationTargets(contract?.id ?? null);

  const pa = detail.data;

  if (!pa) return <div className="p-6 text-muted-foreground">Loading pay app…</div>;
  if (!contract) return <div className="p-6 text-muted-foreground">Loading contract…</div>;

  async function doSubmit() {
    try { await submit.mutateAsync(); toast.success("Submitted — G702 cover saved."); }
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
  async function doDelete() {
    if (!pa) return;
    if (!confirm(`Delete draft Pay App #${pa.pay_app_no}? This cannot be undone.`)) return;
    try {
      await del.mutateAsync(pa.id);
      toast.success(`Deleted draft Pay App #${pa.pay_app_no}.`);
      window.location.href = `/projects/${projectId}/financials/pay-apps`;
    } catch (e: any) { toast.error(e.message); }
  }
  async function setPayAppPdf(url: string | null) {
    const { error } = await supabase.from("prime_contract_pay_apps" as any).update({ pdf_path: url }).eq("id", payAppId!);
    if (error) throw error;
    await detail.refetch();
    if (url && payAppId) await syncQuantities(true);
  }

  // Parse the G703 in the attached PDF → sov_line_items / pay_app_line_progress,
  // so the Quantities & Progress dashboard auto-updates from this pay app.
  async function syncQuantities(silent = false) {
    if (!payAppId) return;
    setSyncing(true);
    const t = toast.loading("Reading quantities from the pay-app PDF…");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("extract-payapp-lines", { body: { payAppId } });
      if (fnErr) throw fnErr;
      const d = data as any;
      if (d?.ok) toast.success(`Quantities updated — ${d.sov_lines_upserted} lines from Pay App #${d.pay_app_no}.`, { id: t });
      else toast.error(`Quantity sync: ${d?.error ?? "no G703 lines found"}`, { id: t });
    } catch (e: any) {
      if (!silent) toast.error(`Quantity sync failed: ${e.message}`, { id: t });
      else toast.dismiss(t);
    } finally {
      setSyncing(false);
    }
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
            <PayAppStatusSelect payAppId={pa.id} value={pa.status} />
            <PayAppPDFExport payAppId={pa.id} projectId={projectId ?? ""} contract={contract} />
            <PayAppSignSendDialog payAppId={pa.id} contract={contract} />
          </div>
        </div>
        {((pa as any).sent_for_review_at || (pa as any).signed_at) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {(pa as any).signed_at && (
              <Badge variant="outline">
                Signed by {(pa as any).signed_name || "contractor"} · {String((pa as any).signed_at).slice(0, 10)}
              </Badge>
            )}
            {(pa as any).sent_for_review_at && (
              <Badge variant="outline" className="text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/40">
                Draft sent to {(pa as any).sent_for_review_to || "client"} · {String((pa as any).sent_for_review_at).slice(0, 10)}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Submitted</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.submitted_amount ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Approved</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.approved_amount ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Retainage held</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.retainage_held ?? 0))}</CardContent></Card>
      </div>

      {/* Original AIA G702 summary (from the submitted PDF) */}
      {(pa as any).pay_app_data && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">AIA G702 Summary (as submitted)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["1. Original Contract Sum", (pa as any).pay_app_data.original_contract_sum],
                  ["2. Net change by change orders", (pa as any).pay_app_data.net_change_orders],
                  ["3. Contract Sum to date", (pa as any).pay_app_data.contract_sum_to_date],
                  ["4. Total completed & stored to date", (pa as any).pay_app_data.completed_stored_to_date],
                  ["5. Retainage", (pa as any).pay_app_data.retainage_total],
                  ["6. Total earned less retainage", (pa as any).pay_app_data.total_earned_less_retainage],
                  ["7. Less previous certificates", (pa as any).pay_app_data.less_previous_certificates],
                  ["8. Current payment due", (pa as any).pay_app_data.current_payment_due],
                  ["9. Balance to finish", (pa as any).pay_app_data.balance_to_finish],
                ].map(([label, val]: any, i) => (
                  <tr key={i} className={`border-t ${String(label).startsWith("8.") ? "font-bold bg-[var(--apas-sapphire)]/5" : ""}`}>
                    <td className="py-2 pr-3">{label}</td>
                    <td className="py-2 text-right font-mono">{money(Number(val ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pay application document — view, print, upload, or replace */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Pay Application (PDF)</CardTitle>
            {(pa as any).pdf_path && (
              <Button variant="outline" size="sm" disabled={syncing} onClick={() => syncQuantities(false)}>
                {syncing ? "Syncing…" : "Sync quantities"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The signed AIA G702/G703. Attaching it auto-updates the project&apos;s Quantities &amp; Progress from the G703.
          </p>
        </CardHeader>
        <CardContent>
          <AttachmentField
            url={(pa as any).pdf_path}
            onChange={setPayAppPdf}
            projectId={projectId ?? ""}
            folder="pay-apps"
            label="Pay application"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule of Values — this application</CardTitle></CardHeader>
        <CardContent>
          <PayAppContinuationBuilder payAppId={pa.id} projectId={projectId ?? ""} primeContractId={contract.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {pa.status === "draft" && (
            <>
              <Button onClick={doSubmit} disabled={submit.isPending}>Submit for review</Button>
              <Button variant="outline" className="text-[var(--apas-rose)] hover:text-[var(--apas-rose)]" onClick={doDelete} disabled={del.isPending}>
                <Trash2 className="h-4 w-4 mr-1.5" />Delete draft
              </Button>
            </>
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

      {/* AR payments received against this pay app */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Payments Received</CardTitle>
          {(pa.status === "approved" || pa.status === "paid") && (
            <Button size="sm" onClick={() => setPayOpen(true)}>Record payment</Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {pa.status === "approved" || pa.status === "paid"
                ? "No payments recorded yet."
                : "Approve the pay app to record payments."}
            </div>
          ) : (
            <div className="divide-y text-sm">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} targets={allocTargets} onAllocate={setAllocPayment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outbound lien waivers we issue to the owner for this pay app */}
      <LienReleasePanel projectId={projectId!} direction="outbound" payAppId={pa.id} />

      <RecordPrimePaymentDialog open={payOpen} onOpenChange={setPayOpen} payAppId={pa.id} />
      <AllocatePaymentDialog
        open={Boolean(allocPayment)}
        onOpenChange={(v) => { if (!v) setAllocPayment(null); }}
        payment={allocPayment}
        primeContractId={contract.id}
      />
    </div>
  );
}

function allocLabel(a: { kind: string; change_order_id: string | null; sov_line_item_id: string | null }, targets?: AllocationTargets): string {
  if (a.kind === "base") return "Base contract";
  if (a.kind === "change_order") {
    const c = targets?.changeOrders.find((x) => x.id === a.change_order_id);
    return c ? `${c.co_type}-${String(c.co_no).padStart(3, "0")}` : "Change order";
  }
  const l = targets?.lineItems.find((x) => x.id === a.sov_line_item_id);
  return l ? `Line #${l.item_no}` : "Line item";
}

function PaymentRow({ payment, targets, onAllocate }: {
  payment: any; targets?: AllocationTargets; onAllocate: (p: any) => void;
}) {
  const { data: allocs = [] } = usePaymentAllocations(payment.id);
  const allocatedSum = allocs.reduce((s, a) => s + Number(a.amount), 0);
  const reconciled = allocs.length > 0 && Math.abs(allocatedSum - Number(payment.amount)) < 0.01;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono mr-2">{payment.received_date}</span>
          <span className="text-muted-foreground">{payment.method ?? ""} {payment.reference ?? ""}</span>
        </div>
        <div className="flex items-center gap-3">
          {reconciled
            ? <ReconciledStamp amount={Number(payment.amount)} />
            : <span className="font-mono">{money(Number(payment.amount))}</span>}
          <Button size="sm" variant="outline" onClick={() => onAllocate(payment)}>
            {allocs.length ? "Edit split" : "Allocate"}
          </Button>
        </div>
      </div>
      {allocs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {allocs.map((a) => (
            <Badge key={a.id} variant="outline" className="text-[10px] font-normal">
              {allocLabel(a, targets)} · {money(Number(a.amount))}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
