-- Fix: Add 'owner' role to the projects SELECT policy
-- The current policy only checks admin and manager, missing owner role

DROP POLICY IF EXISTS "Workspace members and project team can view projects" ON public.projects;

CREATE POLICY "Workspace members and project team can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  -- Admins, owners, and managers can see ALL projects in their workspace
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  -- Anyone can see standalone/client projects (no property)
  OR property_id IS NULL
  -- Property-linked projects: visible to workspace members who can access that property
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = projects.property_id
      AND p.workspace_id = get_my_workspace_id()
  )
  -- Direct project team members can always see their projects
  OR is_project_team_member(auth.uid(), id)
);