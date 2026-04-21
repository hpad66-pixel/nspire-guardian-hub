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

export interface Transmittal {
  id: string; tenant_id: string; project_id: string; number: string;
  subject: string; body: string | null;
  from_user_id: string | null; distribution_list_id: string | null;
  sent_at: string | null; created_at: string;
}

export function useProjectDocuments(projectId: string | null) {
  return useQuery<ProjectDocument[]>({
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
