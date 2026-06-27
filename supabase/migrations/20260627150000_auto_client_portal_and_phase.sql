-- Auto-provision a client portal for every project, and add a construction phase.
-- No manual setup: the moment a project is created, its client portal row exists,
-- scoped to the workspace. The GC just invites the client (one click) when ready.

-- 1) Construction lifecycle phase (separate from the internal status enum).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'planning'
  CHECK (phase IN ('planning', 'preconstruction', 'construction', 'punch_list', 'closeout'));

-- 2) Trigger: create the client portal on project insert. Defensive — it must
--    NEVER block project creation, and it skips if a portal already exists.
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
    RETURN NEW; -- can't provision safely; leave it to manual creation
  END IF;
  v_slug := trim(both '-' from lower(regexp_replace(coalesce(NEW.name, 'project'), '[^a-zA-Z0-9]+', '-', 'g')))
            || '-' || left(replace(NEW.id::text, '-', ''), 8);
  INSERT INTO public.client_portals
    (workspace_id, project_id, portal_type, name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
  VALUES
    (v_ws, NEW.id, 'client', coalesce(NEW.name, 'Project'), v_slug, 'active', true, '#1D6FE8', '{}', NEW.created_by)
  ON CONFLICT (portal_slug) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS projects_auto_portal ON public.projects;
CREATE TRIGGER projects_auto_portal
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.auto_provision_client_portal();

-- 3) Backfill: every existing project without a portal gets one now.
INSERT INTO public.client_portals
  (workspace_id, project_id, portal_type, name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
SELECT w.ws, p.id, 'client', coalesce(p.name, 'Project'),
       trim(both '-' from lower(regexp_replace(coalesce(p.name, 'project'), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(replace(p.id::text, '-', ''), 8),
       'active', true, '#1D6FE8', '{}', p.created_by
FROM public.projects p
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT workspace_id FROM public.properties WHERE id = p.property_id),
    (SELECT workspace_id FROM public.profiles WHERE user_id = p.created_by)
  ) AS ws
) w
WHERE p.created_by IS NOT NULL AND w.ws IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.client_portals cp WHERE cp.project_id = p.id)
ON CONFLICT (portal_slug) DO NOTHING;
