-- Gallery management: hide / archive / arrange + albums.
-- Builds on the existing public.photo_gallery table (property/project-scoped,
-- RLS via the parent property's workspace). Additive and backwards-compatible:
-- every new column has a default so existing rows and flows keep working.

-- ── 1. photo_gallery: per-photo management state ─────────────────────────────
ALTER TABLE public.photo_gallery
  ADD COLUMN IF NOT EXISTS sort_order  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Fast filtering of the active (not archived, not hidden) set per context.
CREATE INDEX IF NOT EXISTS photo_gallery_property_active_idx
  ON public.photo_gallery (property_id, archived_at, is_hidden, taken_at DESC);
CREATE INDEX IF NOT EXISTS photo_gallery_project_active_idx
  ON public.photo_gallery (project_id, archived_at, is_hidden, taken_at DESC);

-- ── 2. gallery_albums ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_albums (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES public.projects(id)   ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  cover_url    text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_albums_context CHECK (
    (property_id IS NOT NULL AND project_id IS NULL) OR
    (project_id  IS NOT NULL AND property_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS gallery_albums_property_idx ON public.gallery_albums (property_id, sort_order);
CREATE INDEX IF NOT EXISTS gallery_albums_project_idx  ON public.gallery_albums (project_id, sort_order);

-- ── 3. gallery_album_photos (album → photo_gallery, ordered) ─────────────────
CREATE TABLE IF NOT EXISTS public.gallery_album_photos (
  album_id    uuid NOT NULL REFERENCES public.gallery_albums(id)  ON DELETE CASCADE,
  photo_id    uuid NOT NULL REFERENCES public.photo_gallery(id)   ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (album_id, photo_id)
);
CREATE INDEX IF NOT EXISTS gallery_album_photos_album_idx ON public.gallery_album_photos (album_id, sort_order);

-- ── 4. RLS — mirror photo_gallery (parent property's workspace), plus the
--        project path (leans on projects' own RLS), plus super admin. ────────
ALTER TABLE public.gallery_albums       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_album_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY gallery_albums_tenant_all ON public.gallery_albums
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = gallery_albums.property_id AND p.workspace_id = public.get_my_workspace_id()))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects pr WHERE pr.id = gallery_albums.project_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = gallery_albums.property_id AND p.workspace_id = public.get_my_workspace_id()))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects pr WHERE pr.id = gallery_albums.project_id))
  );

-- Album-photo membership is visible/editable when its album is.
CREATE POLICY gallery_album_photos_tenant_all ON public.gallery_album_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gallery_albums a WHERE a.id = gallery_album_photos.album_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gallery_albums a WHERE a.id = gallery_album_photos.album_id));

-- Keep updated_at fresh on albums.
CREATE OR REPLACE FUNCTION public.touch_gallery_albums_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS gallery_albums_touch_updated_at ON public.gallery_albums;
CREATE TRIGGER gallery_albums_touch_updated_at
  BEFORE UPDATE ON public.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.touch_gallery_albums_updated_at();
