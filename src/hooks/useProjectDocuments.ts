/**
 * B5 · Documents + Transmittals (Procore Lite pl_documents).
 * Named "useProjectDocuments" to avoid colliding with the existing useDocuments.ts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface ProjectDocument {
  id: string; tenant_id: string; project_id: string | null; folder_id: string | null;
  name: string; current_version: number; mime: string | null; size_bytes: number | null;
  checked_out_by: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface ProjectDocumentVersion {
  id: string; document_id: string; version: number;
  storage_path: string; uploaded_by: string | null;
  note: string | null; uploaded_at: string;
}

export interface Transmittal {
  id: string; tenant_id: string; project_id: string; number: string;
  subject: string; body: string | null;
  from_user_id: string | null; distribution_list_id: string | null;
  sent_at: string | null; created_at: string;
}

export const DOCS_BUCKET = "project-documents";

export function useProjectDocuments(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<ProjectDocument[]>({
    queryKey: ["pl-documents", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_documents" as any).select("*")
        .eq("project_id", projectId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectDocument[];
    },
  });

  /** Upload a brand-new document (creates row + version 1). */
  const createWithFile = useMutation({
    mutationFn: async (input: {
      file: File;
      folderId?: string | null;
      note?: string;
    }) => {
      const tenant_id = await requireTenantId();
      if (!projectId) throw new Error("No project");
      const docId = crypto.randomUUID();
      const path = `${tenant_id}/${projectId}/${docId}/v1-${input.file.name}`;

      const { error: upErr } = await supabase.storage
        .from(DOCS_BUCKET).upload(path, input.file);
      if (upErr) throw upErr;

      const { error: docErr } = await supabase.from("pl_documents" as any).insert({
        id: docId,
        tenant_id, project_id: projectId,
        folder_id: input.folderId ?? null,
        name: input.file.name,
        current_version: 1,
        mime: input.file.type || null,
        size_bytes: input.file.size,
      } as any);
      if (docErr) throw docErr;

      const { error: verErr } = await supabase.from("pl_document_versions" as any).insert({
        document_id: docId, version: 1, storage_path: path, note: input.note ?? null,
      } as any);
      if (verErr) throw verErr;

      return docId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pl-documents", projectId] }),
  });

  return { ...list, createWithFile };
}

/** Versions of a single document. */
export function useDocumentVersions(documentId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<ProjectDocumentVersion[]>({
    queryKey: ["pl-document-versions", documentId],
    enabled: Boolean(documentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_document_versions" as any).select("*")
        .eq("document_id", documentId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectDocumentVersion[];
    },
  });

  /** Upload a new version of an existing document; bumps current_version. */
  const uploadNewVersion = useMutation({
    mutationFn: async (input: {
      documentId: string; file: File; note?: string;
    }) => {
      const tenant_id = await requireTenantId();

      // Look up current version + project_id for storage path.
      const { data: doc, error: docErr } = await supabase
        .from("pl_documents" as any)
        .select("id, project_id, current_version")
        .eq("id", input.documentId).single();
      if (docErr) throw docErr;

      const nextVersion = ((doc as any).current_version ?? 0) + 1;
      const path = `${tenant_id}/${(doc as any).project_id}/${input.documentId}/v${nextVersion}-${input.file.name}`;

      const { error: upErr } = await supabase.storage
        .from(DOCS_BUCKET).upload(path, input.file);
      if (upErr) throw upErr;

      const { error: vErr } = await supabase.from("pl_document_versions" as any).insert({
        document_id: input.documentId,
        version: nextVersion,
        storage_path: path,
        note: input.note ?? null,
      } as any);
      if (vErr) throw vErr;

      const { error: upDocErr } = await supabase.from("pl_documents" as any)
        .update({
          current_version: nextVersion,
          size_bytes: input.file.size,
          mime: input.file.type || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", input.documentId);
      if (upDocErr) throw upDocErr;

      return nextVersion;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["pl-document-versions", vars.documentId] });
      qc.invalidateQueries({ queryKey: ["pl-documents"] });
    },
  });

  return { ...list, uploadNewVersion };
}

export function useTransmittals(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<Transmittal[]>({
    queryKey: ["transmittals", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transmittals" as any).select("*")
        .eq("project_id", projectId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transmittal[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      subject: string; body?: string; distributionListId?: string;
      documentIds: Array<{ id: string; version: number }>;
      markSent?: boolean;
    }) => {
      const tenant_id = await requireTenantId();
      if (!projectId) throw new Error("No project");
      const { data: num, error: numErr } = await supabase.rpc(
        "next_transmittal_number" as any,
        { p_project_id: projectId } as any,
      );
      if (numErr) throw numErr;
      const { data: t, error: tErr } = await supabase.from("transmittals" as any).insert({
        tenant_id, project_id: projectId,
        number: num as unknown as string,
        subject: input.subject,
        body: input.body ?? null,
        distribution_list_id: input.distributionListId ?? null,
        sent_at: input.markSent ? new Date().toISOString() : null,
      } as any).select().single();
      if (tErr) throw tErr;

      if (input.documentIds.length > 0) {
        await supabase.from("transmittal_items" as any).insert(
          input.documentIds.map((d) => ({
            transmittal_id: (t as any).id, document_id: d.id, version: d.version,
          })) as any,
        );
      }
      return t as Transmittal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transmittals", projectId] }),
  });

  return { ...list, create };
}
