BEGIN;
SELECT plan(17);

SELECT has_function('public', 'is_client_member', ARRAY['uuid','uuid'], 'client membership predicate exists');
SELECT has_function('public', 'can_manage_client_projects', ARRAY['uuid','uuid'], 'client project administrator predicate exists');
SELECT has_function('public', 'create_client_project', ARRAY['uuid','text','text','text','text','numeric','date','date','project_status'], 'guarded client project creation RPC exists');
SELECT has_function('public', 'update_client_project', ARRAY['uuid','text','text','text','text','numeric','date','date','project_status'], 'guarded client project update RPC exists');
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
  $$ SELECT public.create_client_project(
       '94000000-0000-4000-8000-000000000011',
       'New R4 Client Project',
       'construction'
     ) $$,
  'client administrator can create through the guarded client RPC'
);

SELECT throws_ok(
  $$ SELECT public.create_client_project(
       '94000000-0000-4000-8000-000000000012',
       'Forbidden Larkin Project',
       'consulting'
     ) $$,
  '42501',
  'Not authorized to create projects for this client',
  'guarded RPC rejects creation for another client'
);

SELECT lives_ok(
  $$ SELECT public.update_client_project(
       (SELECT id FROM public.projects WHERE name = 'New R4 Client Project'),
       'New R4 Client Project - Updated',
       'construction',
       NULL,
       'Client administrator updated scope'
     ) $$,
  'client administrator can update through the guarded client RPC'
);

SELECT is(
  (SELECT count(*)::integer
   FROM public.projects
   WHERE name = 'New R4 Client Project - Updated'
     AND scope = 'Client administrator updated scope'),
  1,
  'guarded write persists the client project changes'
);

SELECT throws_ok(
  $$ INSERT INTO public.projects (client_id, name, project_type, created_by)
     VALUES (
       '94000000-0000-4000-8000-000000000011',
       'Direct Write Must Stay Closed',
       'construction',
       auth.uid()
     ) $$,
  '42501',
  NULL,
  'direct client project table writes remain closed'
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
