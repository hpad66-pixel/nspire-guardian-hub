
-- Fix infinite recursion in project_team_members RLS policy
-- The policy was querying project_team_members inside its own policy = infinite loop

-- 1. Create a SECURITY DEFINER function to safely check project membership
--    This bypasses RLS, breaking the recursive cycle
CREATE OR REPLACE FUNCTION public.is_project_team_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_team_members
    WHERE user_id = _user_id
      AND project_id = _project_id
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Project managers can manage their project team" ON public.project_team_members;

-- 3. Recreate it using the safe SECURITY DEFINER function
CREATE POLICY "Project managers can manage their project team"
ON public.project_team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('project_manager', 'administrator', 'superintendent')
  )
  AND is_project_team_member(auth.uid(), project_id)
);

-- 4. Also fix the projects SELECT policy to use the safe function
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
  -- Project team members can always see their assigned project (uses safe function)
  is_project_team_member(auth.uid(), projects.id)
);
