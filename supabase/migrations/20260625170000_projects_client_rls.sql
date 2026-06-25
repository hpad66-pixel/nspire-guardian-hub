-- Fix projects RLS so client / standalone projects work, not just property-linked ones.
--
-- The live policies (projects_select/insert/update/delete) scoped a project to the
-- caller's workspace ONLY through its property:
--   EXISTS (SELECT 1 FROM properties
--           WHERE properties.id = projects.property_id
--             AND properties.workspace_id = get_my_workspace_id())
-- That predates the client/standalone project type. A project created "under an
-- organization" has property_id = NULL and client_id set, so the EXISTS is false
-- and every operation (insert, select, update, delete) is denied with
-- "new row violates row-level security policy for table projects".
--
-- projects has no workspace_id column, so we scope through EITHER parent:
--   - property-linked: properties.workspace_id = get_my_workspace_id()  (unchanged)
--   - client/standalone: clients.workspace_id = get_my_workspace_id()   (new)
-- The clients row carries workspace_id (RLS-isolated), so this keeps tenant
-- isolation intact while unblocking organization-scoped projects.

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p
            WHERE p.id = projects.property_id
              AND p.workspace_id = public.get_my_workspace_id())
    OR EXISTS (SELECT 1 FROM public.clients c
               WHERE c.id = projects.client_id
                 AND c.workspace_id = public.get_my_workspace_id())
  );

DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p
            WHERE p.id = projects.property_id
              AND p.workspace_id = public.get_my_workspace_id())
    OR EXISTS (SELECT 1 FROM public.clients c
               WHERE c.id = projects.client_id
                 AND c.workspace_id = public.get_my_workspace_id())
  );

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p
            WHERE p.id = projects.property_id
              AND p.workspace_id = public.get_my_workspace_id())
    OR EXISTS (SELECT 1 FROM public.clients c
               WHERE c.id = projects.client_id
                 AND c.workspace_id = public.get_my_workspace_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p
            WHERE p.id = projects.property_id
              AND p.workspace_id = public.get_my_workspace_id())
    OR EXISTS (SELECT 1 FROM public.clients c
               WHERE c.id = projects.client_id
                 AND c.workspace_id = public.get_my_workspace_id())
  );

DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p
            WHERE p.id = projects.property_id
              AND p.workspace_id = public.get_my_workspace_id())
    OR EXISTS (SELECT 1 FROM public.clients c
               WHERE c.id = projects.client_id
                 AND c.workspace_id = public.get_my_workspace_id())
  );
