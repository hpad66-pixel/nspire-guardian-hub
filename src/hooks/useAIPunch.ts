/**
 * AI punch-list authoring: turn dictated/typed notes into structured items
 * (draft-punch-items edge fn), then bulk-insert the approved items.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DraftedPunchItem {
  description: string;
  location: string;
  trade: string;
  priority: "high" | "medium" | "low";
}

export function useDraftPunchItems() {
  return useMutation({
    mutationFn: async ({ text, projectName }: { text: string; projectName?: string }) => {
      const { data, error } = await supabase.functions.invoke("draft-punch-items", {
        body: { text, projectName },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return ((data as any)?.items ?? []) as DraftedPunchItem[];
    },
  });
}

export interface NewPunchItem {
  description: string;
  location: string;
  priority: string;
  commitment_id?: string | null;
}

export function useBulkCreatePunchItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, items }: { projectId: string; items: NewPunchItem[] }) => {
      const rows = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          project_id: projectId,
          description: i.description.trim(),
          location: i.location?.trim() || "—",
          priority: i.priority || "medium",
          status: "open",
          commitment_id: i.commitment_id ?? null,
        }));
      if (!rows.length) return [];
      const { data, error } = await supabase.from("punch_items" as any).insert(rows as any).select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["punch-items"] }),
  });
}
