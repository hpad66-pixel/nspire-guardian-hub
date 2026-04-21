import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { CSI_DIVISIONS, DEFAULT_COST_TYPES } from "@/lib/csi-masterformat-2018";

export interface CostCodeLibrary {
  id: string;
  tenant_id: string;
  name: string;
  source: "csi" | "custom" | "imported";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCode {
  id: string;
  library_id: string;
  code: string;
  description: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  sort_order: number | null;
}

export interface CostType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  sort_order: number;
}

export function useCostCodeLibraries() {
  const qc = useQueryClient();
  const list = useQuery<CostCodeLibrary[]>({
    queryKey: ["cost-code-libraries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_code_libraries" as any)
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as CostCodeLibrary[];
    },
  });

  const seedCsi = useMutation({
    mutationFn: async () => {
      const tenant_id = await requireTenantId();
      const { data: lib, error: libErr } = await supabase
        .from("cost_code_libraries" as any)
        .insert({
          tenant_id,
          name: "CSI MasterFormat 2018 (System)",
          source: "csi",
          is_default: true,
        } as any)
        .select()
        .single();
      if (libErr) throw libErr;

      // Insert divisions first (no parent), then level-2 codes referencing parents
      const divisions = CSI_DIVISIONS.filter((c) => c.level === 1);
      const { data: inserted, error: err1 } = await supabase
        .from("cost_codes" as any)
        .insert(divisions.map((d) => ({
          library_id: (lib as any).id,
          code: d.code,
          description: d.description,
          level: d.level,
          parent_id: null,
        })) as any)
        .select();
      if (err1) throw err1;

      const codeToId = new Map<string, string>();
      for (const row of (inserted as any[] ?? [])) codeToId.set(row.code, row.id);

      const subs = CSI_DIVISIONS.filter((c) => c.level > 1).map((c) => ({
        library_id: (lib as any).id,
        code: c.code,
        description: c.description,
        level: c.level,
        parent_id: c.parent_code ? codeToId.get(c.parent_code) ?? null : null,
      }));
      if (subs.length > 0) {
        const { error: err2 } = await supabase.from("cost_codes" as any).insert(subs as any);
        if (err2) throw err2;
      }

      // Seed cost types
      await supabase
        .from("cost_types" as any)
        .upsert(
          DEFAULT_COST_TYPES.map((t) => ({ tenant_id, ...t })) as any,
          { onConflict: "tenant_id,code" },
        );

      return lib as CostCodeLibrary;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-code-libraries"] }),
  });

  return { ...list, seedCsi };
}

export function useCostCodes(libraryId: string | null) {
  return useQuery<CostCode[]>({
    queryKey: ["cost-codes", libraryId],
    enabled: Boolean(libraryId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_codes" as any)
        .select("*")
        .eq("library_id", libraryId!)
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as CostCode[];
    },
  });
}

export function useDefaultLibrary() {
  return useQuery<CostCodeLibrary | null>({
    queryKey: ["cost-code-default-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_code_libraries" as any)
        .select("*")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CostCodeLibrary | null;
    },
  });
}

export function useCostTypes() {
  return useQuery<CostType[]>({
    queryKey: ["cost-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_types" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CostType[];
    },
  });
}
