BEGIN;
SELECT plan(13);

SELECT has_column('public', 'projects', 'workspace_id', 'projects have a durable workspace identity');
SELECT col_not_null('public', 'projects', 'workspace_id', 'every project must belong to a workspace');
SELECT has_function(
  'public',
  'agent_post_project_update',
  ARRAY['uuid','uuid','uuid','uuid','uuid','text','text','text','text','text','text','jsonb','jsonb','jsonb','jsonb','jsonb','text','text'],
  'transactional Hermes project update RPC exists'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '95000000-0000-4000-8000-000000000001',
    'hermes-owner-one@example.com',
    '{"full_name":"Hermes Owner One","company_name":"Hermes Workspace One"}'::jsonb
  ),
  (
    '95000000-0000-4000-8000-000000000002',
    'hermes-owner-two@example.com',
    '{"full_name":"Hermes Owner Two","company_name":"Hermes Workspace Two"}'::jsonb
  );

INSERT INTO public.clients (id, name, client_type, workspace_id, created_by)
VALUES (
  '95000000-0000-4000-8000-000000000011',
  'Hermes Client',
  'business_client',
  (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
  '95000000-0000-4000-8000-000000000001'
);

INSERT INTO public.projects (id, client_id, name, project_type, created_by, program_meta)
VALUES (
  '95000000-0000-4000-8000-000000000021',
  '95000000-0000-4000-8000-000000000011',
  'Hermes Automatically Connected Project',
  'consulting',
  '95000000-0000-4000-8000-000000000001',
  '{"program_key":"HERMES-TEST","project_key":"CORE"}'::jsonb
);

SELECT is(
  (SELECT workspace_id FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000021'),
  (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
  'a newly created client project joins the live registry automatically'
);

INSERT INTO public.projects (id, name, project_type, program_meta)
VALUES (
  '95000000-0000-4000-8000-000000000022',
  'Future Program Project',
  'consulting',
  '{"program_key":"HERMES-TEST","project_key":"FUTURE"}'::jsonb
);

SELECT is(
  (SELECT workspace_id FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000022'),
  (SELECT workspace_id FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000021'),
  'a future program project inherits the existing program workspace automatically'
);

SELECT lives_ok(
  $$ SELECT public.agent_post_project_update(
       p_tenant_id => (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
       p_project_id => '95000000-0000-4000-8000-000000000021',
       p_actor_user_id => '95000000-0000-4000-8000-000000000001',
       p_project_update_id => '95000000-0000-4000-8000-000000000031',
       p_client_update_id => '95000000-0000-4000-8000-000000000032',
       p_destination => 'both',
       p_title => 'Verified milestone',
       p_summary => 'The site walk was completed and documented.',
       p_update_type => 'milestone',
       p_accomplishments => '["Site walk complete"]'::jsonb,
       p_client_update_status => 'published',
       p_project_status => 'active'
     ) $$,
  'Hermes can update the project and client portal in one transaction'
);

SELECT is(
  (SELECT count(*)::integer FROM public.project_communications WHERE id = '95000000-0000-4000-8000-000000000031'),
  1,
  'the internal project Activity Feed receives the update'
);

SELECT is(
  (SELECT count(*)::integer FROM public.client_updates
   WHERE id = '95000000-0000-4000-8000-000000000032'
     AND status = 'published'
     AND published_at IS NOT NULL),
  1,
  'the published briefing is available to the client portal'
);

SELECT is(
  (SELECT status::text FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000021'),
  'active',
  'the optional project lifecycle status is applied'
);

SELECT lives_ok(
  $$ SELECT public.agent_post_project_update(
       p_tenant_id => (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000001'),
       p_project_id => '95000000-0000-4000-8000-000000000021',
       p_actor_user_id => '95000000-0000-4000-8000-000000000001',
       p_project_update_id => '95000000-0000-4000-8000-000000000031',
       p_client_update_id => '95000000-0000-4000-8000-000000000032',
       p_destination => 'both',
       p_title => 'Verified milestone',
       p_summary => 'The site walk was completed and documented.',
       p_client_update_status => 'published'
     ) $$,
  'replaying the same idempotent write succeeds safely'
);

SELECT is(
  (
    (SELECT count(*) FROM public.project_communications WHERE id = '95000000-0000-4000-8000-000000000031')
    +
    (SELECT count(*) FROM public.client_updates WHERE id = '95000000-0000-4000-8000-000000000032')
  )::integer,
  2,
  'an idempotent replay does not duplicate either destination'
);

SELECT throws_ok(
  $$ SELECT public.agent_post_project_update(
       p_tenant_id => (SELECT workspace_id FROM public.profiles WHERE user_id = '95000000-0000-4000-8000-000000000002'),
       p_project_id => '95000000-0000-4000-8000-000000000021',
       p_actor_user_id => '95000000-0000-4000-8000-000000000002',
       p_project_update_id => '95000000-0000-4000-8000-000000000041',
       p_client_update_id => NULL,
       p_destination => 'project',
       p_title => 'Forbidden update',
       p_summary => 'This must not cross tenant boundaries.'
     ) $$,
  '42501',
  'Project is outside the agent workspace',
  'a Telegram agent cannot update a project in another workspace'
);

SELECT throws_ok(
  $$ INSERT INTO public.projects (client_id, name, project_type, created_by)
     VALUES (
       '95000000-0000-4000-8000-000000000011',
       'Cross-workspace project',
       'consulting',
       '95000000-0000-4000-8000-000000000002'
     ) $$,
  '23514',
  'Project creator and client must belong to the same workspace',
  'future projects cannot be registered in a mismatched workspace'
);

SELECT * FROM finish();
ROLLBACK;
