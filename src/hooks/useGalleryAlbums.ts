import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GalleryAlbum {
  id: string;
  property_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
  photo_count?: number;
}

export interface AlbumPhoto {
  photo_id: string;
  sort_order: number;
  url: string;
  caption: string;
  taken_at: string;
}

type Ctx = { propertyId?: string; projectId?: string };

const keyFor = (ctx: Ctx) => ['gallery-albums', ctx.propertyId ?? ctx.projectId ?? 'none'];

/** Albums for a property or project, with a photo count each. */
export function useGalleryAlbums(ctx: Ctx) {
  const enabled = !!(ctx.propertyId || ctx.projectId);
  return useQuery({
    queryKey: keyFor(ctx),
    enabled,
    queryFn: async (): Promise<GalleryAlbum[]> => {
      const db = supabase as any;
      let q = db.from('gallery_albums').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      q = ctx.propertyId ? q.eq('property_id', ctx.propertyId) : q.eq('project_id', ctx.projectId);
      const { data: albums, error } = await q;
      if (error) throw error;
      const ids = (albums ?? []).map((a: GalleryAlbum) => a.id);
      const counts = new Map<string, number>();
      if (ids.length) {
        const { data: items } = await db.from('gallery_album_photos').select('album_id').in('album_id', ids);
        (items ?? []).forEach((it: { album_id: string }) => counts.set(it.album_id, (counts.get(it.album_id) ?? 0) + 1));
      }
      return (albums ?? []).map((a: GalleryAlbum) => ({ ...a, photo_count: counts.get(a.id) ?? 0 }));
    },
  });
}

/** Ordered photos inside a single album, joined to their photo_gallery rows. */
export function useAlbumPhotos(albumId: string | null) {
  return useQuery({
    queryKey: ['gallery-album-photos', albumId],
    enabled: !!albumId,
    queryFn: async (): Promise<AlbumPhoto[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from('gallery_album_photos')
        .select('photo_id, sort_order, photo:photo_gallery!photo_id(url, caption, taken_at)')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        photo_id: r.photo_id,
        sort_order: r.sort_order,
        url: r.photo?.url ?? '',
        caption: r.photo?.caption ?? '',
        taken_at: r.photo?.taken_at ?? '',
      }));
    },
  });
}

export function useAlbumMutations(ctx: Ctx) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keyFor(ctx) });
    qc.invalidateQueries({ queryKey: ['gallery-album-photos'] });
  };
  const db = () => supabase as any;

  const createAlbum = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db().from('gallery_albums').insert({
        name: name.trim(),
        description: description?.trim() || null,
        property_id: ctx.propertyId ?? null,
        project_id: ctx.projectId ?? null,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data as GalleryAlbum;
    },
    onSuccess: invalidate,
  });

  const renameAlbum = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await db().from('gallery_albums').update({ name: name.trim(), description: description?.trim() || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAlbum = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('gallery_albums').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addPhotosToAlbum = useMutation({
    mutationFn: async ({ albumId, photoIds, coverUrl }: { albumId: string; photoIds: string[]; coverUrl?: string }) => {
      if (!photoIds.length) return;
      // Append after the current max sort_order.
      const { data: existing } = await db().from('gallery_album_photos').select('sort_order').eq('album_id', albumId).order('sort_order', { ascending: false }).limit(1);
      let next = (existing?.[0]?.sort_order ?? -1) + 1;
      const rows = photoIds.map((pid) => ({ album_id: albumId, photo_id: pid, sort_order: next++ }));
      const { error } = await db().from('gallery_album_photos').upsert(rows, { onConflict: 'album_id,photo_id' });
      if (error) throw error;
      // Set a cover if the album doesn't have one yet.
      if (coverUrl) {
        const { data: album } = await db().from('gallery_albums').select('cover_url').eq('id', albumId).single();
        if (!album?.cover_url) await db().from('gallery_albums').update({ cover_url: coverUrl }).eq('id', albumId);
      }
    },
    onSuccess: invalidate,
  });

  const removePhotoFromAlbum = useMutation({
    mutationFn: async ({ albumId, photoId }: { albumId: string; photoId: string }) => {
      const { error } = await db().from('gallery_album_photos').delete().eq('album_id', albumId).eq('photo_id', photoId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setCover = useMutation({
    mutationFn: async ({ albumId, coverUrl }: { albumId: string; coverUrl: string }) => {
      const { error } = await db().from('gallery_albums').update({ cover_url: coverUrl }).eq('id', albumId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Persist a new order (array of photo_ids) inside an album. */
  const reorderAlbum = useMutation({
    mutationFn: async ({ albumId, orderedPhotoIds }: { albumId: string; orderedPhotoIds: string[] }) => {
      await Promise.all(
        orderedPhotoIds.map((pid, i) =>
          db().from('gallery_album_photos').update({ sort_order: i }).eq('album_id', albumId).eq('photo_id', pid),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery-album-photos'] }),
  });

  return { createAlbum, renameAlbum, deleteAlbum, addPhotosToAlbum, removePhotoFromAlbum, setCover, reorderAlbum };
}
