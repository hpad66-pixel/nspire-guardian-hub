import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AgentPilotEntitlement {
  userId: string;
  enabled: boolean;
}

export function useAgentPilotAdmin(projectId: string | null) {
  const queryClient = useQueryClient();
  const entitlements = useQuery({
    queryKey: ["agent-pilot-admin", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<AgentPilotEntitlement[]> => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from("agent_entitlements")
        .select("user_id, status")
        .eq("project_id", projectId)
        .eq("runtime_kind", "hermes");
      if (error) throw error;
      return (data ?? []).map((row: { user_id: string; status: string }) => ({
        userId: row.user_id,
        enabled: row.status === "enabled",
      }));
    },
  });

  const setEntitlement = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      if (!projectId) throw new Error("Project is required.");
      const { error } = await (supabase as any).rpc("set_agent_pilot_entitlement", {
        p_user_id: userId,
        p_project_id: projectId,
        p_enabled: enabled,
      });
      if (error) throw error;
      return { userId, enabled };
    },
    onSuccess: ({ enabled }) => {
      void queryClient.invalidateQueries({ queryKey: ["agent-pilot-admin", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["agent-entitlement", projectId] });
      toast.success(enabled ? "Project Agent enabled for this team member" : "Project Agent disabled and active sessions revoked");
    },
    onError: () => toast.error("Proj OS could not change this Agent pilot assignment."),
  });

  return {
    entitlements: new Map((entitlements.data ?? []).map((item) => [item.userId, item.enabled])),
    isLoading: entitlements.isLoading,
    error: entitlements.error,
    pendingUserId: setEntitlement.variables?.userId ?? null,
    setEnabled: (userId: string, enabled: boolean) => setEntitlement.mutate({ userId, enabled }),
  };
}
