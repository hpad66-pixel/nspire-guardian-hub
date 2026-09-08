import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AgentEntitlementRpc = (
  functionName: "has_agent_pilot_entitlement",
  arguments_: { p_project_id: string },
) => PromiseLike<{ data: boolean | null; error: { message?: string } | null }>;

export function useAgentEntitlement(projectId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agent-pilot-entitlement", user?.id, projectId],
    enabled: Boolean(user?.id && projectId),
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!projectId) return false;
      const rpc = supabase.rpc.bind(supabase) as unknown as AgentEntitlementRpc;
      const { data, error } = await rpc("has_agent_pilot_entitlement", { p_project_id: projectId });
      if (error) return false;
      return data === true;
    },
  });
}
