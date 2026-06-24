import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useProcoreReports } from "@/hooks/useProcoreReports";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProcoreReportsPage() {
  const { data: reports = [], isLoading, run } = useProcoreReports();

  async function handleRun(id: string) {
    try {
      const r = await run.mutateAsync(id);
      toast.success(`Report ran: ${(r as any)?.rows ?? 0} rows`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Build, save, and schedule reports across every module.</p>
        </div>
        <Button asChild>
          <Link to="/reports/new"><Plus className="h-4 w-4 mr-1" /> New report</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <p className="text-muted-foreground">No reports yet.</p>
          <Button asChild variant="outline"><Link to="/reports/new"><Plus className="h-4 w-4 mr-1" /> Create your first report</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.data_source} · {r.scope}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
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
