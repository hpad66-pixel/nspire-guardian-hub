
-- Fix 1: Update project_team_members RLS to allow project_managers to manage their own projects
DROP POLICY IF EXISTS "Admins and managers can manage team members" ON public.project_team_members;

-- Admins and managers (workspace-level) can manage all team members
CREATE POLICY "Admins and managers can manage team members"
ON public.project_team_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- Project managers who are members of a project can manage that project's team
CREATE POLICY "Project managers can manage their project team"
ON public.project_team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = project_team_members.project_id
      AND ptm.user_id = auth.uid()
      AND ptm.role IN ('project_manager', 'administrator', 'superintendent')
  )
);

-- Fix 2: Update projects SELECT RLS to also allow project team members to see their projects
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;

CREATE POLICY "Workspace members and project team can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
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
