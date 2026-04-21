import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface DrawingSet {
  id: string; tenant_id: string; project_id: string;
  name: string; set_date: string | null; discipline: string | null;
  uploaded_by: string | null; status: "processing"|"active"|"archived";
  created_at: string; updated_at: string;
}
export interface Drawing {
  id: string; tenant_id: string; set_id: string | null; project_id: string;
  sheet_number: string; title: string | null; discipline: string | null;
  current_revision_id: string | null; thumbnail_url: string | null; created_at: string;
}
export interface DrawingRevision {
  id: string; drawing_id: string; rev_number: string;
  pdf_path: string; uploaded_at: string; uploaded_by: string | null;
  supersedes_id: string | null; is_current: boolean;
}
export interface DrawingMarkup {
  id: string; revision_id: string; user_id: string | null;
  geometry: Record<string, unknown>; color: string; text: string | null;
  linked_record_id: string | null; linked_record_type: string | null;
  is_published: boolean; created_at: string;
}

export function useDrawings(projectId: string | null) {
  return useQuery<Drawing[]>({
    queryKey: ["drawings", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawings" as any).select("*")
        .eq("project_id", projectId!).order("sheet_number");
      if (error) throw error;
      return (data ?? []) as Drawing[];
    },
  });
}

export function useDrawingRevisions(drawingId: string | null) {
  return useQuery<DrawingRevision[]>({
    queryKey: ["drawing-revisions", drawingId],
    enabled: Boolean(drawingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawing_revisions" as any).select("*")
        .eq("drawing_id", drawingId!).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DrawingRevision[];
    },
  });
}

export function useMarkups(revisionId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<DrawingMarkup[]>({
    queryKey: ["markups", revisionId],
    enabled: Boolean(revisionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawing_markups" as any).select("*")
        .eq("revision_id", revisionId!);
      if (error) throw error;
      return (data ?? []) as DrawingMarkup[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<DrawingMarkup> & { geometry: Record<string, unknown> }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("drawing_markups" as any)
        .insert({ tenant_id, revision_id: revisionId!, ...input } as any)
        .select().single();
      if (error) throw error;
      return data as DrawingMarkup;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markups", revisionId] }),
  });

  return { ...list, create };
}
