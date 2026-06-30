import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useCommitments, useCommitmentTotalsMap } from "@/hooks/useCommitments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CommitmentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: commitments = [], isLoading } = useCommitments(projectId ?? null);
  const { data: totals = {} } = useCommitmentTotalsMap(commitments.map((c) => c.id));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <FinancialSubNav />
      <h1 className="text-3xl font-bold mb-1">Commitments</h1>
      <p className="text-muted-foreground mb-6">Subcontracts and purchase orders.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : commitments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No commitments yet.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {commitments.map((c) => {
            const t = totals[c.id];
            const cos = Number(t?.executed_cco_value ?? 0);
            const revised = Number(t?.revised_commitment_value ?? c.original_value);
            const billed = Number(t?.billed_to_date ?? 0);
            return (
            <Link key={c.id} to={`/projects/${projectId}/financials/commitments/${c.id}`}>
              <Card className="hover:border-primary transition">
                <CardContent className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      <span className="font-mono text-muted-foreground mr-2">{c.commitment_no}</span>
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {c.commitment_type.replace("_", " ")}
                      {cos !== 0 && <span className="ml-2 text-[var(--apas-sapphire)]">incl. {fmt(cos)} in change orders</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-semibold">{fmt(revised)}</div>
                      <div className="text-[11px] text-muted-foreground">{cos !== 0 ? `revised (orig ${fmt(c.original_value)})` : "commitment value"}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-emerald-600">{fmt(billed)}</div>
                      <div className="text-[11px] text-muted-foreground">invoiced</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );})}
        </div>
      )}
    </div>
  );
}
