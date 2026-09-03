BEGIN;
SELECT plan(23);

SELECT has_table('public', 'client_team_members', 'client team memberships exist');
SELECT has_table('public', 'project_discussion_mentions', 'discussion mentions are persisted');
SELECT has_table('public', 'project_deletion_audit', 'project removals have an audit ledger');
SELECT has_column('public', 'projects', 'deleted_at', 'projects support durable removal');
SELECT has_function('public', 'upsert_client_team_member', ARRAY['uuid','uuid','app_role'], 'client assignment RPC exists');
SELECT has_function('public', 'upsert_project_team_member', ARRAY['uuid','uuid','app_role'], 'project assignment RPC exists');
SELECT has_function('public', 'get_project_mention_candidates', ARRAY['uuid','text','integer'], 'scoped mention directory exists');
SELECT has_function('public', 'create_project_discussion_with_mentions', ARRAY['uuid','text','text','text[]','uuid[]'], 'transactional discussion RPC exists');
SELECT has_function('public', 'create_project_discussion_reply_with_mentions', ARRAY['uuid','text','text[]','uuid[]'], 'transactional reply RPC exists');
SELECT has_function('public', 'delete_project_as_super_admin', ARRAY['uuid','boolean'], 'protected project removal RPC exists');

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('95000000-0000-4000-8000-000000000001', 'scoped-team-admin@example.com', '{"role":"super_admin"}', '{"full_name":"Scoped Team Admin","company_name":"Scoped Team Workspace"}'),
  ('95000000-0000-4000-8000-000000000002', 'scoped-team-manager@example.com', '{}', '{"full_name":"Client Manager","company_name":"Temporary Manager Workspace"}'),
  ('95000000-0000-4000-8000-000000000003', 'scoped-team-member@example.com', '{}', '{"full_name":"Project Member","company_name":"Temporary Member Workspace"}');

UPDATE public.profiles
SET workspace_id = (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
    status = 'active'
WHERE user_id IN ('95000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000003');

DELETE FROM public.user_roles
WHERE user_id IN ('95000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000003');

INSERT INTO public.clients (id, name, client_type, workspace_id, created_by)
VALUES (
  '95000000-0000-4000-8000-000000000011', 'Scoped Team Client', 'business_client',
  (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
  '95000000-0000-4000-8000-000000000001'
);

INSERT INTO public.projects (id, client_id, name, project_type, workspace_id, created_by)
VALUES (
  '95000000-0000-4000-8000-000000000021', '95000000-0000-4000-8000-000000000011',
  'Scoped Team Project', 'consulting',
  (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
  '95000000-0000-4000-8000-000000000001'
);

SELECT set_config('request.jwt.claims', '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"super_admin"}}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.upsert_client_team_member('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000002', 'manager') $$,
  'account administrator can assign an existing person to a client'
);
SELECT lives_ok(
  $$ SELECT public.upsert_project_team_member('95000000-0000-4000-8000-000000000021', '95000000-0000-4000-8000-000000000003', 'viewer') $$,
  'account administrator can assign an existing person to a project'
);

RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.client_team_members WHERE client_id = '95000000-0000-4000-8000-000000000011'), 1, 'client assignment is persisted');
SELECT is((SELECT count(*)::integer FROM public.project_team_members WHERE project_id = '95000000-0000-4000-8000-000000000021'), 1, 'project assignment is persisted');

SELECT set_config('request.jwt.claims', '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::integer FROM public.get_project_mention_candidates('95000000-0000-4000-8000-000000000021', 'Project', 30)
   WHERE user_id = '95000000-0000-4000-8000-000000000003'),
  1,
  'client team member can find an authorized project teammate to tag'
);
SELECT lives_ok(
  $$ SELECT public.create_project_discussion_with_mentions(
       '95000000-0000-4000-8000-000000000021', 'Coordination', 'Please review this item.', '{}',
       ARRAY['95000000-0000-4000-8000-000000000003'::uuid]
     ) $$,
  'authorized client member can create a discussion and tag a project teammate atomically'
);
SELECT throws_ok(
  $$ SELECT public.delete_project_as_super_admin('95000000-0000-4000-8000-000000000021', false) $$,
  '42501',
  'Only the platform super administrator can delete projects',
  'client managers cannot delete projects'
);

RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.project_discussion_mentions WHERE project_id = '95000000-0000-4000-8000-000000000021'), 1, 'tag is stored with the project discussion');
SELECT is((SELECT count(*)::integer FROM public.notifications WHERE user_id = '95000000-0000-4000-8000-000000000003' AND type = 'mention'), 1, 'tag creates one notification in the same transaction');

SELECT set_config('request.jwt.claims', '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"super_admin"}}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$ SELECT public.delete_project_as_super_admin('95000000-0000-4000-8000-000000000021', false) $$,
  'platform super administrator can remove the project'
);
SELECT is((SELECT count(*)::integer FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000021'), 0, 'removed project is hidden even after a fresh query');

RESET ROLE;
SELECT ok((SELECT deleted_at IS NOT NULL FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000021'), 'project tombstone persists');
SELECT is((SELECT count(*)::integer FROM public.project_deletion_audit WHERE project_id = '95000000-0000-4000-8000-000000000021'), 1, 'project removal is audited exactly once');

SELECT * FROM finish();
ROLLBACK;
