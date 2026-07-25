import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuthoredDocument {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  category: string | null;
  status: "draft" | "final";
  content_html: string | null;   // only for the optional best-effort "edit copy"
  content_text: string | null;   // knowledge base / search
  source: string;                // blank | upload_docx | upload_pdf | ai_draft
  source_file_name: string | null;
  mime_type: string | null;
  version: number;
  has_original: boolean;         // true when the exact uploaded file is preserved
  finalized_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Columns for the list view — deliberately EXCLUDES original_base64 (can be large;
// fetched on demand via fetchOriginal when previewing/downloading).
const LIST_COLS =
  "id,project_id,title,doc_type,category,status,content_html,content_text,source,source_file_name,mime_type,version,has_original,finalized_at,created_by,created_at,updated_at";

export interface NewAuthoredDocument {
  title?: string;
  doc_type?: string;
  category?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  source?: string;
  source_file_name?: string | null;
  original_base64?: string | null;
  mime_type?: string | null;
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
        .select(LIST_COLS)
        .eq("project_id", projectId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuthoredDocument[];
    },
  });

  // Fetch the exact original file (base64 + mime) for one document, on demand.
  const fetchOriginal = async (id: string): Promise<{ original_base64: string | null; mime_type: string | null }> => {
    const { data, error } = await supabase
      .from("authored_documents" as any)
      .select("original_base64,mime_type")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as any;
  };

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
          content_html: input.content_html ?? null,
          content_text: input.content_text ?? null,
          source: input.source ?? "blank",
          source_file_name: input.source_file_name ?? null,
          original_base64: input.original_base64 ?? null,
          mime_type: input.mime_type ?? null,
          has_original: Boolean(input.original_base64),
          created_by: auth?.user?.id ?? null,
        })
        .select(LIST_COLS)
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

  // Replace the preserved original with a newer edited version (bumps version).
  const replaceOriginal = useMutation({
    mutationFn: async ({ id, original_base64, mime_type, source_file_name, version }: { id: string; original_base64: string; mime_type: string; source_file_name: string; version: number }) => {
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({ original_base64, mime_type, source_file_name, has_original: true, version: version + 1, status: "draft", finalized_at: null, updated_at: new Date().toISOString() })
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

  return { ...list, fetchOriginal, create, update, replaceOriginal, setFinalized, remove };
}
