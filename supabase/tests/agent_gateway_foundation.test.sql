BEGIN;
SELECT plan(34);

SELECT has_table('public', 'agent_entitlements', 'agent access has an explicit entitlement table');
SELECT has_table('public', 'agent_profiles', 'agent profiles are durable Proj OS records');
SELECT has_table('public', 'agent_sessions', 'short-lived agent sessions are auditable');
SELECT has_table('public', 'agent_tool_runs', 'agent tool decisions and provenance are auditable');

SELECT has_column('public', 'agent_entitlements', 'tenant_id', 'entitlements are tenant scoped');
SELECT has_column('public', 'agent_profiles', 'tenant_id', 'profiles are tenant scoped');
SELECT has_column('public', 'agent_sessions', 'tenant_id', 'sessions are tenant scoped');
SELECT has_column('public', 'agent_tool_runs', 'tenant_id', 'tool runs are tenant scoped');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_entitlements'::regclass), 'entitlements use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_profiles'::regclass), 'profiles use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_sessions'::regclass), 'sessions use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_tool_runs'::regclass), 'tool runs use RLS');

SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.agent_entitlements'::regclass AND tgname = 'agent_entitlements_validate_scope' AND NOT tgisinternal),
  'entitlement writes validate tenant, user, and project scope'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.agent_sessions'::regclass AND tgname = 'agent_sessions_validate_scope' AND NOT tgisinternal),
  'session writes validate tenant, user, profile, and project scope'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agent_sessions'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE') AND 'authenticated' = ANY(roles)
  ),
  'browser users cannot mint or mutate agent sessions directly'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agent_tool_runs'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE') AND 'authenticated' = ANY(roles)
  ),
  'browser users cannot forge or mutate agent tool audit rows'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agent_sessions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%' || quote_literal('00:10:00') || '::interval%'
  ),
  'database constrains agent sessions to ten minutes'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agent_tool_runs'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%session_id, tool_call_id%'
  ),
  'a tool call identifier is single-use within a session'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('agent_sessions', 'agent_tool_runs')
      AND column_name IN ('session_token', 'raw_arguments', 'tool_arguments')
  ),
  'audit schema stores neither bearer tokens nor raw tool arguments'
);
SELECT ok(
  (
    SELECT column_default LIKE '%project.tasks.list%' AND column_default NOT LIKE '%,%'
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agent_entitlements' AND column_name = 'allowed_tools'
  ),
  'the default entitlement exposes only the first read-only tool'
);

SELECT has_function(
  'public',
  'set_agent_pilot_entitlement',
  ARRAY['uuid', 'uuid', 'boolean'],
  'pilot enrollment has one typed admin operation'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure),
  'pilot enrollment runs with a controlled definer boundary'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.set_agent_pilot_entitlement(uuid,uuid,boolean)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.set_agent_pilot_entitlement(uuid,uuid,boolean)', 'EXECUTE'),
  'only authenticated callers can reach the admin enrollment operation'
);
SELECT ok(
  pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%is_workspace_admin%'
  AND pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%current_tenant_id%'
  AND pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%can_access_project%',
  'pilot enrollment rechecks administrator, tenant, and current project access'
);
SELECT ok(
  pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%project.tasks.list%'
  AND pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%project:read%',
  'pilot enrollment cannot broaden the first read-only capability'
);
SELECT ok(
  pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%UPDATE public.agent_sessions%'
  AND pg_get_functiondef('public.set_agent_pilot_entitlement(uuid,uuid,boolean)'::regprocedure) LIKE '%revoked%',
  'disabling a pilot entitlement revokes active sessions immediately'
);
SELECT has_function(
  'public',
  'has_agent_pilot_entitlement',
  ARRAY['uuid'],
  'the UI has a narrow current-user pilot visibility check'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.has_agent_pilot_entitlement(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.has_agent_pilot_entitlement(uuid)', 'EXECUTE'),
  'anonymous callers cannot inspect Agent pilot enrollment'
);

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
VALUES (
  '91000000-0000-4000-8000-000000000001',
  'agent-pilot-admin@example.test',
  'authenticated',
  'authenticated',
  now(),
  now()
);
INSERT INTO public.workspaces (id, name, slug, owner_user_id, plan, status)
VALUES (
  '91000000-0000-4000-8000-000000000002',
  'Agent pilot test workspace',
  'agent-pilot-test-workspace',
  '91000000-0000-4000-8000-000000000001',
  'enterprise',
  'active'
);
UPDATE public.profiles
SET full_name = 'Agent Pilot Admin',
    email = 'agent-pilot-admin@example.test',
    workspace_id = '91000000-0000-4000-8000-000000000002',
    status = 'active'
WHERE user_id = '91000000-0000-4000-8000-000000000001';
INSERT INTO public.user_roles (user_id, role)
VALUES ('91000000-0000-4000-8000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.properties (id, name, address, city, state, workspace_id, created_by)
VALUES (
  '91000000-0000-4000-8000-000000000003',
  'Agent pilot test property',
  '1 Test Way',
  'Test City',
  'FL',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001'
);
INSERT INTO public.projects (id, property_id, name, created_by)
VALUES (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000003',
  'Agent pilot test project',
  '91000000-0000-4000-8000-000000000001'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '91000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'tenant_id', '91000000-0000-4000-8000-000000000002'
  )::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.set_agent_pilot_entitlement(
    '91000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000004',
    true
  )$$,
  'an authenticated workspace admin can enable one pilot project'
);
SELECT is(
  (
    SELECT allowed_scopes::text || '|' || allowed_tools::text || '|' || status
    FROM public.agent_entitlements
    WHERE user_id = '91000000-0000-4000-8000-000000000001'
      AND project_id = '91000000-0000-4000-8000-000000000004'
  ),
  '{project:read}|{project.tasks.list}|enabled',
  'pilot enrollment writes only the fixed read-only capability'
);
SELECT ok(
  public.has_agent_pilot_entitlement('91000000-0000-4000-8000-000000000004'),
  'the enrolled user can see the Agent launcher for the allowed project'
);
RESET ROLE;

INSERT INTO public.agent_profiles (
  id, tenant_id, user_id, project_id, runtime_kind, display_name
) VALUES (
  '91000000-0000-4000-8000-000000000005',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000004',
  'hermes',
  'Agent Pilot Admin · project agent'
);
INSERT INTO public.agent_sessions (
  id, tenant_id, user_id, project_id, agent_profile_id, runtime_kind,
  runtime_audience, token_jti, allowed_scopes, allowed_tools,
  idempotency_key_hash, correlation_id, issued_at, expires_at
) VALUES (
  '91000000-0000-4000-8000-000000000006',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000005',
  'hermes',
  'proj-os-agent-runtime',
  '91000000-0000-4000-8000-000000000007',
  ARRAY['project:read']::text[],
  ARRAY['project.tasks.list']::text[],
  repeat('a', 64),
  '91000000-0000-4000-8000-000000000008',
  now(),
  now() + interval '5 minutes'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.set_agent_pilot_entitlement(
    '91000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000004',
    false
  )$$,
  'an authenticated workspace admin can disable the pilot project'
);
SELECT is(
  (
    SELECT status || '|' || COALESCE(revoke_reason, '')
    FROM public.agent_sessions
    WHERE id = '91000000-0000-4000-8000-000000000006'
  ),
  'revoked|Pilot entitlement disabled',
  'disabling the entitlement revokes its active session with a reason'
);
SELECT ok(
  NOT public.has_agent_pilot_entitlement('91000000-0000-4000-8000-000000000004'),
  'the disabled user immediately loses Agent launcher eligibility'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
