
-- Allow project_manager role to create projects (in addition to admin/manager)
DROP POLICY IF EXISTS "Admins and managers can create projects" ON public.projects;

CREATE POLICY "Admins, managers and project managers can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'project_manager'::app_role)
);

-- Also allow project_manager role to update projects they are team members of
DROP POLICY IF EXISTS "Admins and managers can update projects" ON public.projects;

CREATE POLICY "Admins, managers and project members can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'project_manager'::app_role)
  OR is_project_team_member(auth.uid(), id)
);
