BEGIN;
SELECT plan(20);

SELECT has_table('public', 'project_lifecycle_events', 'project lifecycle audit table exists');
SELECT has_column('public', 'projects', 'closed_at', 'projects record the certified close time');
SELECT has_column('public', 'projects', 'close_reason', 'projects record the closeout reason');
SELECT has_column('public', 'projects', 'close_snapshot', 'projects retain the closeout snapshot');
SELECT has_column('public', 'projects', 'reopen_reason', 'projects record an administrator reopen reason');
SELECT has_function('public', 'close_project', ARRAY['uuid', 'text', 'boolean'], 'controlled project close function exists');
SELECT has_function('public', 'reopen_project', ARRAY['uuid', 'text'], 'administrator reopen function exists');
SELECT has_function('public', 'guard_closed_project_child_write', ARRAY[]::text[], 'closed-project child write guard exists');
SELECT has_function('public', 'guard_closed_project_indirect_write', ARRAY[]::text[], 'second-level project write guard exists');

INSERT INTO public.workspaces (id, name)
VALUES ('96000000-0000-4000-8000-000000000001', 'Project Lifecycle Test');

INSERT INTO public.projects (id, workspace_id, name, project_type, status)
VALUES (
  '96000000-0000-4000-8000-000000000002',
  '96000000-0000-4000-8000-000000000001',
  'Ashish Painting Test',
  'construction',
  'active'
);

SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"super_admin"}}', true);

SELECT lives_ok(
  $$ SELECT public.close_project(
    '96000000-0000-4000-8000-000000000002',
    'Closed with a sustained project loss',
    false
  ) $$,
  'administrator can certify and close a project'
);

SELECT is(
  (SELECT status::text FROM public.projects WHERE id = '96000000-0000-4000-8000-000000000002'),
  'closed',
  'certified close marks the project closed'
);
SELECT is(
  (SELECT close_reason FROM public.projects WHERE id = '96000000-0000-4000-8000-000000000002'),
  'Closed with a sustained project loss',
  'the close reason is permanently stamped on the project'
);
SELECT is(
  (SELECT count(*)::integer FROM public.project_lifecycle_events
    WHERE project_id = '96000000-0000-4000-8000-000000000002' AND event_type = 'closed'),
  1,
  'closeout creates one lifecycle event'
);

SELECT throws_ok(
  $$ INSERT INTO public.project_closeout_items (project_id, title)
     VALUES ('96000000-0000-4000-8000-000000000002', 'Late closeout item') $$,
  'P0001',
  'This project is closed and read-only. An administrator must reopen it before changes can be made.',
  'child records cannot be added to a closed project'
);

SELECT throws_ok(
  $$ UPDATE public.projects SET name = 'Silent edit'
      WHERE id = '96000000-0000-4000-8000-000000000002' $$,
  'P0001',
  'This project is closed and read-only. Use the administrator reopen action first.',
  'the closed project row cannot be edited directly'
);

SELECT throws_ok(
  $$ DELETE FROM public.projects
      WHERE id = '96000000-0000-4000-8000-000000000002' $$,
  'P0001',
  'This project is closed and read-only. Use the administrator reopen action first.',
  'a closed project cannot be deleted before it is reopened'
);

SELECT lives_ok(
  $$ SELECT public.reopen_project(
    '96000000-0000-4000-8000-000000000002',
    'Administrator reopened for a corrective entry'
  ) $$,
  'administrator can reopen through the controlled action'
);

SELECT is(
  (SELECT status::text FROM public.projects WHERE id = '96000000-0000-4000-8000-000000000002'),
  'active',
  'reopen restores the prior active status'
);
SELECT is(
  (SELECT count(*)::integer FROM public.project_lifecycle_events
    WHERE project_id = '96000000-0000-4000-8000-000000000002'),
  2,
  'reopen is appended to the lifecycle audit trail'
);

SELECT lives_ok(
  $$ INSERT INTO public.project_closeout_items (project_id, title)
     VALUES ('96000000-0000-4000-8000-000000000002', 'Authorized corrective item') $$,
  'project records become editable only after the authorized reopen'
);

SELECT * FROM finish();
ROLLBACK;
