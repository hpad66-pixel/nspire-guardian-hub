-- Universal capture links: a tokenized public URL per property/project. Anyone
-- with the link (e.g. a field crew on a phone) can snap + caption a photo and it
-- lands in that context's gallery. Uploads are handled by the gallery-capture
-- edge function (service role) which validates the token — the public never
-- touches photo_gallery directly, so RLS here is workspace-admin only.

CREATE TABLE IF NOT EXISTS public.gallery_upload_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text NOT NULL UNIQUE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES public.projects(id)   ON DELETE CASCADE,
  label       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_upload_links_context CHECK (
    (property_id IS NOT NULL AND project_id IS NULL) OR
    (project_id  IS NOT NULL AND property_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS gallery_upload_links_property_idx ON public.gallery_upload_links (property_id);
CREATE INDEX IF NOT EXISTS gallery_upload_links_project_idx  ON public.gallery_upload_links (project_id);

ALTER TABLE public.gallery_upload_links ENABLE ROW LEVEL SECURITY;

-- Workspace members manage their own context's links (mirrors gallery_albums).
CREATE POLICY gallery_upload_links_tenant_all ON public.gallery_upload_links
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = gallery_upload_links.property_id AND p.workspace_id = public.get_my_workspace_id()))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects pr WHERE pr.id = gallery_upload_links.project_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = gallery_upload_links.property_id AND p.workspace_id = public.get_my_workspace_id()))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects pr WHERE pr.id = gallery_upload_links.project_id))
  );
