-- Enforce property-scoped access for portfolio modules

-- Helper: access to unit via property assignment
CREATE OR REPLACE FUNCTION public.can_access_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.units u
    WHERE u.id = _unit_id
      AND public.can_access_property(_user_id, u.property_id)
  );
$$;

-- Assets
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and managers can create assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and managers can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;

CREATE POLICY "Users can view accessible assets"
ON public.assets
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Managers can create accessible assets"
ON public.assets
FOR INSERT
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Managers can update accessible assets"
ON public.assets
FOR UPDATE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Admins can delete accessible assets"
ON public.assets
FOR DELETE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
);

-- Units
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;
DROP POLICY IF EXISTS "Admins and managers can insert units" ON public.units;
DROP POLICY IF EXISTS "Admins and managers can update units" ON public.units;
DROP POLICY IF EXISTS "Admins can delete units" ON public.units;

CREATE POLICY "Users can view accessible units"
ON public.units
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Managers can create accessible units"
ON public.units
FOR INSERT
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Managers can update accessible units"
ON public.units
FOR UPDATE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Admins can delete accessible units"
ON public.units
FOR DELETE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND public.has_role(auth.uid(), 'admin')
);

-- Work orders
DROP POLICY IF EXISTS "Authenticated users can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Admins and managers can create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Admins managers and assignees can update work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Admins can delete work orders" ON public.work_orders;

CREATE POLICY "Users can view accessible work orders"
ON public.work_orders
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Managers can create accessible work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'inspector')
  )
);

CREATE POLICY "Managers can update accessible work orders"
ON public.work_orders
FOR UPDATE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
  )
)
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
  )
);

CREATE POLICY "Admins can delete accessible work orders"
ON public.work_orders
FOR DELETE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
);

-- Inspections
DROP POLICY IF EXISTS "Authenticated users can view inspections" ON public.inspections;
DROP POLICY IF EXISTS "Inspectors can create inspections" ON public.inspections;
DROP POLICY IF EXISTS "Inspectors can update inspections" ON public.inspections;

CREATE POLICY "Users can view accessible inspections"
ON public.inspections
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Inspectors can create accessible inspections"
ON public.inspections
FOR INSERT
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'inspector')
  )
);

CREATE POLICY "Inspectors can update accessible inspections"
ON public.inspections
FOR UPDATE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR inspector_id = auth.uid()
  )
)
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR inspector_id = auth.uid()
  )
);

-- Daily inspections
DROP POLICY IF EXISTS "Authenticated users can view daily inspections" ON public.daily_inspections;
DROP POLICY IF EXISTS "Authenticated users can create daily inspections" ON public.daily_inspections;
DROP POLICY IF EXISTS "Inspectors can update their inspections" ON public.daily_inspections;

CREATE POLICY "Users can view accessible daily inspections"
ON public.daily_inspections
FOR SELECT
USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Users can create accessible daily inspections"
ON public.daily_inspections
FOR INSERT
WITH CHECK (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "Users can update accessible daily inspections"
ON public.daily_inspections
FOR UPDATE
USING (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR inspector_id = auth.uid()
  )
)
WITH CHECK (
  public.can_access_property(auth.uid(), property_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR inspector_id = auth.uid()
  )
);

-- Tenants (occupancy)
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins and managers can manage tenants" ON public.tenants;

CREATE POLICY "Users can view accessible tenants"
ON public.tenants
FOR SELECT
USING (public.can_access_unit(auth.uid(), unit_id));

CREATE POLICY "Managers can manage accessible tenants"
ON public.tenants
FOR INSERT
WITH CHECK (
  public.can_access_unit(auth.uid(), unit_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Managers can update accessible tenants"
ON public.tenants
FOR UPDATE
USING (
  public.can_access_unit(auth.uid(), unit_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  public.can_access_unit(auth.uid(), unit_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Admins can delete accessible tenants"
ON public.tenants
FOR DELETE
USING (
  public.can_access_unit(auth.uid(), unit_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
);
