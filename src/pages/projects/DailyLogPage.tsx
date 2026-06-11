/**
 * C4 · DailyLogPage — date-picker + 14 category sub-tabs + PDF download.
 */
import { toDateOnly } from "@/lib/date";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDailyReport } from "@/hooks/useDailyLog";
import { DailyLogTabs } from "@/components/projects/DailyLog/DailyLogTabs";
import { DailyLogPDFExport } from "@/components/projects/DailyLog/DailyLogPDFExport";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Send } from "lucide-react";
import { toast } from "sonner";

export default function DailyLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [reportDate, setReportDate] = useState(toDateOnly(new Date()));

  const { data: report, ensure, copyYesterday } = useDailyReport(projectId ?? null, reportDate);
  const reportId = (report as any)?.id ?? null;
  const submitted = Boolean((report as any)?.submitted_at);

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
      qc.invalidateQueries({ queryKey: ["daily_manpower"] });
      qc.invalidateQueries({ queryKey: ["daily_equipment"] });
      qc.invalidateQueries({ queryKey: ["daily_scheduled_work"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSubmit() {
    if (!reportId) return;
    try {
      const { error } = await supabase
        .from("daily_reports" as any)
        .update({ submitted_at: new Date().toISOString() } as any)
        .eq("id", reportId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["daily-report", projectId, reportDate] });
      toast.success("Daily report submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Daily Log</h1>
          <p className="text-muted-foreground">
            14 categories across a single day.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <DailyLogPDFExport dailyReportId={reportId} />
          {reportId && !submitted && (
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" /> Submit
            </Button>
          )}
          {submitted && <Badge>Submitted</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-56"
          />
          {!report ? (
            <Button onClick={handleEnsure} disabled={ensure.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {ensure.isPending ? "Creating…" : "Create report"}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleCopy} disabled={copyYesterday.isPending}>
              <Copy className="h-4 w-4 mr-2" />
              {copyYesterday.isPending ? "Copying…" : "Copy yesterday"}
            </Button>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardContent className="p-4">
            <DailyLogTabs dailyReportId={reportId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
