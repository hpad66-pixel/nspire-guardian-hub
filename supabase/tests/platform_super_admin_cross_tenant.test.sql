BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
VALUES
  (
    '91000000-0000-4000-8000-000000000001',
    'platform-admin-rls-test@example.com',
    '{"full_name":"Platform Admin RLS Test"}'::jsonb,
    '{"role":"super_admin"}'::jsonb
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    'workspace-admin-rls-test@example.com',
    '{"full_name":"Workspace Admin RLS Test"}'::jsonb,
    '{}'::jsonb
  );

INSERT INTO public.properties (id, name, address, city, state, workspace_id)
SELECT
  CASE p.user_id
    WHEN '91000000-0000-4000-8000-000000000001'::uuid
      THEN '91000000-0000-4000-8000-000000000011'::uuid
    ELSE '91000000-0000-4000-8000-000000000012'::uuid
  END,
  CASE p.user_id
    WHEN '91000000-0000-4000-8000-000000000001'::uuid
      THEN 'Platform Admin Test Property'
    ELSE 'Other Workspace Test Property'
  END,
  '1 Test Way',
  'Test City',
  'TX',
  p.workspace_id
FROM public.profiles p
WHERE p.user_id IN (
  '91000000-0000-4000-8000-000000000001'::uuid,
  '91000000-0000-4000-8000-000000000002'::uuid
);

INSERT INTO public.projects (id, property_id, name)
VALUES
  (
    '91000000-0000-4000-8000-000000000021',
    '91000000-0000-4000-8000-000000000011',
    'Platform Admin Workspace Project'
  ),
  (
    '91000000-0000-4000-8000-000000000022',
    '91000000-0000-4000-8000-000000000012',
    'Other Workspace Project'
  );

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::integer
   FROM public.projects
   WHERE id IN (
     '91000000-0000-4000-8000-000000000021'::uuid,
     '91000000-0000-4000-8000-000000000022'::uuid
   )),
  1,
  'an ordinary workspace administrator remains tenant-scoped'
);

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"super_admin"}}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  public.is_super_admin(),
  'the protected Auth account is recognized as a platform super-administrator'
);

SELECT is(
  (SELECT count(*)::integer
   FROM public.projects
   WHERE id IN (
     '91000000-0000-4000-8000-000000000021'::uuid,
     '91000000-0000-4000-8000-000000000022'::uuid
   )),
  2,
  'a platform super-administrator can read projects across workspaces'
);

SELECT * FROM finish();
ROLLBACK;
