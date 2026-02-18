
DROP POLICY IF EXISTS "Workspace members and project team can view projects" ON public.projects;
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;

CREATE POLICY "Workspace members and team members can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  -- Condition 1: property-linked projects in my workspace
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = projects.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
  OR
  -- Condition 2: projects with no property (standalone/client projects) in my workspace
  (
    property_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.workspace_id = public.get_my_workspace_id()
    )
  )
  OR
  -- Condition 3: projects where I am a direct team member (cross-workspace invitations)
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = projects.id
      AND ptm.user_id = auth.uid()
  )
);
