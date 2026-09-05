BEGIN;
SELECT plan(21);

SELECT has_table('public', 'apas_crm_project_parties', 'project-party assignments are persisted');
SELECT has_table('public', 'apas_crm_project_party_mutations', 'project-party mutations are replay protected');
SELECT has_table('public', 'apas_crm_project_party_audit', 'project-party changes are audited');
SELECT has_function(
  'public', 'apply_apas_crm_project_party_mutation',
  ARRAY['uuid','uuid','uuid','text','text','text','uuid','text','uuid','jsonb'],
  'atomic APAS CRM project-party mutation function exists'
);

INSERT INTO public.workspaces (id, name)
VALUES ('98000000-0000-4000-8000-000000000001', 'Project Party Test');

INSERT INTO public.projects (id, workspace_id, name, project_type)
VALUES (
  '98000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000001',
  'Stormdrain Improvements', 'property'
);

CREATE TEMP TABLE first_link AS
SELECT public.apply_apas_crm_project_party_mutation(
  '98000000-0000-4000-8000-000000000001',
  '98000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000003',
  'crm-user-1', 'link-caraballo-0001', repeat('a', 64),
  '98000000-0000-4000-8000-000000000004', 'upsert', NULL,
  '{"partyType":"company","apasCompanyId":"98000000-0000-4000-8000-000000000005","relationshipRole":"vendor","displayName":"Caraballo Express Pump Outs Corp","website":"https://caraballoexpress.com/"}'::jsonb
) AS receipt;

SELECT is(
  (SELECT receipt -> 'party' ->> 'apas_company_id' FROM first_link),
  '98000000-0000-4000-8000-000000000005',
  'the canonical APAS CRM company is linked to the project'
);
SELECT is(
  (SELECT relationship_status FROM public.apas_crm_project_parties WHERE apas_company_id='98000000-0000-4000-8000-000000000005'),
  'active', 'a newly linked company is active'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_audit),
  1, 'the link creates one audit event'
);

SELECT is(
  (public.apply_apas_crm_project_party_mutation(
    '98000000-0000-4000-8000-000000000001',
    '98000000-0000-4000-8000-000000000002',
    '98000000-0000-4000-8000-000000000003',
    'crm-user-1', 'link-caraballo-0001', repeat('a', 64),
    '98000000-0000-4000-8000-000000000004', 'upsert', NULL,
    '{"partyType":"company","apasCompanyId":"98000000-0000-4000-8000-000000000005","relationshipRole":"vendor","displayName":"Caraballo Express Pump Outs Corp","website":"https://caraballoexpress.com/"}'::jsonb
  ) ->> 'idempotentReplay')::boolean,
  true, 'an identical mutation is safely replayed'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_audit),
  1, 'a replay creates no duplicate audit event'
);

CREATE TEMP TABLE updated_link AS
SELECT public.apply_apas_crm_project_party_mutation(
  '98000000-0000-4000-8000-000000000001',
  '98000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000003',
  'crm-user-1', 'update-caraballo-0001', repeat('b', 64),
  '98000000-0000-4000-8000-000000000006', 'upsert', NULL,
  '{"partyType":"company","apasCompanyId":"98000000-0000-4000-8000-000000000005","relationshipRole":"subcontractor","displayName":"Caraballo Express Pump Outs Corp"}'::jsonb
) AS receipt;

SELECT is(
  (SELECT receipt -> 'party' ->> 'id' FROM updated_link),
  (SELECT receipt -> 'party' ->> 'id' FROM first_link),
  'changing a role updates the existing project assignment'
);
SELECT is(
  (SELECT relationship_role FROM public.apas_crm_project_parties WHERE apas_company_id='98000000-0000-4000-8000-000000000005'),
  'subcontractor', 'the current project role is propagated'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_audit),
  2, 'the role update is independently audited'
);

CREATE TEMP TABLE archived_link AS
SELECT public.apply_apas_crm_project_party_mutation(
  '98000000-0000-4000-8000-000000000001',
  '98000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000003',
  'crm-user-1', 'archive-caraballo-0001', repeat('c', 64),
  '98000000-0000-4000-8000-000000000007', 'archive',
  (SELECT id FROM public.apas_crm_project_parties WHERE apas_company_id='98000000-0000-4000-8000-000000000005'),
  '{}'::jsonb
) AS receipt;

SELECT is(
  (SELECT relationship_status FROM public.apas_crm_project_parties WHERE apas_company_id='98000000-0000-4000-8000-000000000005'),
  'archived', 'removing a company archives rather than destroys the assignment'
);
SELECT ok(
  (SELECT archived_at IS NOT NULL FROM public.apas_crm_project_parties WHERE apas_company_id='98000000-0000-4000-8000-000000000005'),
  'the archived assignment records when it was removed'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_audit),
  3, 'the archive is audited'
);

SELECT throws_ok(
  $$ SELECT public.apply_apas_crm_project_party_mutation(
    '98000000-0000-4000-8000-000000000001',
    '98000000-0000-4000-8000-000000000002',
    '98000000-0000-4000-8000-000000000003',
    'crm-user-1', 'link-caraballo-0001', repeat('d', 64),
    '98000000-0000-4000-8000-000000000008', 'upsert', NULL,
    '{"partyType":"company","apasCompanyId":"98000000-0000-4000-8000-000000000005","relationshipRole":"client","displayName":"Changed request"}'::jsonb
  ) $$,
  '23505', NULL, 'an idempotency key cannot be reused for a different request'
);
SELECT throws_ok(
  $$ UPDATE public.apas_crm_project_party_mutations SET action='archive' $$,
  '42501', NULL, 'mutation evidence is append-only'
);
SELECT throws_ok(
  $$ DELETE FROM public.apas_crm_project_party_audit $$,
  '42501', NULL, 'audit evidence is append-only'
);

SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_parties),
  1, 'one company has one durable relationship per project'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_mutations),
  3, 'only distinct accepted mutations receive receipts'
);
SELECT is(
  (SELECT count(*)::integer FROM public.apas_crm_project_party_audit WHERE apas_organization_id='98000000-0000-4000-8000-000000000003'),
  3, 'every audit row is attributed to the APAS CRM organization'
);

SELECT * FROM finish();
ROLLBACK;
