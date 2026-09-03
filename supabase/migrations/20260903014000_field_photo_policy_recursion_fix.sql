BEGIN;

-- The owner-read policies on photos and field_accountability_photos used to
-- select from each other. Postgres expands every permissive policy while it
-- plans the embedded photo query, so that circular dependency raised
-- "infinite recursion detected in policy" for both staff previews and owners.
-- Keep the same access rules behind SECURITY DEFINER predicates so policy
-- evaluation never re-enters either protected relation.
CREATE OR REPLACE FUNCTION public.owner_can_read_field_photo(p_photo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.photos ph
      JOIN public.field_accountability_photos fp
        ON fp.photo_id = ph.id
       AND fp.project_id = ph.project_id
       AND fp.tenant_id = ph.tenant_id
      LEFT JOIN public.field_accountability_items item
        ON item.id = fp.item_id
       AND item.project_id = fp.project_id
       AND item.tenant_id = fp.tenant_id
      WHERE ph.id = p_photo_id
        AND public.owner_can_access_project(ph.project_id)
        AND (
          ph.uploader_id = auth.uid()
          OR (
            fp.item_id IS NOT NULL
            AND item.owner_visible
            AND item.archived_at IS NULL
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.owner_can_read_field_photo_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.photos ph
    WHERE (ph.storage_path = p_object_name OR ph.thumb_path = p_object_name)
      AND public.owner_can_read_field_photo(ph.id)
  );
$$;

REVOKE ALL ON FUNCTION public.owner_can_read_field_photo(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_can_read_field_photo_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_can_read_field_photo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_can_read_field_photo_object(text) TO authenticated;

DROP POLICY IF EXISTS field_photos_owner_read ON public.field_accountability_photos;
CREATE POLICY field_photos_owner_read
  ON public.field_accountability_photos FOR SELECT TO authenticated
  USING (public.owner_can_read_field_photo(photo_id));

DROP POLICY IF EXISTS photos_owner_accountability_read ON public.photos;
CREATE POLICY photos_owner_accountability_read
  ON public.photos FOR SELECT TO authenticated
  USING (public.owner_can_read_field_photo(id));

DROP POLICY IF EXISTS project_photos_owner_accountability_read ON storage.objects;
CREATE POLICY project_photos_owner_accountability_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND public.owner_can_read_field_photo_object(name)
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
