-- Property Ops Portal (Glorieta Gardens Apartments)
-- External licensed portal for maintenance crew, property managers, and owners.
-- Isolated from construction/consulting project controls.

BEGIN;

-- ─── 1. Widen portal_kind + property scope ──────────────────────────────────

ALTER TABLE public.portal_memberships
  DROP CONSTRAINT IF EXISTS portal_memberships_portal_kind_check;
ALTER TABLE public.portal_memberships
  ADD CONSTRAINT portal_memberships_portal_kind_check
  CHECK (portal_kind IN ('main', 'sub', 'owner', 'ops'));

ALTER TABLE public.portal_invitations
  DROP CONSTRAINT IF EXISTS portal_invitations_portal_kind_check;
ALTER TABLE public.portal_invitations
  ADD CONSTRAINT portal_invitations_portal_kind_check
  CHECK (portal_kind IN ('sub', 'owner', 'ops'));

ALTER TABLE public.portal_memberships
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.portal_invitations
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS portal_memberships_property_id_idx
  ON public.portal_memberships(property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS portal_invitations_property_id_idx
  ON public.portal_invitations(property_id)
  WHERE property_id IS NOT NULL;

-- Optional per-property ops enable flag + default module packages
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ops_portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ops_portal_modules jsonb NOT NULL DEFAULT '["maintenance","nspire","stores","voice"]'::jsonb;

-- ─── 2. Portal helpers treat 'ops' like other external kinds ─────────────────

CREATE OR REPLACE FUNCTION public.current_portal_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.tenant_id
  FROM public.portal_memberships pm
  WHERE pm.user_id = auth.uid()
    AND pm.is_active = true
  ORDER BY
    CASE WHEN pm.tenant_id::text = NULLIF(auth.jwt() ->> 'tenant_id', '') THEN 0 ELSE 1 END,
    CASE pm.portal_kind
      WHEN 'main' THEN 1
      WHEN 'ops' THEN 2
      WHEN 'owner' THEN 3
      WHEN 'sub' THEN 4
      ELSE 5
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_portal_kind()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pm.portal_kind
      FROM public.portal_memberships pm
      WHERE pm.user_id = auth.uid()
        AND pm.is_active = true
      ORDER BY
        CASE WHEN pm.tenant_id::text = NULLIF(auth.jwt() ->> 'tenant_id', '') THEN 0 ELSE 1 END,
        CASE pm.portal_kind
          WHEN 'main' THEN 1
          WHEN 'ops' THEN 2
          WHEN 'owner' THEN 3
          WHEN 'sub' THEN 4
          ELSE 5
        END
      LIMIT 1
    ),
    'main'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.current_portal_kind() IN ('owner', 'sub', 'ops') THEN NULL::uuid
    ELSE COALESCE(
      NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
      (
        SELECT p.workspace_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        LIMIT 1
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.current_portal_kind() IN ('owner', 'sub', 'ops') THEN NULL::uuid
    ELSE COALESCE(
      public.current_tenant_id(),
      (SELECT p.workspace_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1),
      (SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid() LIMIT 1)
    )
  END;
$$;

-- ─── 3. Ops access helpers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ops_can_access_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.portal_memberships pm
      WHERE pm.user_id = auth.uid()
        AND pm.is_active = true
        AND pm.portal_kind = 'ops'
        AND pm.property_id = p_property_id
    )
    OR (
      public.current_portal_kind() = 'main'
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = p_property_id
          AND p.workspace_id = public.get_my_workspace_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_ops_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.role
  FROM public.portal_memberships pm
  WHERE pm.user_id = auth.uid()
    AND pm.is_active = true
    AND pm.portal_kind = 'ops'
  ORDER BY
    CASE WHEN pm.tenant_id::text = NULLIF(auth.jwt() ->> 'tenant_id', '') THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ops_has_module(p_module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.current_ops_role()
    WHEN 'ops_tech' THEN p_module = 'maintenance'
    WHEN 'ops_pm' THEN p_module = ANY (ARRAY['maintenance','nspire','stores','voice','costs'])
    WHEN 'ops_owner' THEN p_module = ANY (ARRAY['maintenance','nspire','stores','voice','costs','executive'])
    ELSE public.is_super_admin() OR public.current_portal_kind() = 'main'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.ops_can_access_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_ops_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_has_module(text) TO authenticated;

-- Context RPC for the ops shell
CREATE OR REPLACE FUNCTION public.get_ops_portal_context(p_property_id uuid DEFAULT NULL)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  address text,
  city text,
  state text,
  ops_role text,
  modules jsonb,
  total_units integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid := p_property_id;
  v_role text;
BEGIN
  IF v_property_id IS NULL THEN
    SELECT pm.property_id, pm.role
      INTO v_property_id, v_role
      FROM public.portal_memberships pm
     WHERE pm.user_id = auth.uid()
       AND pm.is_active = true
       AND pm.portal_kind = 'ops'
     ORDER BY pm.created_at
     LIMIT 1;
  ELSE
    SELECT pm.role INTO v_role
      FROM public.portal_memberships pm
     WHERE pm.user_id = auth.uid()
       AND pm.is_active = true
       AND pm.portal_kind = 'ops'
       AND pm.property_id = v_property_id
     LIMIT 1;
  END IF;

  IF v_property_id IS NULL OR NOT public.ops_can_access_property(v_property_id) THEN
    RETURN;
  END IF;

  IF v_role IS NULL THEN
    v_role := public.current_ops_role();
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address,
    p.city,
    p.state,
    COALESCE(v_role, 'ops_tech'),
    CASE COALESCE(v_role, 'ops_tech')
      WHEN 'ops_tech' THEN '["maintenance"]'::jsonb
      WHEN 'ops_pm' THEN '["maintenance","nspire","stores","voice","costs"]'::jsonb
      WHEN 'ops_owner' THEN '["maintenance","nspire","stores","voice","costs","executive"]'::jsonb
      ELSE COALESCE(p.ops_portal_modules, '["maintenance"]'::jsonb)
    END,
    COALESCE(p.total_units, 0)
  FROM public.properties p
  WHERE p.id = v_property_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ops_portal_context(uuid) TO authenticated;

-- ─── 4. JWT hook includes ops ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_claims  jsonb := event -> 'claims';
  v_tenant_id uuid;
  v_role      text;
  v_portal    text;
  v_ws_ids    uuid[];
BEGIN
  SELECT pm.tenant_id, pm.role, pm.portal_kind
    INTO v_tenant_id, v_role, v_portal
    FROM public.portal_memberships pm
   WHERE pm.user_id = v_user_id
     AND pm.is_active = true
   ORDER BY CASE pm.portal_kind
              WHEN 'main'  THEN 1
              WHEN 'ops'   THEN 2
              WHEN 'owner' THEN 3
              WHEN 'sub'   THEN 4
              ELSE 5
            END
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    SELECT w.id
      INTO v_tenant_id
      FROM public.workspaces w
     WHERE w.owner_user_id = v_user_id
     LIMIT 1;
    v_portal := 'main';
    v_role   := 'owner';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT pm.tenant_id), ARRAY[]::uuid[])
    INTO v_ws_ids
    FROM public.portal_memberships pm
   WHERE pm.user_id = v_user_id
     AND pm.is_active = true;

  IF v_tenant_id IS NOT NULL THEN
    v_claims := v_claims || jsonb_build_object('tenant_id', v_tenant_id::text);
  END IF;
  IF v_ws_ids IS NOT NULL THEN
    v_claims := v_claims || jsonb_build_object('workspace_ids', to_jsonb(v_ws_ids));
  END IF;
  IF v_role IS NOT NULL THEN
    v_claims := v_claims || jsonb_build_object('role', v_role);
  END IF;
  IF v_portal IS NOT NULL THEN
    v_claims := v_claims || jsonb_build_object('portal_kind', v_portal);
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = v_user_id
      AND u.raw_app_meta_data ->> 'role' = 'super_admin'
  ) THEN
    v_claims := v_claims || jsonb_build_object('role', 'super_admin');
  END IF;

  RETURN jsonb_build_object('claims', v_claims);
END;
$$;

-- ─── 5. Billing feature: ops_portal on Pro + Enterprise ─────────────────────

UPDATE public.plans
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('ops_portal', true)
WHERE code IN ('pro', 'enterprise');

UPDATE public.plans
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('ops_portal', false)
WHERE code = 'starter'
  AND NOT (COALESCE(features, '{}'::jsonb) ? 'ops_portal');

-- ─── 6. Open restrictive boundary for property-ops tables ───────────────────

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'properties',
    'units',
    'work_orders',
    'work_order_comments',
    'work_order_activity',
    'issues',
    'maintenance_requests',
    'assets',
    'property_inventory_items',
    'inventory_transactions',
    'property_material_receipts',
    'property_material_receipt_lines',
    'inspections',
    'inspection_items',
    'daily_ground_inspections',
    'voice_agent_config',
    'tenants'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS client_portal_staff_boundary ON public.%I', t);
      IF t = 'properties' THEN
        EXECUTE format(
          'CREATE POLICY client_portal_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (public.current_portal_kind() = ''ops'' AND public.ops_can_access_property(id))
           )
           WITH CHECK (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (public.current_portal_kind() = ''ops'' AND public.ops_can_access_property(id))
           )',
          t
        );
      ELSIF t = 'property_material_receipt_lines' THEN
        EXECUTE format(
          'CREATE POLICY client_portal_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (
               public.current_portal_kind() = ''ops''
               AND EXISTS (
                 SELECT 1 FROM public.property_material_receipts r
                 WHERE r.id = receipt_id
                   AND public.ops_can_access_property(r.property_id)
               )
             )
           )
           WITH CHECK (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (
               public.current_portal_kind() = ''ops''
               AND EXISTS (
                 SELECT 1 FROM public.property_material_receipts r
                 WHERE r.id = receipt_id
                   AND public.ops_can_access_property(r.property_id)
               )
             )
           )',
          t
        );
      ELSIF t = 'voice_agent_config' THEN
        -- property_id may be absent on older schemas; allow ops read when kind matches
        EXECUTE format(
          'CREATE POLICY client_portal_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR public.current_portal_kind() = ''ops''
           )
           WITH CHECK (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
           )',
          t
        );
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'property_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY client_portal_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (public.current_portal_kind() = ''ops'' AND public.ops_can_access_property(property_id))
           )
           WITH CHECK (
             public.current_portal_kind() = ''main''
             OR public.is_super_admin()
             OR (public.current_portal_kind() = ''ops'' AND public.ops_can_access_property(property_id))
           )',
          t
        );
      ELSE
        -- Leave table without a restrictive ops path if we cannot scope it
        NULL;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ─── 7. Permissive ops policies ─────────────────────────────────────────────

DROP POLICY IF EXISTS properties_ops_portal_select ON public.properties;
CREATE POLICY properties_ops_portal_select ON public.properties
  FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(id));

DROP POLICY IF EXISTS units_ops_portal_all ON public.units;
CREATE POLICY units_ops_portal_all ON public.units
  FOR ALL TO authenticated
  USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id))
  WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id));

DROP POLICY IF EXISTS work_orders_ops_portal_all ON public.work_orders;
CREATE POLICY work_orders_ops_portal_all ON public.work_orders
  FOR ALL TO authenticated
  USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('maintenance'))
  WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('maintenance'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='work_order_comments') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS work_order_comments_ops_portal_all ON public.work_order_comments;
      CREATE POLICY work_order_comments_ops_portal_all ON public.work_order_comments
        FOR ALL TO authenticated
        USING (
          public.current_portal_kind() = 'ops'
          AND EXISTS (
            SELECT 1 FROM public.work_orders w
            WHERE w.id = work_order_id
              AND public.ops_can_access_property(w.property_id)
              AND public.ops_has_module('maintenance')
          )
        )
        WITH CHECK (
          public.current_portal_kind() = 'ops'
          AND EXISTS (
            SELECT 1 FROM public.work_orders w
            WHERE w.id = work_order_id
              AND public.ops_can_access_property(w.property_id)
              AND public.ops_has_module('maintenance')
          )
        );
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='work_order_activity') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS work_order_activity_ops_portal_select ON public.work_order_activity;
      CREATE POLICY work_order_activity_ops_portal_select ON public.work_order_activity
        FOR SELECT TO authenticated
        USING (
          public.current_portal_kind() = 'ops'
          AND EXISTS (
            SELECT 1 FROM public.work_orders w
            WHERE w.id = work_order_id
              AND public.ops_can_access_property(w.property_id)
              AND public.ops_has_module('maintenance')
          )
        );
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='issues') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS issues_ops_portal_all ON public.issues;
      CREATE POLICY issues_ops_portal_all ON public.issues
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('maintenance'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('maintenance'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='maintenance_requests') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS maintenance_requests_ops_portal_all ON public.maintenance_requests;
      CREATE POLICY maintenance_requests_ops_portal_all ON public.maintenance_requests
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('voice'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('voice'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='property_inventory_items') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS property_inventory_items_ops_portal_all ON public.property_inventory_items;
      CREATE POLICY property_inventory_items_ops_portal_all ON public.property_inventory_items
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('stores'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('stores'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='inventory_transactions') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS inventory_transactions_ops_portal_all ON public.inventory_transactions;
      CREATE POLICY inventory_transactions_ops_portal_all ON public.inventory_transactions
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('stores'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('stores'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='property_material_receipts') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS property_material_receipts_ops_portal_all ON public.property_material_receipts;
      CREATE POLICY property_material_receipts_ops_portal_all ON public.property_material_receipts
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('costs'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('costs'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='property_material_receipt_lines') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS property_material_receipt_lines_ops_portal_all ON public.property_material_receipt_lines;
      CREATE POLICY property_material_receipt_lines_ops_portal_all ON public.property_material_receipt_lines
        FOR ALL TO authenticated
        USING (
          public.current_portal_kind() = 'ops'
          AND public.ops_has_module('costs')
          AND EXISTS (
            SELECT 1 FROM public.property_material_receipts r
            WHERE r.id = receipt_id AND public.ops_can_access_property(r.property_id)
          )
        )
        WITH CHECK (
          public.current_portal_kind() = 'ops'
          AND public.ops_has_module('costs')
          AND EXISTS (
            SELECT 1 FROM public.property_material_receipts r
            WHERE r.id = receipt_id AND public.ops_can_access_property(r.property_id)
          )
        );
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='inspections') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS inspections_ops_portal_all ON public.inspections;
      CREATE POLICY inspections_ops_portal_all ON public.inspections
        FOR ALL TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('nspire'))
        WITH CHECK (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id) AND public.ops_has_module('nspire'));
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='assets') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS assets_ops_portal_select ON public.assets;
      CREATE POLICY assets_ops_portal_select ON public.assets
        FOR SELECT TO authenticated
        USING (public.current_portal_kind() = 'ops' AND public.ops_can_access_property(property_id));
    $p$;
  END IF;

  -- Residential tenants (occupancy) — only PM/owner cost+activity roles
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname='tenants') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS tenants_ops_portal_select ON public.tenants;
      CREATE POLICY tenants_ops_portal_select ON public.tenants
        FOR SELECT TO authenticated
        USING (
          public.current_portal_kind() = 'ops'
          AND public.ops_has_module('costs')
          AND public.ops_can_access_property(property_id)
        );
    $p$;
  END IF;
END $$;

-- ─── 8. Seed Glorieta Gardens Apartments for ops portal ─────────────────────

UPDATE public.properties
SET
  ops_portal_enabled = true,
  ops_portal_modules = '["maintenance","nspire","stores","voice"]'::jsonb,
  is_managed_property = true
WHERE lower(name) LIKE '%glorieta%';

COMMIT;
