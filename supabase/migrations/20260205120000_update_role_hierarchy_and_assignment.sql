-- Update role priorities to reflect finalized hierarchy
UPDATE public.role_definitions
SET priority = CASE role_key
  WHEN 'admin' THEN 100
  WHEN 'owner' THEN 90
  WHEN 'manager' THEN 80
  WHEN 'inspector' THEN 70
  WHEN 'project_manager' THEN 60
  WHEN 'superintendent' THEN 50
  WHEN 'subcontractor' THEN 40
  WHEN 'viewer' THEN 20
  WHEN 'user' THEN 10
  ELSE priority
END
WHERE role_key IN (
  'admin',
  'owner',
  'manager',
  'inspector',
  'project_manager',
  'superintendent',
  'subcontractor',
  'viewer',
  'user'
);

-- Helper: role priority lookup
CREATE OR REPLACE FUNCTION public.role_priority(_role app_role)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT priority FROM public.role_definitions WHERE role_key = _role::text),
    0
  );
$$;

-- Helper: max role priority for a user
CREATE OR REPLACE FUNCTION public.user_max_role_priority(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.role_priority(role)), 0)
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- Rule: only admin/owner can assign property manager; managers can assign below
CREATE OR REPLACE FUNCTION public.can_assign_role(_user_id uuid, _target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_priority integer;
  target_priority integer;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  IF _target_role = 'manager' AND NOT public.has_role(_user_id, 'owner') THEN
    RETURN false;
  END IF;

  max_priority := public.user_max_role_priority(_user_id);
  target_priority := public.role_priority(_target_role);

  RETURN max_priority > target_priority;
END;
$$;

-- Update user_roles policies to use hierarchy-aware assignment
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Role managers can view roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Role managers can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can update roles"
ON public.user_roles
FOR UPDATE
USING (public.can_assign_role(auth.uid(), role))
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can delete roles"
ON public.user_roles
FOR DELETE
USING (public.can_assign_role(auth.uid(), role));

-- Update property_team_members policies to use hierarchy-aware assignment
DROP POLICY IF EXISTS "Admins and managers can insert team members" ON public.property_team_members;
DROP POLICY IF EXISTS "Admins and managers can update team members" ON public.property_team_members;
DROP POLICY IF EXISTS "Only admins can delete team members" ON public.property_team_members;

CREATE POLICY "Role managers can insert team members"
ON public.property_team_members
FOR INSERT
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can update team members"
ON public.property_team_members
FOR UPDATE
USING (public.can_assign_role(auth.uid(), role))
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can delete team members"
ON public.property_team_members
FOR DELETE
USING (public.can_assign_role(auth.uid(), role));

-- Update user_invitations policies to use hierarchy-aware assignment
DROP POLICY IF EXISTS "Admins and managers can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins and managers can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;

CREATE POLICY "Role managers can view invitations"
ON public.user_invitations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Role managers can create invitations"
ON public.user_invitations
FOR INSERT
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can update invitations"
ON public.user_invitations
FOR UPDATE
USING (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Role managers can delete invitations"
ON public.user_invitations
FOR DELETE
USING (public.can_assign_role(auth.uid(), role));
