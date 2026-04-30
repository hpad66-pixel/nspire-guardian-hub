import { useOwnerPortalData } from "@/hooks/usePortals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, Calendar, BarChart3 } from "lucide-react";

function fmt(n: number | null | undefined) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function OwnerDashboardPage() {
  const { data, isLoading } = useOwnerPortalData();

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

      <div className="grid grid-cols-4 gap-2 mb-6">
        <Button asChild variant="outline">
          <Link to="/portal/owner/contract"><FileText className="h-4 w-4 mr-1" /> Contracts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/portal/owner/schedule"><Calendar className="h-4 w-4 mr-1" /> Schedule</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/portal/owner/reports"><BarChart3 className="h-4 w-4 mr-1" /> Reports</Link>
        </Button>
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
                <Link
                  key={co.id}
                  to={`/portal/owner/cos/${co.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted px-2 rounded -mx-2"
                >
                  <div>
                    <div className="font-medium">
                      <span className="font-mono text-muted-foreground mr-2">OCO-{co.co_no}</span>
                      {co.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{co.reason_code ?? ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{fmt(co.amount)}</span>
                    <Button size="sm">Review & sign</Button>
                  </div>
                </Link>
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
                <Link
                  key={pa.id}
                  to={`/portal/owner/pay-apps/${pa.id}`}
                  className="flex items-center justify-between py-2 hover:bg-muted px-2 rounded -mx-2"
                >
                  <div>
                    <span className="font-mono mr-2">Pay App #{pa.pay_app_no}</span>
                    <span className="text-muted-foreground">period end {pa.period_end}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{fmt(pa.submitted_amount)}</span>
                    <Badge variant="outline">{pa.status}</Badge>
                    <Button size="sm">Review</Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
