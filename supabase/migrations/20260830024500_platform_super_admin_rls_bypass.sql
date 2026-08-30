-- Platform super-administrators need a cross-tenant portfolio view. Existing
-- tenant policies remain unchanged for every other authenticated user, and
-- cross-tenant writes continue to use the application's audited admin paths.

BEGIN;

DROP POLICY IF EXISTS platform_super_admin_select ON public.projects;
CREATE POLICY platform_super_admin_select ON public.projects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- useProjects() embeds these related records. Their read policies must admit
-- the same protected caller or PostgREST returns incomplete project cards.
DROP POLICY IF EXISTS platform_super_admin_select ON public.properties;
CREATE POLICY platform_super_admin_select ON public.properties
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS platform_super_admin_select ON public.clients;
CREATE POLICY platform_super_admin_select ON public.clients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS platform_super_admin_select ON public.project_milestones;
CREATE POLICY platform_super_admin_select ON public.project_milestones
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_super_admin());

COMMIT;
