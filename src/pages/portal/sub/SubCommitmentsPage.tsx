/**
 * F1 · Sub portal — list commitments where the logged-in sub's org is the vendor.
 * RLS (commitments_sub_portal_select) already filters by current_user_orgs(); this
 * page just renders whatever comes back.
 */
import { Link } from "react-router-dom";
import { useSubPortalData } from "@/hooks/usePortals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";

export default function SubCommitmentsPage() {
  const { data, isLoading } = useSubPortalData();
  const commitments = (data?.commitments ?? []) as any[];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">My commitments</h1>
      <p className="text-muted-foreground mb-6">
        Subcontracts and purchase orders where your organization is the vendor.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : commitments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No commitments yet. When the GC issues a subcontract or PO to your org, it appears here.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {commitments.map((c) => (
            <Link key={c.id} to={`/portal/sub/commitments/${c.id}`}>
              <Card className="hover:border-primary transition">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">
                      <span className="font-mono text-muted-foreground mr-2">{c.commitment_no}</span>
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {String(c.commitment_type).replace("_", " ")}
                      {c.executed_date && ` · executed ${c.executed_date}`}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono">{money(Number(c.original_value))}</span>
                    <Badge variant="outline" className="capitalize">
                      {String(c.status).replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
