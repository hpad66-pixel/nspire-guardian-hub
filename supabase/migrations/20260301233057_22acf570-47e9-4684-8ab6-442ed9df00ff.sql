-- Fix infinite recursion in projects SELECT RLS policy
-- Cause: projects policy queried project_team_members directly while
-- project_team_members policies also query projects, creating a recursion loop.

DROP POLICY IF EXISTS "projects_select" ON public.projects;

CREATE POLICY "projects_select"
ON public.projects
FOR SELECT
TO authenticated
USING (
  (
    property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.id = projects.property_id
        AND properties.workspace_id = public.get_my_workspace_id()
    )
  )
  OR
  (
    property_id IS NULL
    AND (
      (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        AND EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.workspace_id = public.get_my_workspace_id()
        )
      )
      OR
      (
        client_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.clients
          WHERE clients.id = projects.client_id
            AND clients.workspace_id = public.get_my_workspace_id()
        )
      )
      OR
      (
        created_by IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.user_id = projects.created_by
            AND profiles.workspace_id = public.get_my_workspace_id()
        )
      )
    )
  )
  OR
  public.is_project_team_member(auth.uid(), projects.id)
);