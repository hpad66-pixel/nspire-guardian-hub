-- Replace demo-based property access with assignment-based access

-- Drop dependent policies FIRST so the function drop below can proceed.
-- (Fixed 2026-04-21: original version hit "cannot drop function because other
--  objects depend on it" when applied against a clean DB where the policy still
--  existed. Dropping the policy ahead of the function, or using CASCADE, resolves it.)
DROP POLICY IF EXISTS "Users can view appropriate properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;

-- Drop demo access function if present (CASCADE as defence-in-depth against any
-- other dependents that may have been introduced across different environments)
DROP FUNCTION IF EXISTS public.can_view_demo_property(uuid) CASCADE;

-- Property access helper: admin/owner see all, otherwise must be active team member
CREATE OR REPLACE FUNCTION public.can_access_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'owner')
    OR EXISTS (
      SELECT 1
      FROM public.property_team_members ptm
      WHERE ptm.user_id = _user_id
        AND ptm.property_id = _property_id
        AND ptm.status = 'active'
    );
$$;

-- Update properties SELECT policy to use assignment-based access
DROP POLICY IF EXISTS "Users can view appropriate properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;

CREATE POLICY "Users can view accessible properties"
ON public.properties
FOR SELECT
USING (public.can_access_property(auth.uid(), id));

-- Restrict property_team_members visibility to admins/owners/managers or members of the property
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.property_team_members;

CREATE POLICY "Users can view accessible team members"
ON public.property_team_members
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'manager')
  OR public.can_access_property(auth.uid(), property_id)
);
