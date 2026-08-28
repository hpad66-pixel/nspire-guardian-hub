-- Enterprise workspace user administration.
--
-- Adds a tenant-safe invitation lifecycle, protected role management, account
-- status controls, and an audit trail. A workspace owner is the highest
-- authority inside their own workspace; the platform super-admin remains a
-- separate auth app_metadata/JWT role.

BEGIN;

ALTER TABLE public.user_invitations
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_invitations_workspace_pending
  ON public.user_invitations (workspace_id, lower(email), created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.enterprise_user_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_id uuid REFERENCES public.user_invitations(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_user_audit_tenant_time
  ON public.enterprise_user_audit_log (tenant_id, created_at DESC);

ALTER TABLE public.enterprise_user_audit_log ENABLE ROW LEVEL SECURITY;

-- Return the workforce workspace for a user without depending on caller RLS.
CREATE OR REPLACE FUNCTION public.workspace_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.workspace_id FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1),
    (SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = _user_id LIMIT 1)
  );
$$;

-- Internal authority level. 400 = platform super-admin, 300 = workspace
-- owner, 200 = workspace admin, 190 = owner role, 100 = manager.
CREATE OR REPLACE FUNCTION public.workspace_admin_level(_user_id uuid, _workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _workspace_id IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND u.raw_app_meta_data ->> 'role' = 'super_admin'
  ) THEN
    RETURN 400;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.workspace_id = _workspace_id
      AND COALESCE(p.status, 'active') = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_user_id = _user_id
  ) THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_user_id = _user_id
  ) THEN
    RETURN 300;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN RETURN 200; END IF;
  IF public.has_role(_user_id, 'owner') THEN RETURN 190; END IF;
  IF public.has_role(_user_id, 'manager') THEN RETURN 100; END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_invite_workspace_role(_target_role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
  v_level integer;
BEGIN
  v_level := public.workspace_admin_level(auth.uid(), v_workspace);
  IF v_level >= 300 THEN RETURN true; END IF;
  IF v_level = 200 THEN RETURN _target_role NOT IN ('admin', 'owner'); END IF;
  IF v_level = 190 THEN RETURN public.role_priority(_target_role) < public.role_priority('owner'); END IF;
  IF v_level = 100 THEN RETURN public.role_priority(_target_role) < public.role_priority('manager'); END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.assignable_workspace_roles()
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role_value ORDER BY public.role_priority(role_value) DESC), ARRAY[]::public.app_role[])
  FROM unnest(enum_range(NULL::public.app_role)) AS role_value
  WHERE public.can_invite_workspace_role(role_value);
$$;

CREATE OR REPLACE FUNCTION public.can_administer_workspace_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
  v_actor_level integer;
  v_target_level integer;
BEGIN
  IF auth.uid() IS NULL OR _target_user_id IS NULL OR auth.uid() = _target_user_id THEN
    RETURN false;
  END IF;
  IF public.workspace_for_user(_target_user_id) IS DISTINCT FROM v_workspace THEN
    RETURN false;
  END IF;

  v_actor_level := public.workspace_admin_level(auth.uid(), v_workspace);
  v_target_level := CASE
    WHEN EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = v_workspace AND w.owner_user_id = _target_user_id
    ) THEN 300
    WHEN public.has_role(_target_user_id, 'admin') THEN 200
    WHEN public.has_role(_target_user_id, 'owner') THEN 190
    WHEN public.has_role(_target_user_id, 'manager') THEN 100
    ELSE 0
  END;

  IF v_actor_level >= 400 THEN RETURN true; END IF;
  IF v_target_level >= 300 THEN RETURN false; END IF;
  IF v_actor_level >= 300 THEN RETURN true; END IF;
  RETURN v_actor_level > v_target_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_email text,
  p_role public.app_role DEFAULT 'user',
  p_full_name text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL
)
RETURNS public.user_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
  v_email text := lower(trim(p_email));
  v_row public.user_invitations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'No active workspace found'; END IF;
  IF v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  IF NOT public.can_invite_workspace_role(p_role) THEN
    RAISE EXCEPTION 'You cannot assign this role';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.email) = v_email) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;
  IF p_property_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id AND p.workspace_id = v_workspace
  ) THEN
    RAISE EXCEPTION 'Property is outside the active workspace';
  END IF;
  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id AND c.workspace_id = v_workspace
  ) THEN
    RAISE EXCEPTION 'Organization is outside the active workspace';
  END IF;

  UPDATE public.user_invitations
     SET revoked_at = now(), updated_at = now()
   WHERE workspace_id = v_workspace
     AND lower(email) = v_email
     AND accepted_at IS NULL
     AND revoked_at IS NULL;

  INSERT INTO public.user_invitations (
    email, role, full_name, property_id, client_id, workspace_id,
    invited_by, token, expires_at
  ) VALUES (
    v_email, p_role, NULLIF(trim(p_full_name), ''), p_property_id, p_client_id,
    v_workspace, auth.uid(), gen_random_uuid()::text || '-' || gen_random_uuid()::text,
    now() + interval '7 days'
  )
  RETURNING * INTO v_row;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, invitation_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), v_row.id, 'user.invited',
    jsonb_build_object('email', v_email, 'role', p_role::text)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.user_invitations;
  v_workspace uuid := public.workspace_for_user(auth.uid());
BEGIN
  SELECT * INTO v_row FROM public.user_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF v_row.id IS NULL OR v_row.workspace_id IS DISTINCT FROM v_workspace THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF NOT public.can_invite_workspace_role(v_row.role) THEN
    RAISE EXCEPTION 'You cannot revoke this invitation';
  END IF;
  IF v_row.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation was already accepted'; END IF;

  UPDATE public.user_invitations SET revoked_at = now(), updated_at = now()
  WHERE id = p_invitation_id;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, invitation_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_invitation_id, 'invitation.revoked',
    jsonb_build_object('email', v_row.email, 'role', v_row.role::text)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_workspace_user_role(
  p_target_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
BEGIN
  IF NOT public.can_administer_workspace_user(p_target_user_id) THEN
    RAISE EXCEPTION 'You cannot manage this user';
  END IF;
  IF NOT public.can_invite_workspace_role(p_role) THEN
    RAISE EXCEPTION 'You cannot assign this role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, target_user_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_target_user_id, 'role.assigned',
    jsonb_build_object('role', p_role::text)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_workspace_user_role(
  p_target_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
BEGIN
  IF NOT public.can_administer_workspace_user(p_target_user_id) THEN
    RAISE EXCEPTION 'You cannot manage this user';
  END IF;
  IF NOT public.can_invite_workspace_role(p_role) THEN
    RAISE EXCEPTION 'You cannot remove this role';
  END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE user_id = p_target_user_id) <= 1 THEN
    RAISE EXCEPTION 'Every user must retain at least one role';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role = p_role;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, target_user_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_target_user_id, 'role.removed',
    jsonb_build_object('role', p_role::text)
  );
END;
$$;

-- Only a valid, unexpired, single-use invitation can attach a new workforce
-- account to an existing workspace. Untrusted workspace_id signup metadata is
-- no longer sufficient.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_company text;
  v_invitation public.user_invitations;
  v_token text := NULLIF(NEW.raw_user_meta_data ->> 'invitation_token', '');
  v_requested_workspace text := NULLIF(NEW.raw_user_meta_data ->> 'workspace_id', '');
BEGIN
  IF v_token IS NOT NULL THEN
    SELECT * INTO v_invitation
    FROM public.user_invitations i
    WHERE i.token = v_token
      AND lower(i.email) = lower(NEW.email)
      AND i.accepted_at IS NULL
      AND i.revoked_at IS NULL
      AND i.expires_at > now()
    FOR UPDATE;

    IF v_invitation.id IS NULL OR v_invitation.workspace_id IS NULL THEN
      RAISE EXCEPTION 'Invitation is invalid, expired, revoked, or belongs to another email';
    END IF;

    v_workspace := v_invitation.workspace_id;

    INSERT INTO public.profiles (
      user_id, full_name, email, workspace_id, client_id, status
    ) VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), v_invitation.full_name),
      NEW.email,
      v_workspace,
      v_invitation.client_id,
      'active'
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_invitation.role);

    IF v_invitation.property_id IS NOT NULL THEN
      INSERT INTO public.property_team_members (
        property_id, user_id, role, status, added_by
      ) VALUES (
        v_invitation.property_id, NEW.id, v_invitation.role, 'active', v_invitation.invited_by
      )
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.user_invitations
       SET accepted_at = now(), accepted_by = NEW.id, updated_at = now()
     WHERE id = v_invitation.id;

    INSERT INTO public.enterprise_user_audit_log (
      tenant_id, actor_user_id, target_user_id, invitation_id, action, details
    ) VALUES (
      v_workspace, v_invitation.invited_by, NEW.id, v_invitation.id, 'invitation.accepted',
      jsonb_build_object('email', NEW.email, 'role', v_invitation.role::text)
    );
  ELSIF v_requested_workspace IS NOT NULL THEN
    RAISE EXCEPTION 'A valid invitation token is required to join an existing workspace';
  ELSE
    v_company := COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', '') || '''s Workspace',
      split_part(NEW.email, '@', 1) || '''s Workspace'
    );

    INSERT INTO public.workspaces (name, owner_user_id)
    VALUES (v_company, NEW.id)
    RETURNING id INTO v_workspace;

    INSERT INTO public.profiles (user_id, full_name, email, workspace_id, status)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, v_workspace, 'active');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- Suspended/deactivated workforce profiles lose tenant resolution immediately,
-- including while an old access token is still present.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.status, 'active') <> 'active'
    ) THEN NULL
    ELSE COALESCE(
      NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
      (SELECT p.workspace_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
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
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.status, 'active') <> 'active'
    ) THEN NULL
    ELSE COALESCE(
      public.current_tenant_id(),
      (SELECT p.workspace_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1),
      (
        SELECT pm.tenant_id FROM public.portal_memberships pm
        WHERE pm.user_id = auth.uid() AND pm.is_active = true
        ORDER BY CASE pm.portal_kind WHEN 'main' THEN 1 WHEN 'owner' THEN 2 WHEN 'sub' THEN 3 ELSE 4 END
        LIMIT 1
      ),
      (SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid() LIMIT 1)
    )
  END;
$$;

-- A user may edit their own ordinary profile fields, but cannot reactivate
-- themselves or move their account to another tenant through the broad legacy
-- self-update profile policy. Service-role and administrator workflows have no
-- auth.uid() in their database session and remain able to perform these writes.
CREATE OR REPLACE FUNCTION public.protect_own_enterprise_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'Account status and workspace membership must be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_own_enterprise_profile_fields ON public.profiles;
CREATE TRIGGER protect_own_enterprise_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_own_enterprise_profile_fields();

-- Replace legacy permissive/overlapping invitation and role policies. All
-- writes now go through the audited SECURITY DEFINER functions above.
DROP POLICY IF EXISTS "Admins and managers can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins and managers can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Role managers can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Role managers can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Role managers can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Role managers can delete invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_update" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_delete" ON public.user_invitations;

CREATE POLICY user_invitations_enterprise_select ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    workspace_id = public.workspace_for_user(auth.uid())
    AND public.workspace_admin_level(auth.uid(), workspace_id) >= 100
  );

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role managers can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role managers can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role managers can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role managers can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

CREATE POLICY user_roles_enterprise_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.workspace_for_user(user_id) = public.workspace_for_user(auth.uid())
      AND public.workspace_admin_level(auth.uid(), public.workspace_for_user(auth.uid())) >= 100
    )
  );

CREATE POLICY enterprise_user_audit_select ON public.enterprise_user_audit_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.workspace_for_user(auth.uid())
    AND public.workspace_admin_level(auth.uid(), tenant_id) >= 190
  );

-- Admins may view workspace status history; writes remain RPC/service-only.
DROP POLICY IF EXISTS "user_status_history_select" ON public.user_status_history;
DROP POLICY IF EXISTS "user_status_history_insert" ON public.user_status_history;
DROP POLICY IF EXISTS "user_status_history_update" ON public.user_status_history;
DROP POLICY IF EXISTS "user_status_history_delete" ON public.user_status_history;
CREATE POLICY user_status_history_enterprise_select ON public.user_status_history
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.workspace_for_user(user_id) = public.workspace_for_user(auth.uid())
      AND public.workspace_admin_level(auth.uid(), public.workspace_for_user(auth.uid())) >= 100
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.user_invitations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.enterprise_user_audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_status_history FROM authenticated;

GRANT SELECT ON public.enterprise_user_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_admin_level(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_invite_workspace_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assignable_workspace_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_administer_workspace_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_invitation(text, public.app_role, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_workspace_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_workspace_user_role(uuid, public.app_role) TO authenticated;

COMMIT;
