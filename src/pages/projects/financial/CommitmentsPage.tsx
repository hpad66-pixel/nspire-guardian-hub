import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useCommitments } from "@/hooks/useCommitments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CommitmentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: commitments = [], isLoading } = useCommitments(projectId ?? null);

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
          {commitments.map((c) => (
            <Link key={c.id} to={`/projects/${projectId}/financials/commitments/${c.id}`}>
              <Card className="hover:border-primary transition">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">
                      <span className="font-mono text-muted-foreground mr-2">{c.commitment_no}</span>
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {c.commitment_type.replace("_", " ")}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono">{fmt(c.original_value)}</span>
                    <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
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
