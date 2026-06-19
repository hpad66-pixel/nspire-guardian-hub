/**
 * F0 · useProjectIntake — the per-project inbound email + drop folder.
 * The upload token is minted server-side (intake-ingest edge fn, action=provision)
 * and returned exactly once (rule 10); only the hash is persisted.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectIntake {
  id: string;
  tenant_id: string;
  project_id: string;
  intake_email: string;
  storage_prefix: string;
  revoked_at: string | null;
  created_at: string;
}

/** Returned only once at provision time. */
export interface ProvisionResult {
  intake: ProjectIntake;
  token: string; // plaintext — show in RevealSecretOnceDialog, never stored client-side
}

export function useProjectIntake(projectId: string | null) {
  const qc = useQueryClient();

  const detail = useQuery<ProjectIntake | null>({
    queryKey: ["project-intake", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_intake" as any)
        .select("id, tenant_id, project_id, intake_email, storage_prefix, revoked_at, created_at")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProjectIntake | null;
    },
  });

  const provision = useMutation({
    mutationFn: async (): Promise<ProvisionResult> => {
      const { data, error } = await supabase.functions.invoke("intake-ingest", {
        body: { action: "provision", project_id: projectId },
      });
      if (error) throw error;
      return data as ProvisionResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-intake", projectId] }),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("intake-ingest", {
        body: { action: "revoke", project_id: projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-intake", projectId] }),
  });

  return { ...detail, provision, revoke };
}
