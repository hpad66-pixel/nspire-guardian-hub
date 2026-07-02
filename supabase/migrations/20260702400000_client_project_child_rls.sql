-- Fix RLS on project child tables so client/standalone projects work, not just
-- property-linked ones.
--
-- These tables scoped a row to the caller's workspace ONLY through the project's
-- property:  projects p JOIN properties pr ON pr.id = p.property_id ...
-- A consulting project has property_id = NULL and client_id set, so that EXISTS
-- is always false and every insert/update/delete/select is denied — which shows
-- up as "can't add team members / can't create milestones / discussions fail" on
-- consulting projects. (The projects table itself was already fixed the same way
-- in 20260625170000.)
--
-- Fix: add a permissive policy that also scopes through the project's client
-- (clients.workspace_id = get_my_workspace_id()). Permissive policies are OR'd,
-- so property-linked projects keep working unchanged; client-linked projects are
-- now unblocked. Tenant isolation is preserved (both parents carry workspace_id).

-- Reusable predicate: the project this row belongs to is in my workspace via
-- EITHER its property OR its client.
--   project_team_members / project_milestones / project_discussions
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['project_team_members','project_milestones','project_discussions'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl||'_client_all', tbl);
      EXECUTE format($f$
        CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = %I.project_id AND (
            EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
            OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
          )))
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = %I.project_id AND (
            EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
            OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
          )))
      $f$, tbl||'_client_all', tbl, tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Replies scope through their discussion -> project.
DROP POLICY IF EXISTS project_discussion_replies_client_all ON public.project_discussion_replies;
CREATE POLICY project_discussion_replies_client_all ON public.project_discussion_replies FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id
    WHERE pd.id = project_discussion_replies.discussion_id AND (
      EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
    )))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id
    WHERE pd.id = project_discussion_replies.discussion_id AND (
      EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
    )));

NOTIFY pgrst, 'reload schema';
