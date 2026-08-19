-- ============================================================================
-- Client portal security boundary
--
-- External owner/subcontractor identities share an Auth service with internal
-- staff, but they must never inherit broad tenant policies merely because their
-- JWT identifies the project tenant. This migration makes portal access deny by
-- default and then grants only the client-facing records required by the portal.
-- ============================================================================

BEGIN;

-- Resolve a portal identity without calling current_tenant_id(). This avoids a
-- dependency loop and works even while broad tenant access is intentionally off.
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
    CASE pm.portal_kind WHEN 'main' THEN 1 WHEN 'owner' THEN 2 WHEN 'sub' THEN 3 ELSE 4 END
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
        CASE pm.portal_kind WHEN 'main' THEN 1 WHEN 'owner' THEN 2 WHEN 'sub' THEN 3 ELSE 4 END
      LIMIT 1
    ),
    'main'
  );
$$;

-- Internal users retain normal workspace resolution. External portal users get
-- NULL here so legacy "tenant_id = current_tenant_id()" policies do not expose
-- the rest of the workspace. Their explicit policies use portal membership.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.current_portal_kind() IN ('owner', 'sub') THEN NULL::uuid
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
    WHEN public.current_portal_kind() IN ('owner', 'sub') THEN NULL::uuid
    ELSE COALESCE(
      public.current_tenant_id(),
      (SELECT p.workspace_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1),
      (SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid() LIMIT 1)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_orgs()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT pm.organization_id
      FROM public.portal_memberships pm
      WHERE pm.user_id = auth.uid()
        AND pm.tenant_id = public.current_portal_tenant_id()
        AND pm.is_active = true
        AND pm.organization_id IS NOT NULL
    ),
    ARRAY[]::uuid[]
  );
$$;

-- Plan checks still evaluate against the project tenant for portal identities.
CREATE OR REPLACE FUNCTION public.can_use_feature(p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (p.features ->> p_feature)::boolean
      FROM public.tenant_subscriptions ts
      JOIN public.plans p ON p.id = ts.plan_id
      WHERE ts.tenant_id = COALESCE(public.current_tenant_id(), public.current_portal_tenant_id())
        AND ts.status IN ('trialing','active','past_due')
      LIMIT 1
    ),
    false
  ) OR public.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.owner_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.project_id = p_project_id
        AND pc.tenant_id = public.current_portal_tenant_id()
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    );
$$;

CREATE OR REPLACE FUNCTION public.owner_can_access_contract(p_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.id = p_contract_id
        AND pc.tenant_id = public.current_portal_tenant_id()
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    );
$$;

CREATE OR REPLACE FUNCTION public.owner_can_access_pay_app(p_pay_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prime_contract_pay_apps pa
    WHERE pa.id = p_pay_app_id
      AND public.owner_can_access_contract(pa.prime_contract_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_portal_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_can_access_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_can_access_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_can_access_pay_app(uuid) TO authenticated;

-- Anonymous access receives branding only, never contacts, project data, or
-- configuration. This powers the passwordless portal handoff before sign-in.
CREATE OR REPLACE FUNCTION public.get_public_portal_brand(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  client_name text,
  brand_logo_url text,
  brand_accent_color text,
  portal_slug text,
  is_active boolean,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id, cp.name, cp.client_name, cp.brand_logo_url,
         cp.brand_accent_color, cp.portal_slug, cp.is_active, cp.status
  FROM public.client_portals cp
  WHERE cp.portal_slug = p_slug
    AND cp.is_active = true
    AND cp.status <> 'archived'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_portal_brand(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portal_brand(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_owner_portal_context()
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_status text,
  portal_name text,
  client_name text,
  brand_logo_url text,
  brand_accent_color text,
  portal_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.status::text, cp.name, cp.client_name,
         cp.brand_logo_url, cp.brand_accent_color, cp.portal_slug
  FROM public.prime_contracts pc
  JOIN public.projects p ON p.id = pc.project_id
  LEFT JOIN public.client_portals cp
    ON cp.project_id = p.id AND cp.is_active = true AND cp.status <> 'archived'
  WHERE (
      public.owner_can_access_contract(pc.id)
      OR (public.current_portal_kind() = 'main' AND pc.tenant_id = public.current_tenant_id())
      OR public.is_super_admin()
    )
  ORDER BY cp.updated_at DESC NULLS LAST, pc.updated_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_owner_portal_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_portal_context() TO authenticated;

-- Add a restrictive deny-by-default boundary to every RLS-protected public
-- table except the small client allowlist below and the membership table needed
-- to establish identity. Existing internal policies continue to determine which
-- staff rows are visible.
DO $$
DECLARE
  target record;
  allowlist text[] := ARRAY[
    'portal_memberships',
    'projects',
    'prime_contracts',
    'change_orders',
    'change_order_lines',
    'prime_contract_pay_apps',
    'prime_contract_pay_app_lines',
    'sov_line_items',
    'prime_contract_payments',
    'lien_releases',
    'client_updates',
    'schedules',
    'schedule_tasks',
    'schedule_predecessors'
  ];
BEGIN
  FOR target IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND NOT (c.relname = ANY(allowlist))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS client_portal_staff_boundary ON public.%I', target.relname);
    EXECUTE format(
      'CREATE POLICY client_portal_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.current_portal_kind() = ''main'' OR public.is_super_admin()) WITH CHECK (public.current_portal_kind() = ''main'' OR public.is_super_admin())',
      target.relname
    );
  END LOOP;
END $$;

-- Helper pattern for the allowlisted tables: restrictive policies preserve
-- normal staff access and permit only a documented owner-safe slice.

DROP POLICY IF EXISTS client_portal_boundary ON public.projects;
CREATE POLICY client_portal_boundary ON public.projects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_project(id));
DROP POLICY IF EXISTS projects_owner_portal_select ON public.projects;
CREATE POLICY projects_owner_portal_select ON public.projects FOR SELECT TO authenticated
  USING (public.owner_can_access_project(id));

DROP POLICY IF EXISTS client_portal_boundary ON public.prime_contracts;
CREATE POLICY client_portal_boundary ON public.prime_contracts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_contract(id));

DROP POLICY IF EXISTS client_portal_boundary ON public.change_orders;
CREATE POLICY client_portal_boundary ON public.change_orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR (
      co_type IN ('PCO','OCO')
      AND status <> 'draft'
      AND public.owner_can_access_contract(prime_contract_id)
    )
  );

DROP POLICY IF EXISTS client_portal_boundary ON public.change_order_lines;
CREATE POLICY client_portal_boundary ON public.change_order_lines AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.change_orders co
      WHERE co.id = change_order_lines.change_order_id
        AND co.co_type IN ('PCO','OCO')
        AND public.owner_can_access_contract(co.prime_contract_id)
    )
  );
DROP POLICY IF EXISTS change_order_lines_owner_portal_select ON public.change_order_lines;
CREATE POLICY change_order_lines_owner_portal_select ON public.change_order_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = change_order_lines.change_order_id
      AND co.co_type IN ('PCO','OCO')
      AND public.owner_can_access_contract(co.prime_contract_id)
  ));

DROP POLICY IF EXISTS client_portal_boundary ON public.prime_contract_pay_apps;
CREATE POLICY client_portal_boundary ON public.prime_contract_pay_apps AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_contract(prime_contract_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.prime_contract_pay_app_lines;
CREATE POLICY client_portal_boundary ON public.prime_contract_pay_app_lines AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_pay_app(pay_app_id));
DROP POLICY IF EXISTS pay_app_lines_owner_portal_select ON public.prime_contract_pay_app_lines;
CREATE POLICY pay_app_lines_owner_portal_select ON public.prime_contract_pay_app_lines FOR SELECT TO authenticated
  USING (public.owner_can_access_pay_app(pay_app_id));
DROP POLICY IF EXISTS pay_app_lines_owner_portal_insert ON public.prime_contract_pay_app_lines;
CREATE POLICY pay_app_lines_owner_portal_insert ON public.prime_contract_pay_app_lines FOR INSERT TO authenticated
  WITH CHECK (
    public.owner_can_access_pay_app(pay_app_id)
    AND EXISTS (SELECT 1 FROM public.prime_contract_pay_apps pa WHERE pa.id = pay_app_id AND pa.status = 'submitted')
  );
DROP POLICY IF EXISTS pay_app_lines_owner_portal_update ON public.prime_contract_pay_app_lines;
CREATE POLICY pay_app_lines_owner_portal_update ON public.prime_contract_pay_app_lines FOR UPDATE TO authenticated
  USING (
    public.owner_can_access_pay_app(pay_app_id)
    AND EXISTS (SELECT 1 FROM public.prime_contract_pay_apps pa WHERE pa.id = pay_app_id AND pa.status = 'submitted')
  )
  WITH CHECK (public.owner_can_access_pay_app(pay_app_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.sov_line_items;
CREATE POLICY client_portal_boundary ON public.sov_line_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_contract(prime_contract_id));
DROP POLICY IF EXISTS sov_line_items_owner_portal_select ON public.sov_line_items;
CREATE POLICY sov_line_items_owner_portal_select ON public.sov_line_items FOR SELECT TO authenticated
  USING (public.owner_can_access_contract(prime_contract_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.prime_contract_payments;
CREATE POLICY client_portal_boundary ON public.prime_contract_payments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_contract(prime_contract_id));
DROP POLICY IF EXISTS prime_payments_owner_portal_select ON public.prime_contract_payments;
CREATE POLICY prime_payments_owner_portal_select ON public.prime_contract_payments FOR SELECT TO authenticated
  USING (public.owner_can_access_contract(prime_contract_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.lien_releases;
CREATE POLICY client_portal_boundary ON public.lien_releases AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR (direction = 'outbound' AND public.owner_can_access_project(project_id))
  );
DROP POLICY IF EXISTS lien_releases_owner_portal_select ON public.lien_releases;
CREATE POLICY lien_releases_owner_portal_select ON public.lien_releases FOR SELECT TO authenticated
  USING (direction = 'outbound' AND public.owner_can_access_project(project_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.client_updates;
CREATE POLICY client_portal_boundary ON public.client_updates AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR (status = 'published' AND public.owner_can_access_project(project_id))
  );
DROP POLICY IF EXISTS client_updates_owner_portal_select ON public.client_updates;
CREATE POLICY client_updates_owner_portal_select ON public.client_updates FOR SELECT TO authenticated
  USING (status = 'published' AND public.owner_can_access_project(project_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.schedules;
CREATE POLICY client_portal_boundary ON public.schedules AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin() OR public.owner_can_access_project(project_id));
DROP POLICY IF EXISTS schedules_owner_portal_select ON public.schedules;
CREATE POLICY schedules_owner_portal_select ON public.schedules FOR SELECT TO authenticated
  USING (public.owner_can_access_project(project_id));

DROP POLICY IF EXISTS client_portal_boundary ON public.schedule_tasks;
CREATE POLICY client_portal_boundary ON public.schedule_tasks AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_tasks.schedule_id AND public.owner_can_access_project(s.project_id))
  );
DROP POLICY IF EXISTS schedule_tasks_owner_portal_select ON public.schedule_tasks;
CREATE POLICY schedule_tasks_owner_portal_select ON public.schedule_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_tasks.schedule_id AND public.owner_can_access_project(s.project_id)));

DROP POLICY IF EXISTS client_portal_boundary ON public.schedule_predecessors;
CREATE POLICY client_portal_boundary ON public.schedule_predecessors AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.schedule_tasks t
      JOIN public.schedules s ON s.id = t.schedule_id
      WHERE t.id = schedule_predecessors.task_id
        AND public.owner_can_access_project(s.project_id)
    )
  );
DROP POLICY IF EXISTS schedule_predecessors_owner_portal_select ON public.schedule_predecessors;
CREATE POLICY schedule_predecessors_owner_portal_select ON public.schedule_predecessors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.schedule_tasks t
    JOIN public.schedules s ON s.id = t.schedule_id
    WHERE t.id = schedule_predecessors.task_id
      AND public.owner_can_access_project(s.project_id)
  ));

-- Owner decisions go through narrow, audited RPCs instead of broad row updates.
DROP POLICY IF EXISTS payapps_owner_portal_update ON public.prime_contract_pay_apps;

CREATE OR REPLACE FUNCTION public.owner_approve_oco(
  p_co_id uuid,
  p_signature_path text DEFAULT NULL
)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.change_orders;
BEGIN
  SELECT * INTO result FROM public.change_orders WHERE id = p_co_id FOR UPDATE;
  IF result.id IS NULL
    OR NOT public.owner_can_access_contract(result.prime_contract_id)
  THEN
    RAISE EXCEPTION 'Change order access denied';
  END IF;
  IF result.co_type NOT IN ('PCO','OCO') THEN
    RAISE EXCEPTION 'Only owner change orders can be approved';
  END IF;
  IF result.status NOT IN ('pending','out_for_signature') THEN
    RAISE EXCEPTION 'Only change orders sent for owner review can be approved';
  END IF;

  UPDATE public.change_orders
  SET co_type = 'OCO',
      status = 'executed',
      executed_date = COALESCE(executed_date, CURRENT_DATE)
  WHERE id = p_co_id
  RETURNING * INTO result;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
  VALUES (result.tenant_id, auth.uid(), 'oco.approve', 'change_order', result.id,
    jsonb_build_object('signature_path', p_signature_path));
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_reject_oco(
  p_co_id uuid,
  p_reason text
)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.change_orders;
BEGIN
  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;
  SELECT * INTO result FROM public.change_orders WHERE id = p_co_id FOR UPDATE;
  IF result.id IS NULL
    OR NOT public.owner_can_access_contract(result.prime_contract_id)
  THEN
    RAISE EXCEPTION 'Change order access denied';
  END IF;
  IF result.co_type NOT IN ('PCO','OCO')
    OR result.status NOT IN ('pending','out_for_signature')
  THEN
    RAISE EXCEPTION 'Only change orders sent for owner review can be rejected';
  END IF;

  UPDATE public.change_orders
  SET status = 'rejected'
  WHERE id = p_co_id
  RETURNING * INTO result;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
  VALUES (result.tenant_id, auth.uid(), 'oco.reject', 'change_order', result.id,
    jsonb_build_object('reason', p_reason));
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_approve_oco(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_reject_oco(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_approve_oco(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_reject_oco(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_approve_pay_app(
  p_pay_app_id uuid,
  p_approved_amount numeric
)
RETURNS public.prime_contract_pay_apps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.prime_contract_pay_apps;
  contract_row public.prime_contracts;
  submitted numeric;
BEGIN
  IF NOT public.owner_can_access_pay_app(p_pay_app_id) THEN
    RAISE EXCEPTION 'Pay application access denied';
  END IF;

  SELECT * INTO result FROM public.prime_contract_pay_apps WHERE id = p_pay_app_id FOR UPDATE;
  IF result.status <> 'submitted' THEN RAISE EXCEPTION 'Only submitted pay applications can be approved'; END IF;
  submitted := COALESCE(result.submitted_amount, 0);
  IF p_approved_amount < 0 OR p_approved_amount > submitted THEN
    RAISE EXCEPTION 'Approved amount must be between 0 and the submitted amount (%)', submitted;
  END IF;
  SELECT * INTO contract_row FROM public.prime_contracts WHERE id = result.prime_contract_id;

  UPDATE public.prime_contract_pay_apps
  SET status = 'approved',
      approved_amount = p_approved_amount,
      retainage_held = ROUND(p_approved_amount * COALESCE(contract_row.retainage_pct, 0) / 100, 2),
      approved_date = CURRENT_DATE
  WHERE id = p_pay_app_id
  RETURNING * INTO result;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
  VALUES (result.tenant_id, auth.uid(), 'pay_app.approve', 'pay_app', result.id,
    jsonb_build_object('approved_amount', p_approved_amount));
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_reject_pay_app(
  p_pay_app_id uuid,
  p_reason text,
  p_comment text DEFAULT NULL
)
RETURNS public.prime_contract_pay_apps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.prime_contract_pay_apps;
BEGIN
  IF NOT public.owner_can_access_pay_app(p_pay_app_id) THEN
    RAISE EXCEPTION 'Pay application access denied';
  END IF;
  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;

  UPDATE public.prime_contract_pay_apps
  SET status = 'rejected'
  WHERE id = p_pay_app_id AND status = 'submitted'
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Only submitted pay applications can be rejected'; END IF;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
  VALUES (result.tenant_id, auth.uid(), 'pay_app.reject', 'pay_app', result.id,
    jsonb_build_object('reason_code', p_reason, 'comment', p_comment));
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_approve_pay_app(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_reject_pay_app(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_approve_pay_app(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_reject_pay_app(uuid, text, text) TO authenticated;

-- Revocation must deactivate the real Auth membership, not just the legacy
-- contact row shown in the staff management screen.
CREATE OR REPLACE FUNCTION public.revoke_owner_portal_access(p_portal_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  portal_row public.client_portals;
  owner_org uuid;
  target_user uuid;
BEGIN
  IF public.current_portal_kind() <> 'main' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only project administrators can revoke portal access';
  END IF;

  SELECT * INTO portal_row FROM public.client_portals WHERE id = p_portal_id;
  IF portal_row.id IS NULL OR (portal_row.workspace_id <> public.current_tenant_id() AND NOT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Portal not found';
  END IF;
  SELECT pc.owner_org_id INTO owner_org
  FROM public.prime_contracts pc
  WHERE pc.project_id = portal_row.project_id
  LIMIT 1;
  SELECT u.id INTO target_user FROM auth.users u WHERE lower(u.email) = lower(p_email) LIMIT 1;

  UPDATE public.portal_access
  SET is_active = false, magic_link_token = NULL, magic_link_expires_at = NULL
  WHERE portal_id = p_portal_id AND lower(email) = lower(p_email);

  IF target_user IS NOT NULL THEN
    UPDATE public.portal_memberships
    SET is_active = false
    WHERE user_id = target_user
      AND tenant_id = portal_row.workspace_id
      AND portal_kind = 'owner'
      AND (owner_org IS NULL OR organization_id = owner_org);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_owner_portal_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_owner_portal_access(uuid, text) TO authenticated;

-- Signatures remain private; portal users can access only their tenant folder.
DROP POLICY IF EXISTS owner_signatures_read ON storage.objects;
CREATE POLICY owner_signatures_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'owner-signatures'
    AND (storage.foldername(name))[1] = COALESCE(public.current_tenant_id(), public.current_portal_tenant_id())::text
  );
DROP POLICY IF EXISTS owner_signatures_write ON storage.objects;
CREATE POLICY owner_signatures_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'owner-signatures'
    AND (storage.foldername(name))[1] = COALESCE(public.current_tenant_id(), public.current_portal_tenant_id())::text
  );

COMMIT;
