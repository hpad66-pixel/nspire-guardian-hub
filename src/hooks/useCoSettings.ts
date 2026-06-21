/**
 * useCoSettings — per-workspace change-order identity & defaults (white-label).
 * Seeds the contractor party, branding, and markup percentages for new COs so
 * each tenant's documents and emails carry their own company, not a hardcoded one.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface CoSettings {
  workspace_id: string;
  company_name: string | null;
  company_address: string | null;
  company_city: string | null;
  company_contact: string | null;
  company_title: string | null;
  company_email: string | null;
  wordmark: string | null;
  footer: string | null;
  default_overhead_pct: number;
  default_profit_pct: number;
  email_from_name: string | null;
}

export function useCoSettings() {
  const qc = useQueryClient();

  const query = useQuery<CoSettings | null>({
    queryKey: ["co-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_co_settings" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoSettings | null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<CoSettings>) => {
      const workspace_id = await resolveCurrentWorkspaceId();
      if (!workspace_id) throw new Error("No workspace for current user");
      const { error } = await supabase
        .from("workspace_co_settings" as any)
        .upsert({ workspace_id, ...patch, updated_at: new Date().toISOString() } as any, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-settings"] }),
  });

  return { ...query, save };
}
