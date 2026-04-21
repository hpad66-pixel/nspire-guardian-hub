/**
 * C3 · Punch List.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export function useProjectLocations(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["project-locations", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_locations" as any).select("*")
        .eq("project_id", projectId!)
        .order("level").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { name: string; parentId?: string; level?: number }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("project_locations" as any).insert({
        tenant_id, project_id: projectId!,
        name: input.name, parent_id: input.parentId ?? null,
        level: input.level ?? (input.parentId ? 2 : 1),
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-locations", projectId] }),
  });

  return { ...list, add };
}

export function usePunchList(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["punch-items", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_items" as any).select("*")
        .eq("project_id", projectId!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const close = useMutation({
    mutationFn: async (input: { itemId: string; closedBy: string }) => {
      const { error } = await supabase.from("punch_items" as any).update({
        closed_at: new Date().toISOString(),
        closed_by: input.closedBy,
      } as any).eq("id", input.itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["punch-items", projectId] }),
  });

  return { ...list, close };
}
