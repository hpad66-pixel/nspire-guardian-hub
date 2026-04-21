import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Photo {
  id: string; tenant_id: string; project_id: string; uploader_id: string | null;
  storage_path: string; thumb_path: string | null;
  taken_at: string | null; lat: number | null; lng: number | null;
  exif: Record<string, unknown>; caption: string | null; is_private: boolean;
  created_at: string;
}

export function usePhotos(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<Photo[]>({
    queryKey: ["photos", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos" as any).select("*")
        .eq("project_id", projectId!)
        .order("taken_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: { file: File; caption?: string; lat?: number; lng?: number }) => {
      const tenant_id = await requireTenantId();
      if (!projectId) throw new Error("No project");
      const path = `${tenant_id}/${projectId}/${crypto.randomUUID()}-${input.file.name}`;
      const { error: upErr } = await supabase.storage
        .from("project-photos")
        .upload(path, input.file);
      if (upErr) throw upErr;

      const { data, error } = await supabase.from("photos" as any).insert({
        tenant_id,
        project_id: projectId,
        storage_path: path,
        caption: input.caption ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      } as any).select().single();
      if (error) throw error;
      return data as Photo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", projectId] }),
  });

  const attach = useMutation({
    mutationFn: async (input: { photoId: string; recordId: string; recordType: string }) => {
      const { error } = await supabase.from("photo_links" as any).insert({
        photo_id: input.photoId,
        linked_record_id: input.recordId,
        linked_record_type: input.recordType,
      } as any);
      if (error) throw error;
    },
  });

  return { ...list, upload, attach };
}
