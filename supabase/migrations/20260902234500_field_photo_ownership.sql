BEGIN;

-- Captions are testimony from the person who uploaded the photograph. Keep the
-- original image immutable and preserve every caption revision as an audit log.
CREATE TABLE IF NOT EXISTS public.field_photo_caption_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  prior_caption text,
  new_caption text,
  edited_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS field_photo_caption_revisions_photo_date_idx
  ON public.field_photo_caption_revisions(photo_id, edited_at DESC);

ALTER TABLE public.field_photo_caption_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_caption_revisions_staff_read
  ON public.field_photo_caption_revisions FOR SELECT TO authenticated
  USING (
    (public.current_portal_kind() = 'main'
      AND tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(project_id, tenant_id))
    OR public.is_super_admin()
  );

CREATE POLICY field_caption_revisions_owner_read
  ON public.field_photo_caption_revisions FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND edited_by = auth.uid()
    AND public.owner_can_access_project(project_id)
  );

CREATE OR REPLACE FUNCTION public.audit_field_photo_caption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restrict only photographs in Field Accountability; other photo modules keep
  -- their existing behavior.
  IF EXISTS (
    SELECT 1 FROM public.field_accountability_photos fp WHERE fp.photo_id = OLD.id
  ) THEN
    IF auth.uid() IS NULL OR OLD.uploader_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the person who uploaded this photograph may edit its caption';
    END IF;

    INSERT INTO public.field_photo_caption_revisions(
      tenant_id, project_id, photo_id, prior_caption, new_caption, edited_by
    ) VALUES (
      OLD.tenant_id, OLD.project_id, OLD.id, OLD.caption, NEW.caption, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS field_photo_caption_audit ON public.photos;
CREATE TRIGGER field_photo_caption_audit
BEFORE UPDATE OF caption ON public.photos
FOR EACH ROW
WHEN (OLD.caption IS DISTINCT FROM NEW.caption)
EXECUTE FUNCTION public.audit_field_photo_caption();

CREATE OR REPLACE FUNCTION public.update_field_photo_caption(
  p_photo_id uuid,
  p_caption text
)
RETURNS public.photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo public.photos;
  v_caption text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(COALESCE(p_caption, '')) > 2000 THEN
    RAISE EXCEPTION 'Caption must be 2,000 characters or fewer';
  END IF;

  SELECT * INTO v_photo FROM public.photos WHERE id = p_photo_id;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.field_accountability_photos fp WHERE fp.photo_id = p_photo_id
  ) THEN
    RAISE EXCEPTION 'Field photograph not found';
  END IF;
  IF v_photo.uploader_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the person who uploaded this photograph may edit its caption';
  END IF;
  IF NOT (
    public.is_super_admin()
    OR (
      public.current_portal_kind() = 'main'
      AND v_photo.tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(v_photo.project_id, v_photo.tenant_id)
    )
    OR (
      public.current_portal_kind() = 'owner'
      AND v_photo.tenant_id = public.current_portal_tenant_id()
      AND public.owner_can_access_project(v_photo.project_id)
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized for this project';
  END IF;

  v_caption := NULLIF(trim(COALESCE(p_caption, '')), '');
  UPDATE public.photos SET caption = v_caption WHERE id = p_photo_id RETURNING * INTO v_photo;
  RETURN v_photo;
END;
$$;

REVOKE ALL ON FUNCTION public.update_field_photo_caption(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_field_photo_caption(uuid,text) TO authenticated;

-- AI may save a suggestion, but only against a photo that the caller can see.
-- The suggestion remains separate from the uploader's caption until approved.
CREATE OR REPLACE FUNCTION public.save_field_photo_ai_suggestion(
  p_photo_link_id uuid,
  p_suggestion jsonb
)
RETURNS public.field_accountability_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.field_accountability_photos;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_suggestion IS NULL OR jsonb_typeof(p_suggestion) <> 'object' THEN
    RAISE EXCEPTION 'AI suggestion must be a JSON object';
  END IF;

  SELECT * INTO v_link FROM public.field_accountability_photos WHERE id = p_photo_link_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field photograph not found'; END IF;
  IF NOT (
    public.is_super_admin()
    OR (
      public.current_portal_kind() = 'main'
      AND v_link.tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(v_link.project_id, v_link.tenant_id)
    )
    OR (
      public.current_portal_kind() = 'owner'
      AND v_link.tenant_id = public.current_portal_tenant_id()
      AND public.owner_can_access_project(v_link.project_id)
      AND EXISTS (
        SELECT 1 FROM public.photos ph
        WHERE ph.id = v_link.photo_id AND ph.uploader_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized for this photograph';
  END IF;

  UPDATE public.field_accountability_photos
  SET ai_suggestion = p_suggestion
  WHERE id = p_photo_link_id
  RETURNING * INTO v_link;
  RETURN v_link;
END;
$$;

REVOKE ALL ON FUNCTION public.save_field_photo_ai_suggestion(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_field_photo_ai_suggestion(uuid,jsonb) TO authenticated;

-- Client/owner portal users may create a walk and place their own untriaged
-- photographs into the project's private inbox. They cannot publish or attach
-- those files to an accountable item themselves.
CREATE POLICY field_visits_owner_create
  ON public.field_visits FOR INSERT TO authenticated
  WITH CHECK (
    public.current_portal_kind() = 'owner'
    AND tenant_id = public.current_portal_tenant_id()
    AND created_by = auth.uid()
    AND public.owner_can_access_project(project_id)
  );

CREATE POLICY field_photos_owner_create
  ON public.field_accountability_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.current_portal_kind() = 'owner'
    AND tenant_id = public.current_portal_tenant_id()
    AND created_by = auth.uid()
    AND item_id IS NULL
    AND visit_id IS NOT NULL
    AND public.owner_can_access_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.field_visits visit
      WHERE visit.id = visit_id
        AND visit.project_id = field_accountability_photos.project_id
        AND visit.tenant_id = field_accountability_photos.tenant_id
        AND visit.created_by = auth.uid()
    )
  );

CREATE POLICY photos_owner_accountability_create
  ON public.photos FOR INSERT TO authenticated
  WITH CHECK (
    public.current_portal_kind() = 'owner'
    AND tenant_id = public.current_portal_tenant_id()
    AND uploader_id = auth.uid()
    AND public.owner_can_access_project(project_id)
  );

DROP POLICY IF EXISTS field_photos_owner_read ON public.field_accountability_photos;
CREATE POLICY field_photos_owner_read
  ON public.field_accountability_photos FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND public.owner_can_access_project(project_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.photos ph
        WHERE ph.id = photo_id AND ph.uploader_id = auth.uid()
      )
      OR (
        item_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.field_accountability_items item
          WHERE item.id = item_id AND item.owner_visible
        )
      )
    )
  );

DROP POLICY IF EXISTS photos_owner_accountability_read ON public.photos;
CREATE POLICY photos_owner_accountability_read
  ON public.photos FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND public.owner_can_access_project(project_id)
    AND EXISTS (
      SELECT 1
      FROM public.field_accountability_photos fp
      LEFT JOIN public.field_accountability_items item ON item.id = fp.item_id
      WHERE fp.photo_id = photos.id
        AND (photos.uploader_id = auth.uid() OR item.owner_visible)
    )
  );

DROP POLICY IF EXISTS project_photos_owner_accountability_read ON storage.objects;
CREATE POLICY project_photos_owner_accountability_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.photos ph
      JOIN public.field_accountability_photos fp ON fp.photo_id = ph.id
      LEFT JOIN public.field_accountability_items item ON item.id = fp.item_id
      WHERE ph.storage_path = storage.objects.name
        AND public.owner_can_access_project(ph.project_id)
        AND (ph.uploader_id = auth.uid() OR item.owner_visible)
    )
  );

CREATE POLICY project_photos_owner_accountability_create
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-photos'
    AND public.current_portal_kind() = 'owner'
    AND (storage.foldername(name))[1] = public.current_portal_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM public.projects project
      WHERE project.id::text = (storage.foldername(name))[2]
        AND public.owner_can_access_project(project.id)
    )
  );

GRANT SELECT ON public.field_photo_caption_revisions TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
