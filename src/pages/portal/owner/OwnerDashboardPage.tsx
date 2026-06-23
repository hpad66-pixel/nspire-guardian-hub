import { useOwnerPortalData } from "@/hooks/usePortals";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { financialSummary } from "@/lib/reports/financialReports";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, Calendar, BarChart3, FolderOpen, Megaphone } from "lucide-react";

/** Most recent published client briefing, shown front and center. */
function LatestUpdateCard({ projectId }: { projectId: string | null }) {
  const { data: updates = [] } = useClientUpdates(projectId, { publishedOnly: true });
  const latest = updates[0];
  if (!latest) return null;
  return (
    <Card className="mb-6 border-[var(--apas-sapphire)]/30">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-[var(--apas-sapphire)]" /> Latest update</CardTitle>
        <Button asChild variant="ghost" size="sm"><Link to="/owner-portal/updates">All updates →</Link></Button>
      </CardHeader>
      <CardContent><ClientUpdateView update={latest} /></CardContent>
    </Card>
  );
}

function fmt(n: number | null | undefined) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Owner-safe financial health: contract, billings, retainage, balance — NO sub costs. */
function OwnerFinancialHealth({ projectId }: { projectId: string | null }) {
  const { data } = useFinancialReportData(projectId);
  if (!data) return null;
  const s = financialSummary(data);
  const pct = Math.min(100, Math.max(0, s.pctComplete));
  const cells: Array<[string, string, string?]> = [
    ["Revised Contract", fmt(s.revisedValue)],
    ["Billed to Date", fmt(s.billedToDate), "text-[var(--apas-sapphire)]"],
    ["Retainage Held", fmt(s.retainageHeld), "text-[var(--apas-amber)]"],
    ["Balance to Finish", fmt(s.balanceToFinish), "text-[var(--apas-emerald)]"],
  ];
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2"><CardTitle className="text-base">Project financial health</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {cells.map(([label, value, cls]) => (
            <div key={label}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`text-2xl font-bold ${cls ?? ""}`}>{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Contract complete</span><span>{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[var(--apas-sapphire)] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerDashboardPage() {
  const { data, isLoading } = useOwnerPortalData();
  const projectId = (data?.primeContracts as any[] | undefined)?.[0]?.project_id ?? null;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Owner Portal</h1>
      <p className="text-muted-foreground mb-6">Prime contract, change orders, pay apps.</p>

      <LatestUpdateCard projectId={projectId} />
      <OwnerFinancialHealth projectId={projectId} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Contracts</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.primeContracts.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Pending OCOs</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.pendingOcos.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Pending Pay Apps</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.pendingPayApps.length ?? 0}</CardContent></Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        <Button asChild variant="outline">
          <Link to="/owner-portal/updates"><Megaphone className="h-4 w-4 mr-1" /> Updates</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/owner-portal/contract"><FileText className="h-4 w-4 mr-1" /> Contracts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/owner-portal/schedule"><Calendar className="h-4 w-4 mr-1" /> Schedule</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/owner-portal/reports"><BarChart3 className="h-4 w-4 mr-1" /> Reports</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/owner-portal/documents"><FolderOpen className="h-4 w-4 mr-1" /> Documents</Link>
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
                  to={`/owner-portal/cos/${co.id}`}
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
                  to={`/owner-portal/pay-apps/${pa.id}`}
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
