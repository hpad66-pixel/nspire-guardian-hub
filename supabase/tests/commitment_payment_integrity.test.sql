-- ============================================================
-- Commitment invoice/payment integrity regression coverage.
-- Run via: supabase test db
-- ============================================================

BEGIN;
SELECT plan(23);

INSERT INTO public.workspaces (id, name)
VALUES ('90000000-0000-4000-8000-000000000001', 'Payment Integrity Test');

INSERT INTO public.cost_code_libraries (id, tenant_id, name, source, is_default)
VALUES (
  '90000000-0000-4000-8000-000000000010',
  '90000000-0000-4000-8000-000000000001',
  'Payment Integrity Cost Codes', 'custom', true
);

INSERT INTO public.cost_codes (id, library_id, code, description, level)
VALUES (
  '90000000-0000-4000-8000-000000000011',
  '90000000-0000-4000-8000-000000000010',
  'TEST-01', 'Payment integrity SOV', 1
);

INSERT INTO public.projects (id, name)
VALUES ('90000000-0000-4000-8000-000000000002', 'Payment Integrity Project');

INSERT INTO public.commitments (
  id, tenant_id, project_id, commitment_no, title, commitment_type,
  status, original_value, retainage_pct
) VALUES (
  '90000000-0000-4000-8000-000000000003',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'SC-TEST', 'Executed test subcontract', 'subcontract',
  'executed', 1000, 10
);

INSERT INTO public.commitment_sov_lines (
  id, tenant_id, commitment_id, line_no, cost_code_id,
  description, scheduled_value
) VALUES (
  '90000000-0000-4000-8000-000000000012',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  1,
  '90000000-0000-4000-8000-000000000011',
  'Executed subcontract billing', 1000
);

SELECT throws_ok(
  $$ INSERT INTO public.commitment_invoices (
       tenant_id, commitment_id, invoice_no, period_end, status,
       submitted_amount, approved_amount, retainage_held
     ) VALUES (
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000003',
       'BAD-APPROVED-INSERT', DATE '2026-01-31', 'approved', 100, 100, 0
     ) $$,
  'P0001', NULL,
  'normal invoice cannot be inserted directly as approved'
);

SELECT throws_ok(
  $$ INSERT INTO public.commitment_invoices (
       tenant_id, commitment_id, invoice_no, period_end, status,
       submitted_amount, retainage_held
     ) VALUES (
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000003',
       'BAD-RETAINAGE', DATE '2026-01-31', 'draft', 100, -1
     ) $$,
  '23514', NULL,
  'negative retainage is rejected'
);

INSERT INTO public.commitment_invoices (
  id, tenant_id, commitment_id, invoice_no, period_end, status,
  submitted_amount, retainage_held, source_kind, historical_exception_reason
) VALUES (
  '90000000-0000-4000-8000-000000000004',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  'INV-TEST-001', DATE '2026-01-31', 'draft', 500, 100,
  'historical_exception', 'Backend-only integrity test fixture'
);

INSERT INTO public.commitment_invoice_lines (
  id, invoice_id, sov_line_id, work_this_period, materials_stored
) VALUES (
  '90000000-0000-4000-8000-000000000014',
  '90000000-0000-4000-8000-000000000004',
  '90000000-0000-4000-8000-000000000012',
  500, 0
);

INSERT INTO public.commitment_invoices (
  id, tenant_id, commitment_id, invoice_no, period_end, status,
  submitted_amount, retainage_held
) VALUES (
  '90000000-0000-4000-8000-000000000017',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  'INV-MANUAL-BLOCKED', DATE '2026-01-31', 'draft', 25, 0
);

INSERT INTO public.commitment_invoice_lines (
  id, invoice_id, sov_line_id, work_this_period, materials_stored
) VALUES (
  '90000000-0000-4000-8000-000000000018',
  '90000000-0000-4000-8000-000000000017',
  '90000000-0000-4000-8000-000000000012',
  25, 0
);

SELECT throws_ok(
  $$ UPDATE public.commitment_invoices
     SET status = 'submitted'
     WHERE id = '90000000-0000-4000-8000-000000000017' $$,
  'P0001', NULL,
  'generic manual draft cannot enter the payable ledger'
);

SELECT throws_ok(
  $$ UPDATE public.commitment_invoices
     SET status = 'approved', approved_amount = 500
     WHERE id = '90000000-0000-4000-8000-000000000004' $$,
  'P0001', NULL,
  'draft invoice cannot jump directly to approved'
);

SELECT lives_ok(
  $$ UPDATE public.commitment_invoices
     SET status = 'submitted'
     WHERE id = '90000000-0000-4000-8000-000000000004' $$,
  'draft invoice can be submitted'
);

SELECT lives_ok(
  $$ UPDATE public.commitment_invoices
     SET status = 'approved', approved_amount = 500
     WHERE id = '90000000-0000-4000-8000-000000000004' $$,
  'submitted invoice can be finance-approved'
);

SELECT lives_ok(
  $$ INSERT INTO public.lien_releases (
       id, tenant_id, project_id, direction, release_type, status,
       commitment_invoice_id, amount, through_date
     ) VALUES (
       '90000000-0000-4000-8000-000000000005',
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000002',
       'inbound', 'unconditional_progress', 'approved',
       '90000000-0000-4000-8000-000000000004', 400, DATE '2026-01-31'
     ) $$,
  'finance can approve an inbound lien control'
);

SELECT lives_ok(
  $$ INSERT INTO public.commitment_payments (
       id, tenant_id, commitment_id, commitment_invoice_id,
       amount, paid_date, method, reference
     ) VALUES (
       '90000000-0000-4000-8000-000000000006',
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000003',
       '90000000-0000-4000-8000-000000000004',
       400, DATE '2026-02-05', 'wire', 'TEST-WIRE-0001'
     ) $$,
  'approved released invoice can be paid up to approved less retainage'
);

SELECT is(
  (SELECT status FROM public.commitment_invoices
   WHERE id = '90000000-0000-4000-8000-000000000004'),
  'paid',
  'full net disbursement moves the invoice to paid'
);

SELECT ok(
  (SELECT paid_at IS NOT NULL AND processed_at IS NOT NULL
   FROM public.commitment_invoices
   WHERE id = '90000000-0000-4000-8000-000000000004'),
  'paid invoice receives durable processed and paid stamps'
);

SELECT throws_ok(
  $$ UPDATE public.commitment_sov_lines
     SET scheduled_value = 999
     WHERE id = '90000000-0000-4000-8000-000000000012' $$,
  'P0001', NULL,
  'submitted or paid invoice evidence prevents post-hoc SOV reduction'
);

SELECT throws_ok(
  $$ UPDATE public.commitment_payments SET notes = 'rewritten'
     WHERE id = '90000000-0000-4000-8000-000000000006' $$,
  'P0001', NULL,
  'posted payment evidence cannot be updated'
);

SELECT throws_ok(
  $$ DELETE FROM public.commitment_payments
     WHERE id = '90000000-0000-4000-8000-000000000006' $$,
  'P0001', NULL,
  'posted payment evidence cannot be deleted'
);

SELECT throws_ok(
  $$ UPDATE public.commitment_invoices SET paid_at = now() + interval '1 day'
     WHERE id = '90000000-0000-4000-8000-000000000004' $$,
  'P0001', NULL,
  'paid stamp provenance cannot be rewritten'
);

SELECT throws_ok(
  $$ UPDATE public.lien_releases SET status = 'void'
     WHERE id = '90000000-0000-4000-8000-000000000005' $$,
  'P0001', NULL,
  'lien evidence supporting a payment cannot be downgraded'
);

SELECT throws_ok(
  $$ DELETE FROM public.lien_releases
     WHERE id = '90000000-0000-4000-8000-000000000005' $$,
  'P0001', NULL,
  'lien evidence supporting a payment cannot be deleted'
);

INSERT INTO public.commitments (
  id, tenant_id, project_id, commitment_no, title, commitment_type,
  status, original_value, retainage_pct
) VALUES (
  '90000000-0000-4000-8000-000000000007',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'SC-DRAFT', 'Unsigned test subcontract', 'subcontract',
  'draft', 1000, 0
);

INSERT INTO public.commitment_sov_lines (
  id, tenant_id, commitment_id, line_no, cost_code_id,
  description, scheduled_value
) VALUES (
  '90000000-0000-4000-8000-000000000013',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000007',
  1,
  '90000000-0000-4000-8000-000000000011',
  'Unsigned subcontract billing', 1000
);

INSERT INTO public.commitment_invoices (
  id, tenant_id, commitment_id, invoice_no, period_end, status,
  submitted_amount, retainage_held, source_kind, historical_exception_reason
) VALUES (
  '90000000-0000-4000-8000-000000000008',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000007',
  'INV-UNSIGNED', DATE '2026-02-28', 'draft', 100, 0,
  'historical_exception', 'Backend-only integrity test fixture'
);

INSERT INTO public.commitment_invoice_lines (
  id, invoice_id, sov_line_id, work_this_period, materials_stored
) VALUES (
  '90000000-0000-4000-8000-000000000015',
  '90000000-0000-4000-8000-000000000008',
  '90000000-0000-4000-8000-000000000013',
  100, 0
);

UPDATE public.commitment_invoices
SET status = 'submitted'
WHERE id = '90000000-0000-4000-8000-000000000008';

SELECT throws_ok(
  $$ UPDATE public.commitment_invoices
     SET status = 'approved', approved_amount = 100
     WHERE id = '90000000-0000-4000-8000-000000000008' $$,
  'P0001', NULL,
  'invoice cannot be approved against an unexecuted commitment'
);

INSERT INTO public.commitment_invoices (
  id, tenant_id, commitment_id, invoice_no, period_end, status,
  submitted_amount, retainage_held, source_kind, historical_exception_reason
) VALUES (
  '90000000-0000-4000-8000-000000000009',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  'INV-OVERPAY', DATE '2026-03-31', 'draft', 300, 0,
  'historical_exception', 'Backend-only integrity test fixture'
);

INSERT INTO public.commitment_invoice_lines (
  id, invoice_id, sov_line_id, work_this_period, materials_stored
) VALUES (
  '90000000-0000-4000-8000-000000000016',
  '90000000-0000-4000-8000-000000000009',
  '90000000-0000-4000-8000-000000000012',
  300, 0
);

UPDATE public.commitment_invoices
SET status = 'submitted'
WHERE id = '90000000-0000-4000-8000-000000000009';

UPDATE public.commitment_invoices
SET status = 'approved', approved_amount = 300
WHERE id = '90000000-0000-4000-8000-000000000009';

INSERT INTO public.lien_releases (
  tenant_id, project_id, direction, release_type, status,
  commitment_invoice_id, amount, through_date
) VALUES (
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'inbound', 'unconditional_progress', 'approved',
  '90000000-0000-4000-8000-000000000009', 299, DATE '2026-03-31'
);

SELECT throws_ok(
  $$ INSERT INTO public.commitment_payments (
       tenant_id, commitment_id, commitment_invoice_id,
       amount, paid_date, method, reference
     ) VALUES (
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000003',
       '90000000-0000-4000-8000-000000000009',
       1, DATE '2026-04-01', 'wire', 'TEST-WIRE-UNDERCOVERED'
     ) $$,
  'P0001', NULL,
  'payment is blocked when approved lien coverage is below invoice net'
);

UPDATE public.lien_releases
SET amount = 300
WHERE commitment_invoice_id = '90000000-0000-4000-8000-000000000009'
  AND direction = 'inbound'
  AND status = 'approved';

SELECT throws_ok(
  $$ INSERT INTO public.commitment_payments (
       tenant_id, commitment_id, commitment_invoice_id,
       amount, paid_date, method, reference
     ) VALUES (
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000003',
       '90000000-0000-4000-8000-000000000009',
       301, DATE '2026-04-01', 'wire', 'TEST-WIRE-OVERPAY'
     ) $$,
  'P0001', NULL,
  'payment cannot exceed approved amount less retainage'
);

INSERT INTO public.change_orders (
  id, tenant_id, project_id, commitment_id, co_type, co_no,
  title, amount, status
) VALUES (
  '90000000-0000-4000-8000-000000000022',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003',
  'CCO', 1, 'Integrity-test CCO allocation', 100, 'approved'
);

INSERT INTO public.commitment_sov_lines (
  id, tenant_id, commitment_id, line_no, cost_code_id,
  description, scheduled_value
) VALUES (
  '90000000-0000-4000-8000-000000000023',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  2,
  '90000000-0000-4000-8000-000000000011',
  'Integrity-test CCO SOV allocation', 100
);

SELECT throws_ok(
  $$ UPDATE public.change_orders
     SET amount = 50
     WHERE id = '90000000-0000-4000-8000-000000000022' $$,
  'P0001', NULL,
  'approved CCO cannot be reduced below the live SOV reliance floor'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '90000000-0000-4000-8000-000000000020',
  'integrity-tester@example.com',
  '{"full_name":"Integrity Tester","company_name":"Integrity Test Workspace"}'::jsonb
);

INSERT INTO public.vendor_payapp_submissions (
  id, tenant_id, project_id, commitment_id, token, status,
  app_no, period_to, retainage_pct, vendor_name, created_by
) VALUES (
  '90000000-0000-4000-8000-000000000021',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003',
  'pgtap-payapp-integrity-token',
  'requested', 1, DATE '2026-04-30', 10,
  'Integrity Test Vendor',
  '90000000-0000-4000-8000-000000000020'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000020","role":"authenticated","tenant_id":"90000000-0000-4000-8000-000000000001"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ UPDATE public.vendor_payapp_submissions
     SET status = 'submitted',
         lines = '[{"sov_line_id":"90000000-0000-4000-8000-000000000012","this_period":10,"materials":0}]'::jsonb,
         current_due = 9,
         conditional_signed_at = now(),
         conditional_signed_name = 'Forged REST signer',
         submitted_at = now(),
         apas_waiver_ack = true
     WHERE id = '90000000-0000-4000-8000-000000000021' $$,
  '42501', NULL,
  'authenticated direct REST has no privilege to forge requested pay app evidence'
);

RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);

INSERT INTO public.project_artifacts (
  id, tenant_id, project_id, artifact_type, title,
  file_path, file_name, mime_type
) VALUES (
  '90000000-0000-4000-8000-000000000024',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'invoice', 'Draft cleanup source',
  '90000000-0000-4000-8000-000000000001/90000000-0000-4000-8000-000000000002/pgtap-cleanup.pdf',
  'pgtap-cleanup.pdf', 'application/pdf'
);

INSERT INTO storage.objects (bucket_id, name)
VALUES (
  'project-artifacts',
  '90000000-0000-4000-8000-000000000001/90000000-0000-4000-8000-000000000002/pgtap-cleanup.pdf'
);

INSERT INTO public.vendor_submissions (
  id, tenant_id, project_id, source, doc_type, status, artifact_id
) VALUES (
  '90000000-0000-4000-8000-000000000025',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'manual_upload', 'invoice', 'received',
  '90000000-0000-4000-8000-000000000024'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000020","role":"authenticated","tenant_id":"90000000-0000-4000-8000-000000000001"}',
  true
);

SELECT public.process_vendor_submission_invoice(
  '90000000-0000-4000-8000-000000000025',
  '90000000-0000-4000-8000-000000000003',
  'INV-CLEANUP-DRAFT',
  DATE '2026-05-31',
  10,
  0
);

INSERT INTO public.commitment_invoice_lines (
  invoice_id, sov_line_id, work_this_period, materials_stored
)
SELECT
  created_commitment_invoice_id,
  '90000000-0000-4000-8000-000000000023',
  10,
  0
FROM public.vendor_submissions
WHERE id = '90000000-0000-4000-8000-000000000025';

SELECT lives_ok(
  $$ DELETE FROM public.commitment_invoices
     WHERE id = (
       SELECT created_commitment_invoice_id
       FROM public.vendor_submissions
       WHERE id = '90000000-0000-4000-8000-000000000025'
     ) $$,
  'unpaid uploaded-source draft can be deleted cleanly'
);

SELECT ok(
  (
    SELECT
      vs.created_commitment_invoice_id IS NULL
      AND pa.linked_entity_type IS NULL
      AND pa.linked_entity_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM storage.objects so
        WHERE so.bucket_id = 'project-artifacts'
          AND so.name = pa.file_path
      )
    FROM public.vendor_submissions vs
    JOIN public.project_artifacts pa ON pa.id = vs.artifact_id
    WHERE vs.id = '90000000-0000-4000-8000-000000000025'
  ),
  'draft deletion clears source/artifact backlinks while preserving source bytes'
);

SELECT * FROM finish();
ROLLBACK;
