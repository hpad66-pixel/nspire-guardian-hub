import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  useActiveBudget, useBudgetMatrix, useBudgetModifications, buildBudgetMatrixCsv,
} from "@/hooks/useBudget";
import { BudgetMatrixGrid } from "@/components/financial/BudgetMatrixGrid";
import { BudgetModificationDialog } from "@/components/financial/BudgetModificationDialog";
import { BudgetSnapshotDialog } from "@/components/financial/BudgetSnapshotDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Plus, Camera } from "lucide-react";
import { toast } from "sonner";
import { money } from "@/lib/pdf";

export default function BudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: budget, create } = useActiveBudget(projectId ?? null);
  const { data: rows = [], isLoading } = useBudgetMatrix(budget?.id ?? null);
  const { data: mods = [], approve } = useBudgetModifications(budget?.id ?? null);

  const [modOpen, setModOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);

  const totals = rows.reduce(
    (acc, r) => ({
      original: acc.original + Number(r.original_budget),
      revised:  acc.revised + Number(r.revised_budget),
      committed: acc.committed + Number(r.committed_cost) + Number(r.executed_cco),
      direct:   acc.direct + Number(r.direct_cost),
      forecast: acc.forecast + Number(r.forecast_to_complete),
      variance: acc.variance + Number(r.variance),
    }),
    { original: 0, revised: 0, committed: 0, direct: 0, forecast: 0, variance: 0 },
  );

  async function handleCreateBudget() {
    try {
      await create.mutateAsync("Primary Budget");
      toast.success("Budget created");
    } catch (e: any) { toast.error(e.message); }
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

  async function handleApprove(modId: string) {
    if (!confirm("Approve this budget modification? Transfers apply immediately.")) return;
    try {
      await approve.mutateAsync(modId);
      toast.success("Modification approved");
    } catch (e: any) { toast.error(e.message); }
  }

  if (!budget) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <h1 className="text-3xl font-bold">Budget</h1>
        <Card className="mt-4">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-muted-foreground">No active budget for this project yet.</div>
            <Button onClick={handleCreateBudget}>Create Primary Budget</Button>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New modification
          </Button>
          <Button variant="outline" onClick={() => setSnapOpen(true)}>
            <Camera className="h-4 w-4 mr-1" /> Snapshot
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
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
            <CardHeader className="pb-1 px-3 pt-3">
              <CardTitle className="text-xs uppercase">{label}</CardTitle>
            </CardHeader>
            <CardContent className={`px-3 pb-3 font-mono ${Number(val) < 0 && label === "Variance" ? "text-destructive" : ""}`}>
              {money(Number(val))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="mods">Modifications · {mods.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <Card>
            <CardHeader><CardTitle>Cost-code matrix</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-muted-foreground">Loading…</div>
              ) : (
                <BudgetMatrixGrid rows={rows} projectId={projectId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mods">
          <Card>
            <CardHeader><CardTitle>Modifications history</CardTitle></CardHeader>
            <CardContent>
              {mods.length === 0 ? (
                <div className="text-muted-foreground">No modifications yet.</div>
              ) : (
                <div className="divide-y text-sm">
                  {mods.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-mono mr-2">BM-{m.mod_no}</span>
                        {m.title}
                        <div className="text-xs text-muted-foreground">
                          {m.status === "approved" && m.approved_at
                            ? `approved ${m.approved_at.slice(0, 10)}`
                            : `status: ${m.status}`}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={m.status === "approved" ? "default" : "outline"}>{m.status}</Badge>
                        {m.status === "draft" && (
                          <Button size="sm" onClick={() => handleApprove(m.id)}>
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BudgetModificationDialog
        open={modOpen}
        onOpenChange={setModOpen}
        projectBudgetId={budget.id}
      />
      <BudgetSnapshotDialog
        open={snapOpen}
        onOpenChange={setSnapOpen}
        projectBudgetId={budget.id}
      />
    </div>
  );
}
