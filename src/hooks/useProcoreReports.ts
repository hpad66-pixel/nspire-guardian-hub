/**
 * E3 · Procore Lite Reports (coexists with pre-existing useReports.ts).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export type ReportDataSource =
  | "rfis" | "submittals" | "punch" | "daily_logs" | "meetings"
  | "schedule_tasks" | "incidents" | "budget_matrix" | "commitments"
  | "change_orders" | "direct_costs" | "pay_apps";

export interface ProcoreReport {
  id: string; tenant_id: string; owner_user_id: string;
  name: string; description: string | null;
  data_source: ReportDataSource;
  config: { columns?: string[]; filters?: any[]; group_by?: string; sort?: string; limit?: number };
  scope: "private" | "project" | "tenant";
  project_id: string | null;
  created_at: string; updated_at: string;
}

export function useProcoreReports() {
  const qc = useQueryClient();

  const list = useQuery<ProcoreReport[]>({
    queryKey: ["procore-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports" as any).select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProcoreReport[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<ProcoreReport, "id"|"tenant_id"|"owner_user_id"|"created_at"|"updated_at">) => {
      const tenant_id = await requireTenantId();
      const { data: sess } = await supabase.auth.getUser();
      const owner_user_id = sess.user?.id;
      if (!owner_user_id) throw new Error("Not signed in");
      const { data, error } = await supabase.from("reports" as any).insert({
        tenant_id, owner_user_id, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as ProcoreReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procore-reports"] }),
  });

  const run = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.functions.invoke("run-report", {
        body: { report_id: reportId },
      });
      if (error) throw error;
      return data;
    },
  });

  return { ...list, create, run };
}

export interface ReportSchedule {
  id: string; tenant_id: string; report_id: string;
  cron: string;
  recipients: { user_ids?: string[]; emails?: string[]; distribution_list_ids?: string[] };
  format: "pdf"|"xlsx"|"csv";
  last_run_at: string | null; next_run_at: string | null;
  is_active: boolean;
}

export function useReportSchedules(reportId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<ReportSchedule[]>({
    queryKey: ["report-schedules", reportId],
    enabled: Boolean(reportId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_schedules" as any).select("*").eq("report_id", reportId!);
      if (error) throw error;
      return (data ?? []) as ReportSchedule[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      cron: string; format: ReportSchedule["format"];
      recipients: ReportSchedule["recipients"];
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("report_schedules" as any).insert({
        tenant_id, report_id: reportId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as ReportSchedule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-schedules", reportId] }),
  });

  return { ...list, create };
}

export interface Dashboard {
  id: string; tenant_id: string; owner_user_id: string | null;
  name: string;
  role_preset: "exec"|"pm"|"super"|"accountant"|"safety"|"custom"|null;
  tiles: Array<{ kind: "kpi"|"chart"|"table"|"map"; title: string; query: any; size?: string }>;
  created_at: string; updated_at: string;
}

export function useDashboards() {
  const qc = useQueryClient();
  const list = useQuery<Dashboard[]>({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboards" as any).select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Dashboard[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<Dashboard, "id"|"tenant_id"|"owner_user_id"|"created_at"|"updated_at">) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("dashboards" as any).insert({
        tenant_id, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  });

  return { ...list, create };
}
