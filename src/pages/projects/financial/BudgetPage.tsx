import { useParams } from "react-router-dom";
import { useActiveBudget, useBudgetMatrix, buildBudgetMatrixCsv } from "@/hooks/useBudget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: budget, create } = useActiveBudget(projectId ?? null);
  const { data: rows = [], isLoading } = useBudgetMatrix(budget?.id ?? null);

  const totals = rows.reduce(
    (acc, r) => ({
      original: acc.original + Number(r.original_budget),
      revised: acc.revised + Number(r.revised_budget),
      committed: acc.committed + Number(r.committed_cost) + Number(r.executed_cco),
      direct: acc.direct + Number(r.direct_cost),
      forecast: acc.forecast + Number(r.forecast_to_complete),
      variance: acc.variance + Number(r.variance),
    }),
    { original: 0, revised: 0, committed: 0, direct: 0, forecast: 0, variance: 0 },
  );

  async function handleCreate() {
    try {
      await create.mutateAsync("Primary Budget");
      toast.success("Budget created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function handleExport() {
    const csv = buildBudgetMatrixCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-matrix-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!budget) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <h1 className="text-3xl font-bold">Budget</h1>
        <Card className="mt-4">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-muted-foreground">No active budget for this project yet.</div>
            <Button onClick={handleCreate}>Create Primary Budget</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget</h1>
          <p className="text-muted-foreground">{budget.name} · the single source of truth.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
        {[
          ["Original", totals.original],
          ["Revised", totals.revised],
          ["Committed", totals.committed],
          ["Direct", totals.direct],
          ["Forecast", totals.forecast],
          ["Variance", totals.variance],
        ].map(([label, val]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-1 px-3 pt-3"><CardTitle className="text-xs uppercase">{label}</CardTitle></CardHeader>
            <CardContent className={`px-3 pb-3 font-mono ${Number(val) < 0 && label === "Variance" ? "text-destructive" : ""}`}>
              {fmt(Number(val))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Matrix</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No budget lines yet. Add cost codes to start tracking.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost code</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Mods</TableHead>
                  <TableHead className="text-right">Revised</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">CCO</TableHead>
                  <TableHead className="text-right">Direct</TableHead>
                  <TableHead className="text-right">Exposure</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const over = Number(r.variance) < 0;
                  return (
                    <TableRow key={r.cost_code_id} className={over ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono">
                        <span className="text-muted-foreground mr-2">{r.cost_code}</span>
                        <span className="text-xs">{r.cost_code_desc}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.original_budget))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.approved_budget_mods))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.revised_budget))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.committed_cost))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.executed_cco))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.direct_cost))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.pending_exposure))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.forecast_to_complete))}</TableCell>
                      <TableCell className={`text-right font-mono ${over ? "text-destructive" : ""}`}>
                        {fmt(Number(r.variance))}
                        {over && <Badge variant="destructive" className="ml-2">Over</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
