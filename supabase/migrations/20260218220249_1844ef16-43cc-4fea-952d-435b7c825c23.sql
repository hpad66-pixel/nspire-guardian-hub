
-- Fix: Restore admin bypass in the projects SELECT policy
DROP POLICY IF EXISTS "Workspace members and project team can view projects" ON public.projects;

CREATE POLICY "Workspace members and project team can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  -- Admins and managers can see all projects in their workspace
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR
  -- Workspace members can see projects linked to their workspace properties
  (
    property_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = projects.property_id
        AND p.workspace_id = get_my_workspace_id()
    )
  )
  OR
  -- Project team members can always see their assigned project
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = projects.id
      AND ptm.user_id = auth.uid()
  )
);
