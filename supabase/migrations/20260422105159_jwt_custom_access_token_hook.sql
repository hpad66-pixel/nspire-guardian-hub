-- ============================================================
-- JWT Custom Access Token Hook (Tier 1 #4)
-- Injects tenant_id + role claims into every access token.
-- Reads from portal_memberships so RLS policies on public.current_tenant_id()
-- and public.is_super_admin() can resolve without an Auth Hook dashboard toggle.
-- ============================================================
-- Activate this in Supabase Dashboard → Authentication → Hooks → Access Token Hook
-- → pick function `public.custom_access_token_hook`.
-- ============================================================

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
  -- Resolve primary tenant from portal_memberships (main > sub > owner).
  SELECT pm.tenant_id, pm.role, pm.portal_kind
    INTO v_tenant_id, v_role, v_portal
    FROM public.portal_memberships pm
   WHERE pm.user_id = v_user_id
     AND pm.is_active = true
   ORDER BY CASE pm.portal_kind
              WHEN 'main'  THEN 1
              WHEN 'owner' THEN 2
              WHEN 'sub'   THEN 3
              ELSE 4
            END
   LIMIT 1;

  -- Fallback: use workspaces.owner_user_id if no membership yet.
  IF v_tenant_id IS NULL THEN
    SELECT w.id
      INTO v_tenant_id
      FROM public.workspaces w
     WHERE w.owner_user_id = v_user_id
     LIMIT 1;
    v_portal := 'main';
    v_role   := 'owner';
  END IF;

  -- Collect every workspace the user has membership in.
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

  -- Super admin detection: user listed in auth.users with raw_app_meta_data.role = 'super_admin'
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

-- Grant supabase_auth_admin execute permission so the Auth runtime can call it.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant supabase_auth_admin read access to the tables the hook reads.
GRANT SELECT ON public.portal_memberships TO supabase_auth_admin;
GRANT SELECT ON public.workspaces TO supabase_auth_admin;

-- Allow supabase_auth_admin to bypass RLS on portal_memberships / workspaces
-- (only while invoked from the hook). Standard pattern for access-token hooks.
DROP POLICY IF EXISTS "supabase_auth_admin can read portal_memberships" ON public.portal_memberships;
CREATE POLICY "supabase_auth_admin can read portal_memberships"
  ON public.portal_memberships FOR SELECT TO supabase_auth_admin USING (true);

DROP POLICY IF EXISTS "supabase_auth_admin can read workspaces" ON public.workspaces;
CREATE POLICY "supabase_auth_admin can read workspaces"
  ON public.workspaces FOR SELECT TO supabase_auth_admin USING (true);
