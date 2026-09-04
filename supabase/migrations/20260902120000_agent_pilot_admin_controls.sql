-- Admin control for the first read-only Agent pilot. Kept separate from the
-- foundation migration so an already-reviewed/applied schema is immutable.

CREATE OR REPLACE FUNCTION public.set_agent_pilot_entitlement(
  p_user_id uuid,
  p_project_id uuid,
  p_enabled boolean
)
RETURNS public.agent_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_tenant_id uuid;
  v_user_status text;
  v_entitlement public.agent_entitlements;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only a workspace administrator can manage the Agent pilot'
      USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_project_id IS NULL OR p_enabled IS NULL THEN
    RAISE EXCEPTION 'User, project, and enabled state are required'
      USING ERRCODE = '22004';
  END IF;

  v_tenant_id := public.current_tenant_id();
  IF v_tenant_id IS NULL OR public.agent_project_tenant_id(p_project_id) IS DISTINCT FROM v_tenant_id THEN
    RAISE EXCEPTION 'Project is outside the administrator workspace'
      USING ERRCODE = '42501';
  END IF;
  SELECT workspace_id, status INTO v_user_tenant_id, v_user_status
  FROM public.profiles
  WHERE user_id = p_user_id;
  IF v_user_tenant_id IS DISTINCT FROM v_tenant_id OR COALESCE(v_user_status, 'active') <> 'active' THEN
    RAISE EXCEPTION 'User is outside the administrator workspace or inactive'
      USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_project(p_user_id, p_project_id) THEN
    RAISE EXCEPTION 'User does not currently have access to the project'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.agent_entitlements (
    tenant_id,
    user_id,
    project_id,
    runtime_kind,
    status,
    allowed_scopes,
    allowed_tools,
    created_by
  ) VALUES (
    v_tenant_id,
    p_user_id,
    p_project_id,
    'hermes',
    CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END,
    ARRAY['project:read']::text[],
    ARRAY['project.tasks.list']::text[],
    auth.uid()
  )
  ON CONFLICT (tenant_id, user_id, project_id, runtime_kind)
  DO UPDATE SET
    status = EXCLUDED.status,
    allowed_scopes = ARRAY['project:read']::text[],
    allowed_tools = ARRAY['project.tasks.list']::text[],
    updated_at = now()
  RETURNING * INTO v_entitlement;

  IF NOT p_enabled THEN
    UPDATE public.agent_sessions
    SET status = 'revoked',
        revoked_at = COALESCE(revoked_at, now()),
        revoke_reason = COALESCE(revoke_reason, 'Pilot entitlement disabled')
    WHERE tenant_id = v_tenant_id
      AND user_id = p_user_id
      AND project_id = p_project_id
      AND runtime_kind = 'hermes'
      AND status = 'active';
  END IF;

  RETURN v_entitlement;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_agent_pilot_entitlement(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.can_access_project(auth.uid(), p_project_id)
    AND EXISTS (
      SELECT 1
      FROM public.agent_entitlements entitlement
      WHERE entitlement.tenant_id = public.current_tenant_id()
        AND entitlement.user_id = auth.uid()
        AND entitlement.project_id = p_project_id
        AND entitlement.runtime_kind = 'hermes'
        AND entitlement.status = 'enabled'
        AND entitlement.allowed_scopes @> ARRAY['project:read']::text[]
        AND entitlement.allowed_tools @> ARRAY['project.tasks.list']::text[]
    );
$$;

REVOKE ALL ON FUNCTION public.set_agent_pilot_entitlement(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_agent_pilot_entitlement(uuid, uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.has_agent_pilot_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_agent_pilot_entitlement(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_agent_pilot_entitlement(uuid, uuid, boolean) IS
  'Admin-only enrollment for the read-only Agent pilot; disabling also revokes active sessions.';
COMMENT ON FUNCTION public.has_agent_pilot_entitlement(uuid) IS
  'Fail-closed current-user check used only to hide or show the pilot launcher; gateways remain authoritative.';

NOTIFY pgrst, 'reload schema';
