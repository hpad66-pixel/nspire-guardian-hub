/**
 * F2 · Owner portal — exec-scope reports only.
 * Filters useProcoreReports() to reports where scope='tenant' AND owner_user_id
 * belongs to the GC (RLS already scopes; we additionally filter client-side to
 * exec-prefixed names to keep the owner UI uncluttered).
 */
import { Link } from "react-router-dom";
import { useProcoreReports } from "@/hooks/useProcoreReports";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const EXEC_WHITELIST = new Set([
  "budget_matrix", "pay_apps", "change_orders",
]);

export default function OwnerReportsPage() {
  const { data: reports = [], isLoading, run } = useProcoreReports();
  const exec = reports.filter(
    (r) => r.scope === "tenant" && EXEC_WHITELIST.has(r.data_source),
  );

  async function handleRun(id: string) {
    try {
      const r = await run.mutateAsync(id);
      toast.success(`Report ran — ${(r as any)?.rows ?? 0} rows`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">
        ← Owner dashboard
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">Executive reports</h1>
      <p className="text-muted-foreground mb-6">
        Pre-built reports focused on contract value, change orders, pay app history,
        and project budget summaries.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : exec.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No executive-scope reports published yet. Ask your GC to publish budget /
          pay app / change-order reports at tenant scope.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {exec.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.data_source} · updated {new Date(r.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">{r.scope}</Badge>
                  <Button size="sm" variant="outline" onClick={() => handleRun(r.id)}>
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
