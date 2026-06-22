/**
 * F2 · Owner portal — approve or reject a Change Order with e-signature.
 *
 * Flow:
 *   1. Owner reviews the CO header + lines + peer CCO (if present)
 *   2. Draws signature in ESignaturePad → uploads PNG to owner-signatures
 *      bucket → returns storage path
 *   3. Click Approve → calls owner_approve_oco RPC with signature_path
 *      (which flips co_type='OCO', status='executed', stamps executed_date,
 *      writes owner_audit_log row)
 *   4. Reject path prompts for reason and calls owner_reject_oco RPC
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerApproveOco, useOwnerRejectOco } from "@/hooks/usePortals";
import { useChangeOrderLines } from "@/hooks/useProcoreChangeOrders";
import { ESignaturePad } from "@/components/portal/ESignaturePad";
import { CoPdfExport } from "@/components/financial/CoPdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

export default function OwnerOcoApprovalPage() {
  const { coId } = useParams<{ coId: string }>();
  const navigate = useNavigate();

  const { data: co } = useQuery({
    queryKey: ["co", coId],
    enabled: Boolean(coId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any).select("*")
        .eq("id", coId!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: lines = [] } = useChangeOrderLines(coId ?? null);
  const approve = useOwnerApproveOco();
  const reject = useOwnerRejectOco();
  const [sigPath, setSigPath] = useState<string | null>(null);

  if (!co) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const alreadyDecided = co.status === "executed" || co.status === "rejected";
  const canApprove = !alreadyDecided && sigPath !== null;

  async function handleApprove() {
    if (!sigPath) { toast.error("Sign first"); return; }
    try {
      await approve.mutateAsync({ coId: co.id, signaturePath: sigPath });
      toast.success(`OCO-${co.co_no} approved and executed`);
      navigate("/owner-portal");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleReject() {
    const reason = prompt("Rejection reason (required):") ?? "";
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    try {
      await reject.mutateAsync({ coId: co.id, reason: reason.trim() });
      toast.success("Rejected");
      navigate("/owner-portal");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">
          ← Owner dashboard
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">
                {co.co_type}-{String(co.co_no).padStart(4, "0")}
              </span>
              {co.title}
            </h1>
            {co.description && (
              <div className="text-muted-foreground mt-1 max-w-3xl">{co.description}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{co.status}</Badge>
            <CoPdfExport co={co} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Amount</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(co.amount))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Days impact</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{co.days_impact}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Reason</CardTitle></CardHeader>
          <CardContent className="text-sm">{co.reason_code ?? "—"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-muted-foreground text-sm">No lines.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-medium">Cost code</th>
                  <th className="p-2 text-left font-medium">Description</th>
                  <th className="p-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      {l.cost_code_id.slice(0, 8)}
                    </td>
                    <td className="p-2">{l.description}</td>
                    <td className="p-2 text-right font-mono">{money(Number(l.amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 font-medium">
                <tr className="border-t">
                  <td colSpan={2} className="p-2 text-right">Total</td>
                  <td className="p-2 text-right font-mono">
                    {money(lines.reduce((s, l) => s + Number(l.amount), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {!alreadyDecided && (
        <Card>
          <CardHeader><CardTitle>Sign & approve</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Drawing a signature below is required before approval. Signature is
              stored in the owner-signatures bucket and referenced in the audit log.
            </p>
            <ESignaturePad
              onSigned={(path) => {
                setSigPath(path);
                toast.success("Signature saved");
              }}
              onCleared={() => setSigPath(null)}
            />
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleApprove}
                disabled={!canApprove || approve.isPending}
              >
                {approve.isPending ? "Approving…" : "Approve"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={reject.isPending}
              >
                Reject
              </Button>
            </div>
            {!sigPath && (
              <p className="text-xs text-muted-foreground">
                Sign above and click "Save signature" to enable the Approve button.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {alreadyDecided && (
        <Card>
          <CardContent className="p-6 text-center">
            <Badge variant={co.status === "executed" ? "default" : "destructive"}>
              {co.status === "executed" ? "Executed" : "Rejected"}
            </Badge>
            {co.executed_date && (
              <div className="text-sm text-muted-foreground mt-2">
                Executed {co.executed_date}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
