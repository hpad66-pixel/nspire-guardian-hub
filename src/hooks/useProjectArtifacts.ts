import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export type ArtifactType =
  | "prime_contract" | "invoice" | "change_order" | "drawing"
  | "permit" | "inspection_record" | "photo" | "specification"
  | "correspondence" | "other";

export type ArtifactSource = "procore" | "builtos" | "manual";

export interface ProjectArtifact {
  id: string;
  tenant_id: string;
  project_id: string;
  artifact_type: ArtifactType;
  source_system: ArtifactSource;
  title: string;
  description: string | null;
  period_date: string | null;
  reference_no: string | null;
  amount: number | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  extracted_text: string | null;
  tags: string[];
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateArtifactInput {
  artifact_type: ArtifactType;
  source_system: ArtifactSource;
  title: string;
  description?: string;
  period_date?: string;
  reference_no?: string;
  amount?: number;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
}

const BUCKET = "project-artifacts";

export function useProjectArtifacts(
  projectId: string | null,
  filters?: { artifact_type?: ArtifactType; source_system?: ArtifactSource }
) {
  const qc = useQueryClient();

  const list = useQuery<ProjectArtifact[]>({
    queryKey: ["project-artifacts", projectId, filters],
    enabled: Boolean(projectId),
    queryFn: async () => {
      let q = (supabase as any)
        .from("project_artifacts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (filters?.artifact_type) q = q.eq("artifact_type", filters.artifact_type);
      if (filters?.source_system) q = q.eq("source_system", filters.source_system);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProjectArtifact[];
    },
  });

  const upload = useMutation({
    mutationFn: async ({
      file,
      input,
      projectId: pid,
    }: {
      file: File;
      input: Omit<CreateArtifactInput, "file_path" | "file_name" | "file_size" | "mime_type">;
      projectId: string;
    }) => {
      // Resolve the workspace the same way the rest of the app does (JWT
      // claim → portal membership → profiles.workspace_id). requireTenantId()
      // only read the JWT tenant_id claim, which is absent in this deployment,
      // so uploads threw "No tenant_id in JWT" in a fresh environment. The
      // first path segment must equal current_tenant_id()::text for the
      // project-artifacts storage RLS to admit the object.
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${tenant_id}/${pid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (storageErr) throw storageErr;

      const { data, error } = await (supabase as any)
        .from("project_artifacts")
        .insert({
          tenant_id,
          project_id: pid,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          tags: input.tags ?? [],
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectArtifact;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project-artifacts", projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (artifact: ProjectArtifact) => {
      await supabase.storage.from(BUCKET).remove([artifact.file_path]);
      const { error } = await (supabase as any)
        .from("project_artifacts")
        .delete()
        .eq("id", artifact.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project-artifacts", projectId] }),
  });

  const updateExtractedText = useMutation({
    mutationFn: async ({
      id,
      extracted_text,
      tags,
      linked_entity_type,
      linked_entity_id,
    }: {
      id: string;
      extracted_text?: string;
      tags?: string[];
      linked_entity_type?: string;
      linked_entity_id?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("project_artifacts")
        .update({ extracted_text, tags, linked_entity_type, linked_entity_id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectArtifact;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project-artifacts", projectId] }),
  });

  return { ...list, upload, remove, updateExtractedText };
}

export function useArtifactUrl(filePath: string | null) {
  return useQuery<string | null>({
    queryKey: ["artifact-url", filePath],
    enabled: Boolean(filePath),
    staleTime: 1000 * 60 * 55, // just under 1 hour signed URL TTL
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
