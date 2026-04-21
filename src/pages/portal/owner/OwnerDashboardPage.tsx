import { useOwnerPortalData, useOwnerApproveOco, useOwnerRejectOco } from "@/hooks/usePortals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function fmt(n: number | null | undefined) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function OwnerDashboardPage() {
  const { data, isLoading } = useOwnerPortalData();
  const approve = useOwnerApproveOco();
  const reject = useOwnerRejectOco();

  async function handleApprove(coId: string) {
    try {
      await approve.mutateAsync({ coId });
      toast.success("OCO approved");
    } catch (e: any) { toast.error(e.message); }
  }
  async function handleReject(coId: string) {
    const reason = prompt("Rejection reason?") ?? "";
    if (!reason) return;
    try {
      await reject.mutateAsync({ coId, reason });
      toast.success("OCO rejected");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Owner Portal</h1>
      <p className="text-muted-foreground mb-6">Prime contract, change orders, pay apps.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Contracts</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.primeContracts.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Pending OCOs</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.pendingOcos.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Pending Pay Apps</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.pendingPayApps.length ?? 0}</CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Next up — OCOs awaiting your approval</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : !data?.pendingOcos.length ? (
            <div className="text-muted-foreground">Nothing pending.</div>
          ) : (
            <div className="divide-y">
              {(data.pendingOcos as any[]).map((co) => (
                <div key={co.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">
                      <span className="font-mono text-muted-foreground mr-2">OCO-{co.co_no}</span>
                      {co.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{co.reason_code ?? ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{fmt(co.amount)}</span>
                    <Button size="sm" onClick={() => handleApprove(co.id)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(co.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Next up — Pay apps awaiting review</CardTitle></CardHeader>
        <CardContent>
          {!data?.pendingPayApps.length ? (
            <div className="text-muted-foreground">Nothing pending.</div>
          ) : (
            <div className="divide-y">
              {(data.pendingPayApps as any[]).map((pa) => (
                <div key={pa.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-mono mr-2">Pay App #{pa.pay_app_no}</span>
                    <span className="text-muted-foreground">period end {pa.period_end}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{fmt(pa.submitted_amount)}</span>
                    <Badge variant="outline">{pa.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
