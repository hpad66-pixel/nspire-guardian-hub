-- ============================================================
-- B4 · Photos — geo/date-stamped photo library.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  thumb_path text,
  taken_at timestamptz,
  lat numeric,
  lng numeric,
  exif jsonb NOT NULL DEFAULT '{}'::jsonb,
  caption text,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_project_date ON public.photos(project_id, taken_at DESC);

CREATE TABLE IF NOT EXISTS public.photo_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_album_items (
  album_id uuid NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, photo_id)
);

CREATE TABLE IF NOT EXISTS public.photo_links (
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  linked_record_id uuid NOT NULL,
  linked_record_type text NOT NULL,
  PRIMARY KEY (photo_id, linked_record_id, linked_record_type)
);

CREATE TABLE IF NOT EXISTS public.photo_tags (
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (photo_id, tag)
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_album_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY ph_tenant ON public.photos FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pa_tenant ON public.photo_albums FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pai_via_album ON public.photo_album_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photo_albums a WHERE a.id = photo_album_items.album_id
                 AND (a.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.photo_albums a WHERE a.id = photo_album_items.album_id
                      AND (a.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY pl_via_photo ON public.photo_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_links.photo_id
                 AND (p.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_links.photo_id
                      AND (p.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY pt_via_photo ON public.photo_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_tags.photo_id
                 AND (p.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_tags.photo_id
                      AND (p.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS project_photos_tenant_read ON storage.objects;
CREATE POLICY project_photos_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
DROP POLICY IF EXISTS project_photos_tenant_write ON storage.objects;
CREATE POLICY project_photos_tenant_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
