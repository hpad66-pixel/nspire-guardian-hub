/**
 * useTenantSettings — get/set per-workspace feature flags (A1.tenant_settings).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface TenantSetting {
  id: string;
  tenant_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export function useTenantSettings() {
  const qc = useQueryClient();

  const list = useQuery<TenantSetting[]>({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_settings" as any)
        .select("*")
        .order("key", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TenantSetting[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: { key: string; value: unknown }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("tenant_settings" as any)
        .upsert(
          { tenant_id, key: input.key, value: input.value as any },
          { onConflict: "tenant_id,key" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as TenantSetting;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  const remove = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("tenant_settings" as any)
        .delete()
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  return { ...list, upsert, remove };
}
