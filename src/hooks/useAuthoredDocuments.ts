import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuthoredDocument {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  category: string | null;
  status: "draft" | "final";
  content_html: string;
  content_text: string | null;
  source: string;              // blank | upload_docx | upload_pdf | ai_draft
  source_file_name: string | null;
  finalized_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewAuthoredDocument {
  title?: string;
  doc_type?: string;
  category?: string | null;
  content_html?: string;
  content_text?: string | null;
  source?: string;
  source_file_name?: string | null;
}

export function useAuthoredDocuments(projectId: string | null) {
  const qc = useQueryClient();
  const key = ["authored-documents", projectId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async (): Promise<AuthoredDocument[]> => {
      const { data, error } = await supabase
        .from("authored_documents" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuthoredDocument[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: NewAuthoredDocument): Promise<AuthoredDocument> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("authored_documents" as any)
        .insert({
          project_id: projectId,
          title: input.title ?? "Untitled document",
          doc_type: input.doc_type ?? "letter",
          category: input.category ?? null,
          content_html: input.content_html ?? "<p></p>",
          content_text: input.content_text ?? null,
          source: input.source ?? "blank",
          source_file_name: input.source_file_name ?? null,
          created_by: auth?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AuthoredDocument;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<AuthoredDocument>) => {
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const setFinalized = useMutation({
    mutationFn: async ({ id, finalized }: { id: string; finalized: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({
          status: finalized ? "final" : "draft",
          finalized_at: finalized ? new Date().toISOString() : null,
          finalized_by: finalized ? auth?.user?.id ?? null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authored_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return { ...list, create, update, setFinalized, remove };
}
