import { useParams } from "react-router-dom";
import { useState } from "react";
import { useDailyReport } from "@/hooks/useDailyLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DailyLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: report, ensure, copyYesterday } = useDailyReport(projectId ?? null, reportDate);

  async function handleEnsure() {
    try {
      await ensure.mutateAsync();
      toast.success("Daily report ready");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCopy() {
    try {
      await copyYesterday.mutateAsync();
      toast.success("Copied yesterday's manpower + equipment");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Daily Log</h1>
      <p className="text-muted-foreground mb-6">14 categories across a single day.</p>

      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Date</CardTitle></CardHeader>
        <CardContent className="flex gap-2 items-center">
          <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-56" />
          {!report ? (
            <Button onClick={handleEnsure} disabled={ensure.isPending}>Create report</Button>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                Report started {(report as any).submitted_at ? "· submitted" : "· draft"}
              </span>
              <Button variant="outline" onClick={handleCopy} disabled={copyYesterday.isPending}>
                Copy yesterday
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {["Weather","Manpower","Equipment","Deliveries","Safety violations","Accidents","Quantities","Productivity","Visitors","Calls","Notes","Dumpster","Scheduled work"].map((c) => (
                <div key={c} className="rounded border p-3">{c}</div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Category editors are wired via useDailyCategory('table_name', dailyReportId).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
