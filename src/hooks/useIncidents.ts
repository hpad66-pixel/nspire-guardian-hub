/**
 * E2 · Incidents (OSHA 300/301).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Incident {
  id: string; tenant_id: string; project_id: string | null;
  reporter_id: string | null;
  title: string | null; description: string | null;
  occurred_at: string | null;
  location_id: string | null;
  incident_type: "injury"|"illness"|"near_miss"|"env"|"property"|"theft"|null;
  severity: string | null;
  osha_recordable: boolean;
  osha_days_away: number; osha_restricted_days: number;
  osha_case_number: string | null;
  witness_user_ids: string[];
  status: string;
  created_at: string; updated_at: string;
}

export function useIncidents(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<Incident[]>({
    queryKey: ["incidents", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents" as any).select("*")
        .eq("project_id", projectId!)
        .order("occurred_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Incident>) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("incidents" as any).insert({
        tenant_id, project_id: projectId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents", projectId] }),
  });

  return { ...list, create };
}

export function useOshaRecordables(projectId: string | null, year: number) {
  return useQuery<Incident[]>({
    queryKey: ["osha-recordables", projectId, year],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const start = `${year}-01-01`;
      const end = `${year + 1}-01-01`;
      const { data, error } = await supabase
        .from("incidents" as any).select("*")
        .eq("project_id", projectId!)
        .eq("osha_recordable", true)
        .gte("occurred_at", start)
        .lt("occurred_at", end);
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
  });
}

export function useCorrectiveActions(incidentId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["corrective-actions", incidentId],
    enabled: Boolean(incidentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_corrective_actions" as any).select("*")
        .eq("incident_id", incidentId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { description: string; assigneeId?: string; dueDate?: string }) => {
      if (!incidentId) throw new Error("No incident");
      const { data, error } = await supabase.from("incident_corrective_actions" as any).insert({
        incident_id: incidentId,
        description: input.description,
        assignee_id: input.assigneeId ?? null,
        due_date: input.dueDate ?? null,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["corrective-actions", incidentId] }),
  });

  return { ...list, add };
}
