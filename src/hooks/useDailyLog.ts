/**
 * C4 · Daily Log — parent row + 13 child category tables.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDailyReport(projectId: string | null, reportDate: string | null) {
  const qc = useQueryClient();

  const one = useQuery({
    queryKey: ["daily-report", projectId, reportDate],
    enabled: Boolean(projectId && reportDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports" as any).select("*")
        .eq("project_id", projectId!)
        .eq("report_date", reportDate!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ensure = useMutation({
    mutationFn: async () => {
      if (!projectId || !reportDate) throw new Error("Need project + date");
      const existing = await supabase
        .from("daily_reports" as any).select("id")
        .eq("project_id", projectId).eq("report_date", reportDate).maybeSingle();
      if (existing.data) return existing.data;
      const { data, error } = await supabase
        .from("daily_reports" as any)
        .insert({ project_id: projectId, report_date: reportDate } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-report", projectId, reportDate] }),
  });

  /** Clone manpower + equipment + scheduled_work from yesterday's report. */
  const copyYesterday = useMutation({
    mutationFn: async () => {
      if (!projectId || !reportDate) throw new Error("Need project + date");
      const yesterday = new Date(reportDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split("T")[0];

      const [{ data: todayParent }, { data: prevParent }] = await Promise.all([
        supabase.from("daily_reports" as any).select("id").eq("project_id", projectId).eq("report_date", reportDate).maybeSingle(),
        supabase.from("daily_reports" as any).select("id").eq("project_id", projectId).eq("report_date", yDate).maybeSingle(),
      ]);
      if (!todayParent || !prevParent) throw new Error("Missing today or yesterday report");
      const todayId = (todayParent as any).id;
      const prevId = (prevParent as any).id;

      for (const table of ["daily_manpower", "daily_equipment", "daily_scheduled_work"]) {
        const { data: rows } = await supabase.from(table as any).select("*").eq("daily_report_id", prevId);
        if (Array.isArray(rows) && rows.length > 0) {
          const clones = (rows as any[]).map(({ id, daily_report_id, ...rest }) => ({
            ...rest, daily_report_id: todayId,
          }));
          await supabase.from(table as any).insert(clones as any);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-report", projectId, reportDate] }),
  });

  return { ...one, ensure, copyYesterday };
}

export function useDailyCategory<T = Record<string, unknown>>(
  table: string,
  dailyReportId: string | null,
) {
  const qc = useQueryClient();
  const list = useQuery<T[]>({
    queryKey: [table, dailyReportId],
    enabled: Boolean(dailyReportId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any).select("*").eq("daily_report_id", dailyReportId!);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const add = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { data, error } = await supabase.from(table as any)
        .insert({ daily_report_id: dailyReportId!, ...row } as any)
        .select().single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, dailyReportId] }),
  });

  return { ...list, add };
}
