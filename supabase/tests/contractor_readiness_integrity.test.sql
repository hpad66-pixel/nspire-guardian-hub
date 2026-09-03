BEGIN;
SELECT plan(18);

SELECT has_table('public', 'contractor_qualification_cases', 'qualification cases are persisted');
SELECT has_table('public', 'contractor_documents', 'contractor evidence is persisted');
SELECT has_function('public', 'contractor_can_proceed', ARRAY['uuid','uuid','text'], 'deterministic gate function exists');
SELECT has_function('public', 'recompute_contractor_readiness', ARRAY['uuid'], 'readiness recomputation exists');

INSERT INTO public.workspaces (id, name)
VALUES ('96000000-0000-4000-8000-000000000001', 'Contractor Readiness Test');

INSERT INTO public.workspace_modules (
  workspace_id, contractor_readiness_enabled, platform_contractor_readiness
) VALUES (
  '96000000-0000-4000-8000-000000000001', true, true
);

INSERT INTO public.organizations (id, tenant_id, name, legal_name, kind)
VALUES (
  '96000000-0000-4000-8000-000000000002',
  '96000000-0000-4000-8000-000000000001',
  'Ready Trade LLC', 'Ready Trade LLC', 'sub'
), (
  '96000000-0000-4000-8000-000000000003',
  '96000000-0000-4000-8000-000000000001',
  'Unscreened Trade LLC', 'Unscreened Trade LLC', 'sub'
);

INSERT INTO public.projects (id, workspace_id, name, project_type)
VALUES (
  '96000000-0000-4000-8000-000000000004',
  '96000000-0000-4000-8000-000000000001',
  'Readiness Gate Project', 'construction'
);

INSERT INTO public.contractor_readiness_policies (
  id, tenant_id, scope_type, enforce_work_gate, enforce_contract_gate, enforce_payment_gate
) VALUES (
  '96000000-0000-4000-8000-000000000005',
  '96000000-0000-4000-8000-000000000001',
  'workspace', true, true, true
);

INSERT INTO public.contractor_qualification_cases (
  id, tenant_id, organization_id, project_id, scope_type
) VALUES (
  '96000000-0000-4000-8000-000000000006',
  '96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000002',
  '96000000-0000-4000-8000-000000000004',
  'project'
);

INSERT INTO public.contractor_case_requirements (
  id, tenant_id, case_id, requirement_code, title, category, gate_type,
  required, legally_required, verification_required, expiration_required, sort_order
) VALUES
  ('96000000-0000-4000-8000-000000000010','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000006','license','Trade license','license','work',true,true,true,true,10),
  ('96000000-0000-4000-8000-000000000011','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000006','safety','Safety program','safety','contract',true,false,true,false,20),
  ('96000000-0000-4000-8000-000000000012','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000006','w9','Form W-9','tax','payment',true,false,true,false,30);

SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','work'),
  false,
  'missing work evidence fails the work gate'
);
SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','contract'),
  false,
  'missing contract evidence fails the contract gate'
);
SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','payment'),
  false,
  'missing tax evidence fails the payment gate'
);

SELECT throws_ok(
  $$ UPDATE public.contractor_case_requirements
     SET status = 'waived'
     WHERE id = '96000000-0000-4000-8000-000000000010' $$,
  '23514', NULL,
  'a legally required item cannot be waived'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('96000000-0000-4000-8000-000000000020', 'exception-approver@example.com', '{"full_name":"Exception Approver"}'::jsonb);

SELECT throws_ok(
  $$ INSERT INTO public.contractor_exceptions (
       tenant_id, case_id, requirement_id, reason, expires_at, approved_by
     ) VALUES (
       '96000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-000000000006',
       '96000000-0000-4000-8000-000000000010',
       'A legal control must never accept this exception',
       now() + interval '7 days',
       '96000000-0000-4000-8000-000000000020'
     ) $$,
  'P0001', NULL,
  'a legally required item cannot receive a temporary exception'
);

UPDATE public.contractor_case_requirements
SET status = 'verified'
WHERE id = '96000000-0000-4000-8000-000000000010';

SELECT is(
  (SELECT work_ready FROM public.contractor_qualification_cases WHERE id = '96000000-0000-4000-8000-000000000006'),
  true,
  'verified legal evidence clears the work gate'
);

INSERT INTO public.contractor_exceptions (
  tenant_id, case_id, requirement_id, reason, expires_at, approved_by
) VALUES (
  '96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000006',
  '96000000-0000-4000-8000-000000000011',
  'Interim safety controls documented for regression test',
  now() + interval '7 days',
  '96000000-0000-4000-8000-000000000020'
);

SELECT is(
  (SELECT status FROM public.contractor_qualification_cases WHERE id = '96000000-0000-4000-8000-000000000006'),
  'conditionally_qualified',
  'a valid nonlegal exception produces conditional qualification'
);
SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','contract'),
  true,
  'a valid exception can clear its configured gate'
);

UPDATE public.contractor_case_requirements
SET status = 'verified'
WHERE id = '96000000-0000-4000-8000-000000000012';

SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','payment'),
  true,
  'verified payment evidence clears the payment gate while the exception is active'
);
SELECT is(
  (SELECT status FROM public.contractor_qualification_cases WHERE id = '96000000-0000-4000-8000-000000000006'),
  'conditionally_qualified',
  'an exception never appears as fully qualified'
);

UPDATE public.contractor_exceptions SET revoked_at = now()
WHERE case_id = '96000000-0000-4000-8000-000000000006';
UPDATE public.contractor_case_requirements SET status = 'verified'
WHERE id = '96000000-0000-4000-8000-000000000011';

SELECT is(
  (SELECT status FROM public.contractor_qualification_cases WHERE id = '96000000-0000-4000-8000-000000000006'),
  'qualified',
  'all verified required controls produce full qualification'
);

SELECT is(
  public.contractor_can_proceed('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000003','work'),
  false,
  'an enforced gate blocks a company with no matching qualification case'
);

INSERT INTO public.contractor_documents (
  id, tenant_id, organization_id, case_id, document_type, title,
  storage_path, file_name, expiration_date, verification_status
) VALUES (
  '96000000-0000-4000-8000-000000000030',
  '96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000002',
  '96000000-0000-4000-8000-000000000006',
  'license', 'Trade license',
  '96000000-0000-4000-8000-000000000001/96000000-0000-4000-8000-000000000002/96000000-0000-4000-8000-000000000006/license/test.pdf',
  'test.pdf', current_date - 1, 'verified'
);
UPDATE public.contractor_case_requirements
SET current_document_id = '96000000-0000-4000-8000-000000000030', status = 'verified'
WHERE id = '96000000-0000-4000-8000-000000000010';

SELECT is(
  (SELECT status FROM public.contractor_qualification_cases WHERE id = '96000000-0000-4000-8000-000000000006'),
  'blocked',
  'expired legally required evidence blocks the company'
);

SELECT throws_ok(
  $$ INSERT INTO public.contractor_project_assignments (
       tenant_id, project_id, organization_id, case_id, status
     ) VALUES (
       '96000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-000000000004',
       '96000000-0000-4000-8000-000000000002',
       '96000000-0000-4000-8000-000000000006',
       'active'
     ) $$,
  'P0001', NULL,
  'database gate prevents mobilization while work readiness is blocked'
);

SELECT * FROM finish();
ROLLBACK;
