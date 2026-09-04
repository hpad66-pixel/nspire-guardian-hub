import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Cohort = "admin" | "pilot";

export function useCardScanPilotAdmin(projectId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["crm-card-scan-pilot-admin", projectId], enabled: Boolean(projectId),
    queryFn: async (): Promise<Map<string, Cohort>> => {
      const { data, error } = await supabase.from("crm_card_scan_entitlements")
        .select("user_id, cohort, status").eq("project_id", projectId).eq("status", "enabled");
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.user_id, row.cohort === "admin" ? "admin" : "pilot"] as [string, Cohort]));
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ userId, cohort, enabled }: { userId: string; cohort: Cohort; enabled: boolean }) => {
      const { error } = await supabase.rpc("set_crm_card_scan_entitlement", {
        p_user_id: userId, p_project_id: projectId, p_cohort: cohort, p_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["crm-card-scan-pilot-admin", projectId] }); toast.success("Card-scan pilot assignment updated"); },
    onError: (error: Error) => toast.error(error.message.includes("cohort is full") ? "That pilot cohort is already full." : "Card-scan pilot assignment could not be changed."),
  });
  return {
    cohorts: query.data ?? new Map<string, Cohort>(), isLoading: query.isLoading, error: query.error,
    pendingUserId: mutation.variables?.userId ?? null,
    setEnrollment: (userId: string, cohort: Cohort, enabled: boolean) => mutation.mutate({ userId, cohort, enabled }),
  };
}
