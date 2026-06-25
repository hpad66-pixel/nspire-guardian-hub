import { useParams, useNavigate } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus } from "lucide-react";
import { useLienReleases, type LienRelease } from "@/hooks/useLienReleases";

type LienReleaseRow = LienRelease & { spec?: unknown; claimant_name?: string | null };

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground", submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-800", void: "bg-muted text-muted-foreground",
};

export default function LienReleasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: releases = [], submitForApproval, approve, reject } = useLienReleases(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Lien Releases</h1>
            <p className="text-muted-foreground text-sm">
              Inbound waivers from subs (gate AP payment) and outbound waivers we issue to the owner.
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/financials/lien-releases/new`)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />New Waiver
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3">Direction</th><th className="p-3">Type</th><th className="p-3">Through</th>
                <th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No lien releases yet.</td></tr>}
              {(releases as unknown as LienReleaseRow[]).map((r) => {
                const isWaiver = !!r.spec;
                const open = () => navigate(`/projects/${projectId}/financials/lien-releases/${r.id}`);
                return (
                <tr key={r.id} className={`border-t hover:bg-muted/20 ${isWaiver ? "cursor-pointer" : ""}`} onClick={isWaiver ? open : undefined}>
                  <td className="p-3"><Badge variant="outline">{r.direction}</Badge></td>
                  <td className="p-3">{r.claimant_name ? <span><span className="font-medium">{r.claimant_name}</span> · </span> : null}{r.release_type.replace(/_/g, " ")}</td>
                  <td className="p-3">{r.through_date ?? "—"}</td>
                  <td className="p-3 text-right">{fmt(r.amount)}</td>
                  <td className="p-3"><Badge className={STATUS_COLOR[r.status] ?? ""}>{r.status}</Badge></td>
                  <td className="p-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {isWaiver ? (
                      <Button size="sm" variant="outline" onClick={open}>Open</Button>
                    ) : (
                      <>
                        {r.status === "pending" && <Button size="sm" variant="outline" onClick={() => submitForApproval.mutate(r)}>Submit</Button>}
                        {(r.status === "pending" || r.status === "submitted") && (
                          <>
                            <Button size="sm" onClick={() => approve.mutate(r)}>Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => reject.mutate(r)}>Reject</Button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
