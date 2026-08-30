-- Owner portal: curated documents + action items the PM shares with the client.
-- client_documents was tenant-staff only; the restrictive staff boundary hid it
-- from owner identities. New projects start as draft until a PM activates them.

BEGIN;

-- New projects stay private until the PM clicks Activate.
CREATE OR REPLACE FUNCTION public.auto_provision_client_portal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ws   uuid;
  v_slug text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.client_portals WHERE project_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  v_ws := (SELECT workspace_id FROM public.properties WHERE id = NEW.property_id);
  IF v_ws IS NULL THEN
    v_ws := (SELECT workspace_id FROM public.profiles WHERE user_id = NEW.created_by);
  END IF;
  IF v_ws IS NULL OR NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;
  v_slug := trim(both '-' from lower(regexp_replace(coalesce(NEW.name, 'project'), '[^a-zA-Z0-9]+', '-', 'g')))
            || '-' || left(replace(NEW.id::text, '-', ''), 8);
  INSERT INTO public.client_portals
    (workspace_id, project_id, portal_type, name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
  VALUES
    (v_ws, NEW.id, 'client', coalesce(NEW.name, 'Project'), v_slug, 'draft', false, '#1D6FE8', '{}', NEW.created_by)
  ON CONFLICT (portal_slug) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

-- Drop the deny-by-default staff boundary so owner policies can grant a slice.
DROP POLICY IF EXISTS client_portal_staff_boundary ON public.client_documents;
DROP POLICY IF EXISTS client_portal_boundary ON public.client_documents;
DROP POLICY IF EXISTS client_documents_owner_portal_select ON public.client_documents;

CREATE POLICY client_portal_boundary ON public.client_documents
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main'
    OR public.is_super_admin()
    OR public.owner_can_access_project(project_id)
  );

CREATE POLICY client_documents_owner_portal_select ON public.client_documents
  FOR SELECT TO authenticated
  USING (public.owner_can_access_project(project_id));

DROP POLICY IF EXISTS client_portal_staff_boundary ON public.client_action_items;
DROP POLICY IF EXISTS client_portal_boundary ON public.client_action_items;
DROP POLICY IF EXISTS client_action_items_owner_portal_select ON public.client_action_items;
DROP POLICY IF EXISTS client_action_items_owner_portal_update ON public.client_action_items;

CREATE POLICY client_portal_boundary ON public.client_action_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.current_portal_kind() = 'main'
    OR public.is_super_admin()
    OR public.owner_can_access_project(project_id)
  )
  WITH CHECK (
    public.current_portal_kind() = 'main'
    OR public.is_super_admin()
    OR public.owner_can_access_project(project_id)
  );

CREATE POLICY client_action_items_owner_portal_select ON public.client_action_items
  FOR SELECT TO authenticated
  USING (public.owner_can_access_project(project_id));

CREATE POLICY client_action_items_owner_portal_update ON public.client_action_items
  FOR UPDATE TO authenticated
  USING (public.owner_can_access_project(project_id))
  WITH CHECK (public.owner_can_access_project(project_id));

COMMIT;
