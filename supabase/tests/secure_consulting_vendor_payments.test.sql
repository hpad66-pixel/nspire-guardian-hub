BEGIN;
SELECT plan(24);

SELECT has_table('public', 'consulting_vendor_assignments', 'consulting vendor assignments are persisted');
SELECT has_table('public', 'consulting_invoice_requests', 'one-time consulting invoice requests are persisted');
SELECT has_table('public', 'consulting_ap_audit_log', 'consulting AP audit trail is persisted');
SELECT has_function('public', 'create_consulting_invoice_request', ARRAY['uuid','uuid','text','text','date','text'], 'controlled invoice-request function exists');
SELECT has_function('public', 'approve_consulting_cost', ARRAY['uuid'], 'controlled invoice approval function exists');
SELECT has_function('public', 'record_consulting_cost_payment', ARRAY['uuid','numeric','date','text','text','uuid','uuid','text'], 'controlled payment-recording function exists');
SELECT has_function('public', 'reconcile_consulting_cost_payment', ARRAY['uuid','text'], 'controlled reconciliation function exists');

INSERT INTO public.workspaces (id, name)
VALUES ('99000000-0000-4000-8000-000000000001', 'Secure Consulting AP Test');

INSERT INTO public.projects (id, workspace_id, name, project_type, status)
VALUES
  ('99000000-0000-4000-8000-000000000002', '99000000-0000-4000-8000-000000000001', 'Consulting AP Project', 'consulting', 'active'),
  ('99000000-0000-4000-8000-000000000003', '99000000-0000-4000-8000-000000000001', 'Other Consulting Project', 'consulting', 'active');

INSERT INTO public.organizations (id, tenant_id, name, legal_name, kind)
VALUES (
  '99000000-0000-4000-8000-000000000004',
  '99000000-0000-4000-8000-000000000001',
  'Secure Consultant LLC', 'Secure Consultant LLC', 'consultant'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '99000000-0000-4000-8000-000000000009',
  'secure-ap-admin@example.com',
  '{"full_name":"Secure AP Administrator"}'::jsonb
);

INSERT INTO public.project_artifacts (
  id, tenant_id, project_id, artifact_type, source_system, title,
  period_date, reference_no, amount, file_path, file_name, file_size, mime_type, tags
) VALUES
  (
    '99000000-0000-4000-8000-000000000010',
    '99000000-0000-4000-8000-000000000001',
    '99000000-0000-4000-8000-000000000002',
    'invoice', 'manual', 'Secure consulting invoice', current_date,
    'SEC-1001', 10000, 'secure-ap/invoice.pdf', 'invoice.pdf', 256,
    'application/pdf', ARRAY['consulting','vendor-invoice','admin-on-behalf']
  ),
  (
    '99000000-0000-4000-8000-000000000011',
    '99000000-0000-4000-8000-000000000001',
    '99000000-0000-4000-8000-000000000003',
    'invoice', 'manual', 'Cross-project invoice', current_date,
    'SEC-CROSS', 5000, 'secure-ap/cross.pdf', 'cross.pdf', 256,
    'application/pdf', ARRAY['consulting','vendor-invoice']
  ),
  (
    '99000000-0000-4000-8000-000000000012',
    '99000000-0000-4000-8000-000000000001',
    '99000000-0000-4000-8000-000000000002',
    'other', 'manual', 'Wells Fargo payment confirmation', current_date,
    'WIRE-SEC-001', 10000, 'secure-ap/payment.pdf', 'payment.pdf', 256,
    'application/pdf', ARRAY['consulting','payment-evidence','wire']
  );

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"99000000-0000-4000-8000-000000000009","app_metadata":{"role":"super_admin"}}',
  true
);

SELECT throws_ok(
  $$ INSERT INTO public.consulting_costs (
       tenant_id, project_id, vendor_name, cost_type, reference_no, amount, status,
       source_kind, source_status, source_note, is_legacy_exception
     ) VALUES (
       '99000000-0000-4000-8000-000000000001',
       '99000000-0000-4000-8000-000000000002',
       'Forgery LLC', 'consultant', 'LEGACY-FAKE', 1, 'draft',
       'historical_exception', 'verified', 'Attempted user-created historical exception', true
     ) $$,
  'P0001', 'Historical exceptions are migration-only and cannot be created by users',
  'users cannot manufacture historical payment-control exceptions'
);

INSERT INTO public.consulting_costs (
  id, tenant_id, project_id, vendor_org_id, vendor_name, cost_type, reference_no,
  amount, status, source_kind, source_status, source_note
) VALUES (
  '99000000-0000-4000-8000-000000000020',
  '99000000-0000-4000-8000-000000000001',
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000004',
  'Secure Consultant LLC', 'consultant', 'NO-SOURCE',
  1000, 'draft', 'admin_on_behalf', 'draft', 'Missing source test'
);

SELECT throws_ok(
  $$ UPDATE public.consulting_costs SET status = 'approved'
     WHERE id = '99000000-0000-4000-8000-000000000020' $$,
  'P0001', 'Use the guarded invoice approval action',
  'direct status updates cannot bypass guarded approval'
);

SELECT throws_ok(
  $$ SELECT public.approve_consulting_cost('99000000-0000-4000-8000-000000000020') $$,
  'P0001', 'INVOICE_SOURCE_REQUIRED: attach the vendor invoice or generated on-behalf invoice before approval',
  'approval requires an invoice source artifact'
);

INSERT INTO public.consulting_costs (
  id, tenant_id, project_id, vendor_org_id, vendor_name, cost_type, reference_no,
  amount, status, invoice_artifact_id, source_kind, source_status, source_note
) VALUES (
  '99000000-0000-4000-8000-000000000021',
  '99000000-0000-4000-8000-000000000001',
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000004',
  'Secure Consultant LLC', 'consultant', 'SEC-CROSS',
  5000, 'draft', '99000000-0000-4000-8000-000000000011',
  'admin_on_behalf', 'received', 'Cross-project source test'
);

SELECT throws_ok(
  $$ SELECT public.approve_consulting_cost('99000000-0000-4000-8000-000000000021') $$,
  'P0001', 'Invoice artifact crosses the project or tenant boundary',
  'cross-project invoice evidence cannot be approved'
);

INSERT INTO public.consulting_costs (
  id, tenant_id, project_id, vendor_org_id, vendor_name, cost_type, reference_no,
  bill_date, amount, status, invoice_artifact_id, source_kind, source_status, source_note
) VALUES (
  '99000000-0000-4000-8000-000000000022',
  '99000000-0000-4000-8000-000000000001',
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000004',
  'Secure Consultant LLC', 'consultant', 'SEC-1001', current_date,
  10000, 'draft', '99000000-0000-4000-8000-000000000010',
  'admin_on_behalf', 'received', 'Controlled on-behalf source'
);

SELECT lives_ok(
  $$ SELECT public.approve_consulting_cost('99000000-0000-4000-8000-000000000022') $$,
  'a sourced invoice can pass administrator approval'
);
SELECT is(
  (SELECT status::text FROM public.consulting_costs WHERE id = '99000000-0000-4000-8000-000000000022'),
  'approved', 'guarded approval stamps the invoice approved'
);

SELECT throws_ok(
  $$ SELECT public.record_consulting_cost_payment(
       '99000000-0000-4000-8000-000000000022', 10000, current_date, 'wire',
       'WIRE-SEC-001', NULL::uuid, '99000000-0000-4000-8000-000000000030', NULL
     ) $$,
  'P0001', 'PAYMENT_EVIDENCE_REQUIRED: upload bank confirmation before recording payment',
  'payment cannot be recorded without bank evidence'
);

SELECT throws_ok(
  $$ SELECT public.record_consulting_cost_payment(
       '99000000-0000-4000-8000-000000000022', 10000, current_date, 'wire',
       'DIFFERENT-REFERENCE', '99000000-0000-4000-8000-000000000012',
       '99000000-0000-4000-8000-000000000031', NULL
     ) $$,
  'P0001', 'Payment evidence metadata must match the amount, date, and bank reference',
  'payment evidence must match the transaction metadata'
);

SELECT lives_ok(
  $$ SELECT public.record_consulting_cost_payment(
       '99000000-0000-4000-8000-000000000022', 10000, current_date, 'wire',
       'WIRE-SEC-001', '99000000-0000-4000-8000-000000000012',
       '99000000-0000-4000-8000-000000000032', 'Bank confirmation attached'
     ) $$,
  'approved invoice can be recorded after the external bank payment'
);

SELECT lives_ok(
  $$ SELECT public.record_consulting_cost_payment(
       '99000000-0000-4000-8000-000000000022', 10000, current_date, 'wire',
       'WIRE-SEC-001', '99000000-0000-4000-8000-000000000012',
       '99000000-0000-4000-8000-000000000032', 'Bank confirmation attached'
     ) $$,
  'an identical retry is idempotent even after the invoice becomes paid'
);

SELECT is(
  (SELECT count(*)::integer FROM public.consulting_cost_payments
   WHERE cost_id = '99000000-0000-4000-8000-000000000022'),
  1, 'idempotent retry does not duplicate the payment'
);
SELECT is(
  (SELECT status::text FROM public.consulting_costs WHERE id = '99000000-0000-4000-8000-000000000022'),
  'paid', 'payment evidence automatically settles the invoice status'
);

SELECT throws_ok(
  $$ SELECT public.record_consulting_cost_payment(
       '99000000-0000-4000-8000-000000000022', 1, current_date, 'wire',
       'WIRE-SEC-001', '99000000-0000-4000-8000-000000000012',
       '99000000-0000-4000-8000-000000000032', NULL
     ) $$,
  'P0001', 'IDEMPOTENCY_CONFLICT: this request key was already used for different payment data',
  'an idempotency key cannot be reused with altered payment data'
);

SELECT lives_ok(
  $$ SELECT public.reconcile_consulting_cost_payment(
       (SELECT id FROM public.consulting_cost_payments
        WHERE idempotency_key = '99000000-0000-4000-8000-000000000032'),
       'Matched against bank activity'
     ) $$,
  'recorded payment can be reconciled'
);
SELECT is(
  (SELECT payment_status FROM public.consulting_cost_payments
   WHERE idempotency_key = '99000000-0000-4000-8000-000000000032'),
  'reconciled', 'reconciliation is stamped on the payment'
);
SELECT cmp_ok(
  (SELECT count(*) FROM public.consulting_ap_audit_log
   WHERE project_id = '99000000-0000-4000-8000-000000000002'),
  '>=', 3::bigint, 'approval, payment, and reconciliation are audited'
);

SELECT throws_ok(
  $$ UPDATE public.consulting_cost_payments SET amount = 10001
     WHERE idempotency_key = '99000000-0000-4000-8000-000000000032' $$,
  'P0001', 'Payment exceeds the remaining approved cost balance',
  'payment evidence cannot be rewritten above the approved balance'
);

SELECT * FROM finish();
ROLLBACK;
