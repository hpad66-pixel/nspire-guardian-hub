BEGIN;
SELECT plan(14);

SELECT has_function('public', 'is_client_member', ARRAY['uuid','uuid'], 'client membership predicate exists');
SELECT has_function('public', 'can_manage_client_projects', ARRAY['uuid','uuid'], 'client project administrator predicate exists');
SELECT has_function('public', 'get_client_project_access', ARRAY['uuid'], 'client project capability RPC exists');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '94000000-0000-4000-8000-000000000001',
    'client-scope-workspace-admin@example.com',
    '{"full_name":"Client Scope Workspace Admin","company_name":"Client Scope Primary Workspace"}'::jsonb
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    'client-scope-administrator@example.com',
    '{"full_name":"Client Scope Administrator","company_name":"Client Scope Temporary Workspace"}'::jsonb
  );

-- Make the second identity a client administrator inside the first identity's
-- workspace, not a workspace administrator in its own right.
UPDATE public.workspaces
SET owner_user_id = '94000000-0000-4000-8000-000000000001'
WHERE owner_user_id = '94000000-0000-4000-8000-000000000002';

DELETE FROM public.user_roles
WHERE user_id = '94000000-0000-4000-8000-000000000002';

INSERT INTO public.user_roles (user_id, role)
VALUES ('94000000-0000-4000-8000-000000000002', 'administrator');

INSERT INTO public.clients (id, name, client_type, workspace_id, created_by)
VALUES
  (
    '94000000-0000-4000-8000-000000000011',
    'Client Scope R4',
    'business_client',
    (SELECT workspace_id FROM public.profiles WHERE user_id = '94000000-0000-4000-8000-000000000001'),
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94000000-0000-4000-8000-000000000012',
    'Client Scope Larkin',
    'business_client',
    (SELECT workspace_id FROM public.profiles WHERE user_id = '94000000-0000-4000-8000-000000000001'),
    '94000000-0000-4000-8000-000000000001'
  );

UPDATE public.profiles
SET workspace_id = (
      SELECT workspace_id
      FROM public.profiles
      WHERE user_id = '94000000-0000-4000-8000-000000000001'
    ),
    client_id = '94000000-0000-4000-8000-000000000011',
    status = 'active'
WHERE user_id = '94000000-0000-4000-8000-000000000002';

INSERT INTO public.projects (id, client_id, name, project_type, created_by)
VALUES (
  '94000000-0000-4000-8000-000000000021',
  '94000000-0000-4000-8000-000000000011',
  'Existing R4 Client Project',
  'construction',
  '94000000-0000-4000-8000-000000000001'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  public.is_client_member(
    auth.uid(),
    '94000000-0000-4000-8000-000000000011'
  ),
  'assigned user is recognized as a member of their client'
);

SELECT ok(
  public.can_manage_client_projects(
    auth.uid(),
    '94000000-0000-4000-8000-000000000011'
  ),
  'assigned administrator can manage projects for their client'
);

SELECT ok(
  NOT public.can_manage_client_projects(
    auth.uid(),
    '94000000-0000-4000-8000-000000000012'
  ),
  'assigned administrator cannot manage another client'
);

SELECT is(
  (SELECT count(*)::integer
   FROM public.clients
   WHERE id IN (
     '94000000-0000-4000-8000-000000000011',
     '94000000-0000-4000-8000-000000000012'
   )),
  1,
  'client administrator only sees the assigned client'
);

SELECT is(
  (SELECT count(*)::integer
   FROM public.projects
   WHERE id = '94000000-0000-4000-8000-000000000021'),
  1,
  'client administrator sees existing projects for the assigned client'
);

SELECT lives_ok(
  $$ INSERT INTO public.projects (id, client_id, name, project_type, created_by)
     VALUES (
       '94000000-0000-4000-8000-000000000022',
       '94000000-0000-4000-8000-000000000011',
       'New R4 Client Project',
       'construction',
       auth.uid()
     ) $$,
  'client administrator can create a project inside the assigned client'
);

SELECT throws_ok(
  $$ INSERT INTO public.projects (id, client_id, name, project_type, created_by)
     VALUES (
       '94000000-0000-4000-8000-000000000023',
       '94000000-0000-4000-8000-000000000012',
       'Forbidden Larkin Project',
       'consulting',
       auth.uid()
     ) $$,
  '42501',
  NULL,
  'client administrator cannot create a project for another client'
);

SELECT lives_ok(
  $$ UPDATE public.projects
     SET scope = 'Client administrator updated scope'
     WHERE id = '94000000-0000-4000-8000-000000000022' $$,
  'client administrator can update a standalone project for the assigned client'
);

DELETE FROM public.projects
WHERE id = '94000000-0000-4000-8000-000000000022';

SELECT is(
  (SELECT count(*)::integer
   FROM public.projects
   WHERE id = '94000000-0000-4000-8000-000000000022'),
  1,
  'client administrator cannot delete projects'
);

SELECT is(
  (SELECT can_create
   FROM public.get_client_project_access('94000000-0000-4000-8000-000000000011')),
  true,
  'capability RPC exposes client-level creation access'
);

SELECT is(
  (SELECT can_delete
   FROM public.get_client_project_access('94000000-0000-4000-8000-000000000011')),
  false,
  'capability RPC reserves deletion for workspace administrators'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
