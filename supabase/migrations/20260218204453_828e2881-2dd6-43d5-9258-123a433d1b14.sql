
-- STEP 1 — Add workspace_id to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- STEP 2 — Migrate all existing properties to the default workspace
UPDATE public.properties
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- STEP 3 — Update can_access_property() with workspace awareness
CREATE OR REPLACE FUNCTION public.can_access_property(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin or owner can access any property in their workspace
    (
      (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'owner'))
      AND EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.profiles pr ON pr.workspace_id = p.workspace_id
        WHERE p.id = _property_id AND pr.user_id = _user_id
      )
    )
    OR
    -- Property team member with active assignment in same workspace
    EXISTS (
      SELECT 1
      FROM public.property_team_members ptm
      JOIN public.properties p ON p.id = ptm.property_id
      JOIN public.profiles pr ON pr.user_id = ptm.user_id AND pr.workspace_id = p.workspace_id
      WHERE ptm.user_id = _user_id
        AND ptm.property_id = _property_id
        AND ptm.status = 'active'
        AND pr.user_id = _user_id
    );
$$;

-- STEP 4 — Replace SELECT policy with workspace-aware version
DROP POLICY IF EXISTS "Users can view accessible properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view appropriate properties" ON public.properties;

CREATE POLICY "Workspace members can view accessible properties"
ON public.properties FOR SELECT
USING (
  workspace_id = public.get_my_workspace_id()
  AND public.can_access_property(auth.uid(), id)
);

-- STEP 5 — Replace INSERT/UPDATE/DELETE policies with workspace-scoped versions
DROP POLICY IF EXISTS "Admins can create properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;

CREATE POLICY "Workspace admins can create properties"
ON public.properties FOR INSERT
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

CREATE POLICY "Workspace admins can update properties"
ON public.properties FOR UPDATE
USING (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Workspace admins can delete properties"
ON public.properties FOR DELETE
USING (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);
