BEGIN;
SELECT plan(38);

SELECT has_table('public', 'crm_card_scan_entitlements', 'card scan has explicit rollout entitlements');
SELECT has_table('public', 'crm_card_intakes', 'card intake is durable and scoped');
SELECT has_table('public', 'crm_contact_actions', 'CRM actions have explicit approvals');
SELECT has_table('public', 'crm_card_audit_events', 'card actions have an audit trail');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.crm_card_scan_entitlements'::regclass), 'entitlements use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.crm_card_intakes'::regclass), 'intakes use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.crm_contact_actions'::regclass), 'actions use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.crm_card_audit_events'::regclass), 'audit uses RLS');

SELECT ok(EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'crm-card-intake'), 'private source-image bucket exists');
SELECT is((SELECT public FROM storage.buckets WHERE id = 'crm-card-intake'), false, 'source-image bucket is private');
SELECT is((SELECT file_size_limit FROM storage.buckets WHERE id = 'crm-card-intake'), 10485760::bigint, 'card images are size limited');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND (qual LIKE '%crm-card-intake%' OR with_check LIKE '%crm-card-intake%')), 'browser roles have no broad direct card-object access');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_card_intakes' AND cmd IN ('INSERT','UPDATE','DELETE') AND 'authenticated' = ANY(roles)), 'browser users cannot forge or mutate intakes');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_contact_actions' AND cmd IN ('INSERT','UPDATE','DELETE') AND 'authenticated' = ANY(roles)), 'browser users cannot forge approvals');

SELECT has_function('public', 'has_crm_card_scan_entitlement', ARRAY['uuid'], 'UI has a narrow current-user entitlement check');
SELECT has_function('public', 'set_crm_card_scan_entitlement', ARRAY['uuid','uuid','text','boolean'], 'admin rollout has one bounded operation');
SELECT has_function('public', 'execute_crm_card_action', ARRAY['uuid','uuid','text'], 'CRM mutation is one atomic server operation');
SELECT ok(has_function_privilege('authenticated', 'public.has_crm_card_scan_entitlement(uuid)', 'EXECUTE'), 'authenticated users can check their own entitlement');
SELECT ok(NOT has_function_privilege('anon', 'public.has_crm_card_scan_entitlement(uuid)', 'EXECUTE'), 'anonymous users cannot inspect rollout state');
SELECT ok(has_function_privilege('service_role', 'public.execute_crm_card_action(uuid,uuid,text)', 'EXECUTE') AND NOT has_function_privilege('authenticated', 'public.execute_crm_card_action(uuid,uuid,text)', 'EXECUTE'), 'only the service boundary executes approved CRM actions');

SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.crm_contact_actions'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%' || quote_literal('00:10:00') || '::interval%'), 'approval lifetime is database bounded');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.crm_card_intakes'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%idempotency_key_hash%'), 'intakes are idempotent within user and project scope');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.crm_contact_actions'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%idempotency_key_hash%'), 'actions are idempotent within user and project scope');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.crm_card_audit_events'::regclass AND tgname = 'crm_card_audit_append_only' AND NOT tgisinternal), 'audit events are append-only');

SELECT ok(EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'crm_contacts' AND indexname = 'crm_contacts_normalized_email_idx'), 'normalized email duplicate lookup is indexed');
SELECT ok(EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'crm_contacts' AND indexname = 'crm_contacts_normalized_phone_idx'), 'normalized phone duplicate lookup is indexed');
SELECT ok(NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('crm_card_intakes','crm_contact_actions','crm_card_audit_events') AND column_name IN ('approval_token','raw_image','image_bytes')), 'database stores neither approval bearer tokens nor image bytes');
SELECT ok(pg_get_functiondef('public.execute_crm_card_action(uuid,uuid,text)'::regprocedure) LIKE '%can_access_project%' AND pg_get_functiondef('public.execute_crm_card_action(uuid,uuid,text)'::regprocedure) LIKE '%FOR UPDATE%', 'action execution rechecks project access and locks approval state');
SELECT ok(pg_get_functiondef('public.execute_crm_card_action(uuid,uuid,text)'::regprocedure) LIKE '%INSERT INTO public.crm_contacts%' AND pg_get_functiondef('public.execute_crm_card_action(uuid,uuid,text)'::regprocedure) LIKE '%project_directory_entries%', 'approved action writes the master CRM and project directory only');
SELECT ok(pg_get_functiondef('public.set_crm_card_scan_entitlement(uuid,uuid,text,boolean)'::regprocedure) LIKE '%is_workspace_admin%' AND pg_get_functiondef('public.set_crm_card_scan_entitlement(uuid,uuid,text,boolean)'::regprocedure) LIKE '%can_access_project%', 'pilot enrollment rechecks administrator and project access');
SELECT ok(pg_get_functiondef('public.set_crm_card_scan_entitlement(uuid,uuid,text,boolean)'::regprocedure) LIKE '%v_count >= 1%' AND pg_get_functiondef('public.set_crm_card_scan_entitlement(uuid,uuid,text,boolean)'::regprocedure) LIKE '%v_count >= 4%', 'database enforces one admin and four team pilot assignments');

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
VALUES ('93000000-0000-4000-8000-000000000001', 'crm-card-admin@example.test', 'authenticated', 'authenticated', now(), now());
INSERT INTO public.workspaces (id, name, slug, owner_user_id, plan, status)
VALUES ('93000000-0000-4000-8000-000000000002', 'Card intake test workspace', 'card-intake-test', '93000000-0000-4000-8000-000000000001', 'enterprise', 'active');
UPDATE public.profiles SET full_name = 'Card Admin', email = 'crm-card-admin@example.test', workspace_id = '93000000-0000-4000-8000-000000000002', status = 'active'
WHERE user_id = '93000000-0000-4000-8000-000000000001';
INSERT INTO public.user_roles (user_id, role) VALUES ('93000000-0000-4000-8000-000000000001', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.properties (id, name, address, city, state, workspace_id, created_by)
VALUES ('93000000-0000-4000-8000-000000000003', 'Card test property', '1 Test Way', 'Miami', 'FL', '93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001');
INSERT INTO public.projects (id, property_id, name, created_by)
VALUES ('93000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000003', 'Card test project', '93000000-0000-4000-8000-000000000001');
INSERT INTO public.crm_card_intakes (
  id, tenant_id, user_id, project_id, correlation_id, idempotency_key_hash, status,
  front_object_path, media_type, front_sha256, source_context
) VALUES (
  '93000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000002',
  '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000004',
  '93000000-0000-4000-8000-000000000006', repeat('a',64), 'processed',
  '93000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000005/front.png',
  'image/png', repeat('b',64), '{"tags":["synthetic"],"projectRole":"Vendor"}'::jsonb
);
INSERT INTO public.crm_contact_actions (
  id, intake_id, tenant_id, user_id, project_id, correlation_id, idempotency_key_hash,
  action_kind, reviewed_fields, source_context, normalized_action_sha256,
  approval_token_sha256, approval_expires_at
) VALUES (
  '93000000-0000-4000-8000-000000000007', '93000000-0000-4000-8000-000000000005',
  '93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000006',
  repeat('c',64), 'create', '{"firstName":"Morgan","lastName":"Rivera","email":"MORGAN@EXAMPLE.TEST","organization":"Harbor Build Partners"}'::jsonb,
  '{"tags":["synthetic"],"projectRole":"Vendor"}'::jsonb, repeat('d',64), repeat('e',64), now() + interval '5 minutes'
);

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.execute_crm_card_action('93000000-0000-4000-8000-000000000007','93000000-0000-4000-8000-000000000001',repeat('e',64))$$,
  'a matching service-side approval creates the master CRM contact atomically'
);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.crm_contacts WHERE workspace_id = '93000000-0000-4000-8000-000000000002' AND email = 'morgan@example.test'), 1::bigint, 'approved create normalizes and writes one APAS CRM contact');
SELECT is((SELECT count(*) FROM public.project_directory_entries WHERE project_id = '93000000-0000-4000-8000-000000000004'), 1::bigint, 'approved create links the contact to the project directory');
SELECT is((SELECT status FROM public.crm_contact_actions WHERE id = '93000000-0000-4000-8000-000000000007'), 'completed', 'approval is consumed as completed');
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.execute_crm_card_action('93000000-0000-4000-8000-000000000007','93000000-0000-4000-8000-000000000001',repeat('e',64))$$,
  'an identical retry safely replays the completed result'
);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.crm_contacts WHERE workspace_id = '93000000-0000-4000-8000-000000000002' AND email = 'morgan@example.test'), 1::bigint, 'approval replay does not duplicate the contact');
SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$SELECT public.execute_crm_card_action('93000000-0000-4000-8000-000000000007','93000000-0000-4000-8000-000000000001',repeat('f',64))$$,
  '42501', 'Approval token mismatch', 'an altered token cannot replay a completed approval'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
