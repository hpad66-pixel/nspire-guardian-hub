BEGIN;
SELECT plan(19);

SELECT has_table('public', 'crm_integration_intakes', 'Proj OS CRM intake state is persisted');
SELECT has_table('public', 'crm_integration_approvals', 'one-time CRM approvals are persisted');
SELECT has_table('public', 'crm_integration_events', 'APAS CRM events are replay-protected');
SELECT has_table('public', 'crm_integration_audit_log', 'integration audit is append-only');
SELECT has_function(
  'public', 'consume_crm_integration_approval',
  ARRAY['uuid','text','uuid','text'],
  'exact approval consumption function exists'
);
SELECT has_function(
  'public', 'apply_crm_integration_event',
  ARRAY['text','text','text','text','uuid','text','jsonb','timestamp with time zone'],
  'signed event application function exists'
);

INSERT INTO public.workspaces (id, name)
VALUES ('97000000-0000-4000-8000-000000000001', 'CRM Integration Test');

INSERT INTO public.workspace_modules (
  workspace_id, apas_crm_integration_enabled, platform_apas_crm_integration
) VALUES (
  '97000000-0000-4000-8000-000000000001', true, true
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '97000000-0000-4000-8000-000000000002',
  'maya.submitter@example.test',
  '{"full_name":"Maya Submitter"}'::jsonb
);

UPDATE public.profiles
SET workspace_id = '97000000-0000-4000-8000-000000000001',
    full_name = 'Maya Submitter',
    email = 'maya.submitter@example.test',
    status = 'active'
WHERE user_id = '97000000-0000-4000-8000-000000000002';

INSERT INTO public.projects (id, workspace_id, name, project_type)
VALUES (
  '97000000-0000-4000-8000-000000000003',
  '97000000-0000-4000-8000-000000000001',
  'Fictional Card Intake Project', 'consulting'
);

INSERT INTO public.crm_integration_intakes (
  id, tenant_id, project_id, submitter_user_id, status, correlation_id,
  idempotency_key, source_envelope, source_signature, external_intake_id
) VALUES (
  '97000000-0000-4000-8000-000000000004',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  '97000000-0000-4000-8000-000000000002',
  'waiting_proj_os_approval',
  '97000000-0000-4000-8000-000000000005',
  'fictional-idempotency-key-0001',
  '{"sourceSystem":"proj_os"}'::jsonb,
  'fictional-signature',
  'apas-intake-fictional-1'
);

INSERT INTO public.crm_integration_approvals (
  id, tenant_id, project_id, intake_id, actor_user_id, token_hash,
  proposal_hash, approved_payload, expires_at
) VALUES (
  '97000000-0000-4000-8000-000000000006',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  '97000000-0000-4000-8000-000000000004',
  '97000000-0000-4000-8000-000000000002',
  'fictional-token-hash',
  'fictional-proposal-hash',
  '{"contact":{"displayName":"Maya Patel"},"duplicateDecision":"create","requestedCategoryIds":[],"catalogVersion":"fictional-v1","projectRole":"Engineer","promotedSourceContext":{}}'::jsonb,
  now() + interval '10 minutes'
);

SELECT is(
  (SELECT count(*)::integer FROM public.consume_crm_integration_approval(
    '97000000-0000-4000-8000-000000000006', 'fictional-token-hash',
    '97000000-0000-4000-8000-000000000002', 'changed-proposal-hash'
  )),
  0,
  'a changed proposal cannot use the approval'
);

SELECT is(
  (SELECT count(*)::integer FROM public.consume_crm_integration_approval(
    '97000000-0000-4000-8000-000000000006', 'fictional-token-hash',
    '97000000-0000-4000-8000-000000000002', 'fictional-proposal-hash'
  )),
  1,
  'valid exact approval is consumed once'
);

SELECT is(
  (SELECT status FROM public.crm_integration_intakes WHERE id = '97000000-0000-4000-8000-000000000004'),
  'approved_for_submission',
  'approval advances only the matching intake'
);

SELECT is(
  (SELECT count(*)::integer FROM public.consume_crm_integration_approval(
    '97000000-0000-4000-8000-000000000006', 'fictional-token-hash',
    '97000000-0000-4000-8000-000000000002', 'fictional-proposal-hash'
  )),
  0,
  'approval replay has no side effect'
);

SELECT is(
  public.apply_crm_integration_event(
    'evt-fictional-resolved-1', 'crm-integration.v1', 'contact_intake.resolved',
    'apas-intake-fictional-1', '97000000-0000-4000-8000-000000000005',
    'digest-1',
    '{"canonicalContactId":"apas-contact-fictional-1","remoteStatus":"resolved","displayName":"Maya Patel","primaryEmail":"maya@example.test","contactUrl":"https://apascrm.com/contacts/apas-contact-fictional-1"}'::jsonb,
    now()
  ),
  'applied',
  'resolved APAS event is applied'
);

SELECT is(
  (SELECT count(*)::integer FROM public.project_directory_entries
   WHERE project_id = '97000000-0000-4000-8000-000000000003'
     AND apas_contact_id = 'apas-contact-fictional-1'),
  1,
  'one canonical APAS CRM directory link is created'
);

SELECT is(
  public.apply_crm_integration_event(
    'evt-fictional-resolved-1', 'crm-integration.v1', 'contact_intake.resolved',
    'apas-intake-fictional-1', '97000000-0000-4000-8000-000000000005',
    'digest-1', '{"canonicalContactId":"apas-contact-fictional-1"}'::jsonb, now()
  ),
  'replayed',
  'event replay is detected'
);

SELECT is(
  (SELECT count(*)::integer FROM public.project_directory_entries
   WHERE project_id = '97000000-0000-4000-8000-000000000003'
     AND apas_contact_id = 'apas-contact-fictional-1'),
  1,
  'replayed event does not duplicate the project link'
);

INSERT INTO public.project_directory_entries (
  id, tenant_id, project_id, apas_contact_id, external_display_name
) VALUES (
  '97000000-0000-4000-8000-000000000007',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  'apas-contact-fictional-2', 'Maya Patel Survivor'
);

SELECT is(
  public.apply_crm_integration_event(
    'evt-fictional-merge-1', 'crm-integration.v1', 'contact.merged',
    'apas-intake-fictional-1', '97000000-0000-4000-8000-000000000005',
    'digest-merge',
    '{"retiredContactId":"apas-contact-fictional-1","survivingContactId":"apas-contact-fictional-2","remoteStatus":"merged"}'::jsonb,
    now()
  ),
  'applied',
  'merge event is applied'
);

SELECT is(
  (SELECT count(*)::integer FROM public.project_directory_entries
   WHERE project_id = '97000000-0000-4000-8000-000000000003'),
  1,
  'merge event deduplicates the project directory'
);

SELECT is(
  (SELECT canonical_apas_contact_id FROM public.crm_integration_intakes
   WHERE id = '97000000-0000-4000-8000-000000000004'),
  'apas-contact-fictional-2',
  'merge event repairs the canonical intake reference'
);

SELECT is(
  public.apply_crm_integration_event(
    'evt-fictional-invalid-target', 'crm-integration.v1', 'contact.updated',
    'another-tenant-intake', '97000000-0000-4000-8000-000000000099',
    'digest-invalid', '{"remoteStatus":"updated"}'::jsonb, now()
  ),
  'invalid_target',
  'cross-tenant or mismatched correlation identifiers do not link a project'
);

SELECT throws_ok(
  $$ UPDATE public.crm_integration_audit_log SET action = 'tampered' $$,
  '42501', NULL,
  'integration audit history cannot be changed'
);

SELECT * FROM finish();
ROLLBACK;
