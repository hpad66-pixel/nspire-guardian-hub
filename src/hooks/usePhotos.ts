import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface Photo {
  id: string; tenant_id: string; project_id: string; uploader_id: string | null;
  storage_path: string; thumb_path: string | null;
  taken_at: string | null; lat: number | null; lng: number | null;
  exif: Record<string, unknown>; caption: string | null; is_private: boolean;
  created_at: string;
}

export interface PhotoAlbum {
  id: string; tenant_id: string; project_id: string;
  name: string; description: string | null;
  created_by: string | null; created_at: string;
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
      return (data ?? []) as unknown as Photo[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: {
      file: File;
      caption?: string;
      lat?: number; lng?: number;
      takenAt?: string | null;
      exif?: Record<string, unknown>;
    }) => {
      // #5: resolve the workspace the same way the rest of the app does
      // (JWT claim → portal membership → profiles.workspace_id). The old
      // requireTenantId() only read the JWT tenant_id claim, which is absent
      // in this deployment, so uploads threw and the gallery stayed blank.
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
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
        taken_at: input.takenAt ?? null,
        exif: input.exif ?? {},
      } as any).select().single();
      if (error) throw error;
      return data as unknown as Photo;
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

  const detach = useMutation({
    mutationFn: async (input: { photoId: string; recordId: string; recordType: string }) => {
      const { error } = await supabase.from("photo_links" as any).delete()
        .eq("photo_id", input.photoId)
        .eq("linked_record_id", input.recordId)
        .eq("linked_record_type", input.recordType);
      if (error) throw error;
    },
  });

  return { ...list, upload, attach, detach };
}

/** Photos attached to a single record (RFI, Punch, Daily, Submittal). */
export function useLinkedPhotos(recordId: string | null, recordType: string | null) {
  return useQuery<Photo[]>({
    queryKey: ["linked-photos", recordType, recordId],
    enabled: Boolean(recordId && recordType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_links" as any)
        .select("photo:photos(*)")
        .eq("linked_record_id", recordId!)
        .eq("linked_record_type", recordType!);
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((row: any) => row.photo)
        .filter(Boolean) as Photo[];
    },
  });
}

export function usePhotoAlbums(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<PhotoAlbum[]>({
    queryKey: ["photo-albums", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_albums" as any).select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PhotoAlbum[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string; description?: string; photoIds?: string[];
    }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      if (!projectId) throw new Error("No project");
      const { data: album, error } = await supabase
        .from("photo_albums" as any)
        .insert({
          tenant_id, project_id: projectId,
          name: input.name, description: input.description ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (input.photoIds && input.photoIds.length > 0) {
        const rows = input.photoIds.map((pid, i) => ({
          album_id: (album as any).id, photo_id: pid, sort_order: i,
        }));
        const { error: linkErr } = await supabase
          .from("photo_album_items" as any).insert(rows as any);
        if (linkErr) throw linkErr;
      }
      return album as unknown as PhotoAlbum;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-albums", projectId] }),
  });

  return { ...list, create };
}
