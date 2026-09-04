-- Proj OS Agent Gateway foundation (runtime contract 2026-09-01).
-- Proj OS owns identity, authorization, entitlements, profiles, sessions, and
-- audit. Runtime services never receive a database credential.

CREATE OR REPLACE FUNCTION public.agent_project_tenant_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(pr.workspace_id, c.workspace_id, creator.workspace_id)
  FROM public.projects pj
  LEFT JOIN public.properties pr ON pr.id = pj.property_id
  LEFT JOIN public.clients c ON c.id = pj.client_id
  LEFT JOIN public.profiles creator ON creator.user_id = pj.created_by
  WHERE pj.id = p_project_id
  LIMIT 1;
$$;

CREATE TABLE public.agent_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  runtime_kind text NOT NULL DEFAULT 'hermes',
  status text NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  allowed_scopes text[] NOT NULL DEFAULT ARRAY['project:read']::text[],
  allowed_tools text[] NOT NULL DEFAULT ARRAY['project.tasks.list']::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, project_id, runtime_kind)
);

CREATE TABLE public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  runtime_kind text NOT NULL DEFAULT 'hermes',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'archived')),
  display_name text NOT NULL,
  runtime_version text,
  model_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, project_id, runtime_kind)
);

CREATE TABLE public.agent_sessions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_profile_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  runtime_kind text NOT NULL,
  runtime_audience text NOT NULL,
  token_jti uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  allowed_scopes text[] NOT NULL DEFAULT '{}'::text[],
  allowed_tools text[] NOT NULL DEFAULT '{}'::text[],
  idempotency_key_hash text NOT NULL CHECK (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  correlation_id uuid NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > issued_at),
  CHECK (expires_at <= issued_at + interval '10 minutes'),
  UNIQUE (tenant_id, user_id, project_id, idempotency_key_hash)
);

CREATE TABLE public.agent_tool_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_profile_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  tool_call_id uuid NOT NULL,
  tool_name text NOT NULL,
  arguments_digest text NOT NULL CHECK (arguments_digest ~ '^[a-f0-9]{64}$'),
  correlation_id uuid NOT NULL,
  permission_decision text NOT NULL CHECK (permission_decision IN ('allowed', 'denied')),
  result_status text NOT NULL CHECK (result_status IN ('succeeded', 'denied', 'failed', 'timed_out')),
  denial_code text,
  record_count integer CHECK (record_count IS NULL OR record_count >= 0),
  source_record_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  requested_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, tool_call_id)
);

CREATE INDEX agent_entitlements_user_project_idx
  ON public.agent_entitlements (tenant_id, user_id, project_id, status);
CREATE INDEX agent_profiles_user_project_idx
  ON public.agent_profiles (tenant_id, user_id, project_id, status);
CREATE INDEX agent_sessions_active_idx
  ON public.agent_sessions (tenant_id, user_id, project_id, expires_at DESC)
  WHERE status = 'active';
CREATE INDEX agent_sessions_correlation_idx ON public.agent_sessions (correlation_id);
CREATE INDEX agent_tool_runs_audit_idx
  ON public.agent_tool_runs (tenant_id, user_id, project_id, created_at DESC);
CREATE INDEX agent_tool_runs_correlation_idx ON public.agent_tool_runs (correlation_id);

CREATE OR REPLACE FUNCTION public.validate_agent_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_tenant uuid;
  v_user_tenant uuid;
  v_profile record;
  v_session record;
BEGIN
  v_project_tenant := public.agent_project_tenant_id(NEW.project_id);
  SELECT workspace_id INTO v_user_tenant
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_project_tenant IS NULL OR v_project_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Agent project is outside the tenant boundary' USING ERRCODE = '23514';
  END IF;
  IF v_user_tenant IS NULL OR v_user_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Agent user is outside the tenant boundary' USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME IN ('agent_sessions', 'agent_tool_runs') THEN
    SELECT tenant_id, user_id, project_id INTO v_profile
    FROM public.agent_profiles WHERE id = NEW.agent_profile_id;
    IF NOT FOUND OR v_profile.tenant_id <> NEW.tenant_id
      OR v_profile.user_id <> NEW.user_id OR v_profile.project_id <> NEW.project_id THEN
      RAISE EXCEPTION 'Agent profile scope mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'agent_tool_runs' THEN
    SELECT tenant_id, user_id, project_id, agent_profile_id INTO v_session
    FROM public.agent_sessions WHERE id = NEW.session_id;
    IF NOT FOUND OR v_session.tenant_id <> NEW.tenant_id
      OR v_session.user_id <> NEW.user_id OR v_session.project_id <> NEW.project_id
      OR v_session.agent_profile_id <> NEW.agent_profile_id THEN
      RAISE EXCEPTION 'Agent session scope mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.agent_project_tenant_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_agent_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_project_tenant_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_agent_scope() TO service_role;

CREATE TRIGGER agent_entitlements_validate_scope
  BEFORE INSERT OR UPDATE ON public.agent_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_scope();
CREATE TRIGGER agent_profiles_validate_scope
  BEFORE INSERT OR UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_scope();
CREATE TRIGGER agent_sessions_validate_scope
  BEFORE INSERT OR UPDATE ON public.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_scope();
CREATE TRIGGER agent_tool_runs_validate_scope
  BEFORE INSERT OR UPDATE ON public.agent_tool_runs
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_scope();

CREATE OR REPLACE FUNCTION public.reject_agent_tool_run_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Agent tool audit rows are append-only' USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_agent_tool_run_update() FROM PUBLIC;

CREATE TRIGGER agent_tool_runs_append_only
  BEFORE UPDATE ON public.agent_tool_runs
  FOR EACH ROW EXECUTE FUNCTION public.reject_agent_tool_run_update();

CREATE TRIGGER agent_entitlements_updated_at
  BEFORE UPDATE ON public.agent_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agent_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_runs ENABLE ROW LEVEL SECURITY;

-- Browser access is read-only and remains constrained by the policies below.
-- All writes go through the admin RPC or the service-role Edge gateways.
REVOKE ALL ON TABLE public.agent_entitlements, public.agent_profiles,
  public.agent_sessions, public.agent_tool_runs FROM anon, authenticated;
GRANT SELECT ON TABLE public.agent_entitlements, public.agent_profiles,
  public.agent_sessions, public.agent_tool_runs TO authenticated;
GRANT ALL ON TABLE public.agent_entitlements, public.agent_profiles,
  public.agent_sessions, public.agent_tool_runs TO service_role;

CREATE POLICY agent_entitlements_owner_select ON public.agent_entitlements
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
  );
CREATE POLICY agent_entitlements_admin_modify ON public.agent_entitlements
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_workspace_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_workspace_admin(auth.uid()));

CREATE POLICY agent_profiles_owner_select ON public.agent_profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
  );
CREATE POLICY agent_profiles_admin_modify ON public.agent_profiles
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_workspace_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_workspace_admin(auth.uid()));

CREATE POLICY agent_sessions_owner_select ON public.agent_sessions
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
  );

CREATE POLICY agent_tool_runs_owner_select ON public.agent_tool_runs
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
  );

COMMENT ON TABLE public.agent_entitlements IS
  'Deny-by-default user/project enablement and runtime tool policy owned by Proj OS.';
COMMENT ON TABLE public.agent_profiles IS
  'Authoritative metadata for one tenant/user/project/runtime profile; runtime data remains replaceable.';
COMMENT ON TABLE public.agent_sessions IS
  'Short-lived signed runtime sessions issued only after current Proj OS authorization checks.';
COMMENT ON TABLE public.agent_tool_runs IS
  'Immutable, tenant-scoped authorization and outcome audit for every Agent Gateway tool request.';

NOTIFY pgrst, 'reload schema';
