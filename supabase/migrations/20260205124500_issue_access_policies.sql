-- Align issue access with property access rules

-- Issues SELECT should be scoped to accessible properties
DROP POLICY IF EXISTS "Authenticated users can view issues" ON public.issues;

CREATE POLICY "Users can view accessible issues"
ON public.issues
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

-- Issues INSERT should require access to the property and correct creator
DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;

CREATE POLICY "Users can create issues for accessible properties"
ON public.issues
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND public.can_access_property(auth.uid(), property_id)
);

-- Issues UPDATE should allow admins/owners/managers or creator/assignee
DROP POLICY IF EXISTS "Users can update issues they created or are assigned to" ON public.issues;

CREATE POLICY "Users can update accessible issues"
ON public.issues
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
);
