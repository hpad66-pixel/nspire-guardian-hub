import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocWorkflowStatus = "uploaded" | "drafting" | "signed" | "sent" | "executed";

export interface AuthoredDocument {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  category: string | null;
  status: "draft" | "final";
  content_html: string | null;   // plain rich-text content (blank documents only)
  content_text: string | null;   // knowledge base / search
  source: string;                // blank | upload_docx | upload_pdf | ai_draft
  source_file_name: string | null;
  mime_type: string | null;
  version: number;               // current version number (mirrors the latest row in authored_document_versions)
  has_original: boolean;         // true when an uploaded source file is preserved
  finalized_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  workflow_status?: DocWorkflowStatus;
  sign_token?: string | null;
  contractor_signed_at?: string | null;
  contractor_signed_name?: string | null;
  contractor_signature_data?: string | null;
  client_signed_at?: string | null;
  client_signed_name?: string | null;
  client_signature_data?: string | null;
  sent_to_client_at?: string | null;
  sent_to_email?: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  html: string;
  label: string;
  created_at: string;
}

// Columns for the list view — deliberately EXCLUDES original_base64/edited_html
// (can be large; fetched on demand via fetchOriginal when opening a document).
const LIST_COLS =
  "id,project_id,title,doc_type,category,status,content_html,content_text,source,source_file_name,mime_type,version,has_original,finalized_at,created_by,created_at,updated_at,workflow_status,sign_token,contractor_signed_at,contractor_signed_name,contractor_signature_data,client_signed_at,client_signed_name,sent_to_client_at,sent_to_email";

export interface NewAuthoredDocument {
  title?: string;
  doc_type?: string;
  category?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  source?: string;
  source_file_name?: string | null;
  original_base64?: string | null;
  /** Faithful docx-preview render captured at import time — becomes the current
   *  editable content immediately, so there's never a fork between "the upload"
   *  and "your edit". */
  edited_html?: string | null;
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

  // Fetch the exact original + the current editable content for one document.
  const fetchOriginal = async (id: string): Promise<{ original_base64: string | null; mime_type: string | null; edited_html: string | null }> => {
    const { data, error } = await supabase
      .from("authored_documents" as any)
      .select("original_base64,mime_type,edited_html")
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
          edited_html: input.edited_html ?? null,
          mime_type: input.mime_type ?? null,
          has_original: Boolean(input.original_base64),
          created_by: auth?.user?.id ?? null,
        })
        .select(LIST_COLS)
        .single();
      if (error) throw error;
      const doc = data as unknown as AuthoredDocument;
      // Seed version 1 so History always has a starting point.
      if (input.edited_html || input.content_html) {
        await supabase.from("authored_document_versions" as any).insert({
          document_id: doc.id, version: 1, html: input.edited_html ?? input.content_html, label: input.source === "blank" ? "Created" : "Uploaded", created_by: auth?.user?.id ?? null,
        });
      }
      return doc;
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

  // Save an edit: it simply BECOMES the current version — no separate "replace"
  // step required. Persists edited_html/content_text, bumps the version counter,
  // and appends a version-history snapshot.
  const saveEdit = useMutation({
    mutationFn: async ({ id, html, text, label = "Edited" }: { id: string; html: string; text?: string; label?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: current } = await supabase.from("authored_documents" as any).select("version").eq("id", id).single();
      const nextVersion = ((current as any)?.version ?? 1) + 1;
      const { error: e1 } = await supabase
        .from("authored_documents" as any)
        .update({ edited_html: html, content_text: text ?? null, version: nextVersion, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("authored_document_versions" as any)
        .insert({ document_id: id, version: nextVersion, html, label, created_by: auth?.user?.id ?? null });
      if (e2) throw e2;
      return nextVersion;
    },
    onSettled: invalidate,
  });

  // Replace the uploaded source file with a different one (e.g. starting over
  // from a new export). Optional — normal edits use saveEdit, not this.
  const replaceOriginal = useMutation({
    mutationFn: async ({ id, original_base64, mime_type, source_file_name }: { id: string; original_base64: string; mime_type: string; source_file_name: string }) => {
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({ original_base64, mime_type, source_file_name, has_original: true, status: "draft", finalized_at: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const setFinalized = useMutation({
    mutationFn: async ({ id, finalized }: { id: string; finalized: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (finalized) {
        // Snapshot the exact content being locked, so History shows the finalized point.
        const { data: doc } = await supabase.from("authored_documents" as any).select("edited_html,content_html,version").eq("id", id).single();
        const html = (doc as any)?.edited_html ?? (doc as any)?.content_html;
        if (html) {
          await supabase.from("authored_document_versions" as any).insert({ document_id: id, version: (doc as any).version, html, label: "Finalized", created_by: auth?.user?.id ?? null });
        }
      }
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({
          status: finalized ? "final" : "draft",
          finalized_at: finalized ? new Date().toISOString() : null,
          finalized_by: finalized ? auth?.user?.id ?? null : null,
          workflow_status: finalized ? "drafting" : "drafting",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const signDocument = useMutation({
    mutationFn: async ({ id, name, signatureDataUrl }: { id: string; name: string; signatureDataUrl: string }) => {
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({
          contractor_signed_at: new Date().toISOString(),
          contractor_signed_name: name.trim(),
          contractor_signature_data: signatureDataUrl,
          workflow_status: "signed",
          status: "final",
          finalized_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const markSent = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      const { error } = await supabase
        .from("authored_documents" as any)
        .update({
          sent_to_client_at: new Date().toISOString(),
          sent_to_email: email.trim(),
          workflow_status: "sent",
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

  return { ...list, fetchOriginal, create, update, saveEdit, replaceOriginal, setFinalized, signDocument, markSent, remove };
}

// ── Version history — browse, restore, or delete a past snapshot ───────────
export function useDocumentVersions(documentId: string | null) {
  const qc = useQueryClient();
  const key = ["authored-document-versions", documentId];
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["authored-documents"] });
  };

  const versions = useQuery({
    queryKey: key,
    enabled: Boolean(documentId),
    queryFn: async (): Promise<DocumentVersion[]> => {
      const { data, error } = await supabase
        .from("authored_document_versions" as any)
        .select("id,document_id,version,html,label,created_at")
        .eq("document_id", documentId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentVersion[];
    },
  });

  // Restoring appends a NEW version (history stays append-only / non-destructive)
  // and makes that content current.
  const restore = useMutation({
    mutationFn: async (v: DocumentVersion) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: current } = await supabase.from("authored_documents" as any).select("version").eq("id", v.document_id).single();
      const nextVersion = ((current as any)?.version ?? 1) + 1;
      const { error: e1 } = await supabase
        .from("authored_documents" as any)
        .update({ edited_html: v.html, version: nextVersion, updated_at: new Date().toISOString() })
        .eq("id", v.document_id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("authored_document_versions" as any)
        .insert({ document_id: v.document_id, version: nextVersion, html: v.html, label: `Restored from v${v.version}`, created_by: auth?.user?.id ?? null });
      if (e2) throw e2;
    },
    onSettled: invalidate,
  });

  // Pruning old snapshots is just cleanup — the current document isn't stored
  // here, so deleting a past version never affects what's live.
  const deleteVersion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authored_document_versions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return { ...versions, restore, deleteVersion };
}
