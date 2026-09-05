BEGIN;
SELECT plan(15);

SELECT has_table('public', 'consulting_costs', 'consulting cost ledger exists');
SELECT has_table('public', 'consulting_cost_payments', 'consulting vendor payments exist');
SELECT has_table('public', 'consulting_financial_closeouts', 'consulting closeout snapshots exist');
SELECT has_view('public', 'v_consulting_financial_position', 'consulting reconciliation view exists');
SELECT has_function('public', 'close_consulting_project', ARRAY['uuid', 'text'], 'controlled consulting closeout function exists');

INSERT INTO public.workspaces (id, name)
VALUES ('95000000-0000-4000-8000-000000000001', 'Consulting Cash Flow Test');

INSERT INTO public.projects (id, workspace_id, name, project_type, status)
VALUES ('95000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000001', 'R4 Consulting Test', 'consulting', 'active');

INSERT INTO public.proposals (
  id, tenant_id, project_id, proposal_no, title, status, overhead_pct, profit_pct
) VALUES (
  '95000000-0000-4000-8000-000000000003', '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002', 'PROP-TEST', 'Approved consulting services',
  'approved', 0, 0
);

INSERT INTO public.proposal_lines (
  tenant_id, proposal_id, line_no, category, description, quantity, unit, unit_cost, markup_pct
) VALUES (
  '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000003',
  1, 'labor', 'Professional services', 1, 'ls', 70000, 0
);

INSERT INTO public.consulting_invoices (
  id, tenant_id, project_id, invoice_no, status, issue_date, subtotal, total
) VALUES (
  '95000000-0000-4000-8000-000000000004', '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002', 1, 'sent', current_date, 70000, 70000
);

INSERT INTO public.consulting_invoice_payments (
  tenant_id, invoice_id, amount, received_date, method
) VALUES (
  '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000004',
  70000, current_date, 'Wire'
);

INSERT INTO public.consulting_costs (
  id, tenant_id, project_id, vendor_name, cost_type, reference_no, amount, status
) VALUES (
  '95000000-0000-4000-8000-000000000005', '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002', 'Test Subcontractor', 'subcontractor', 'SUB-001', 15000, 'approved'
);

INSERT INTO public.consulting_cost_payments (
  tenant_id, cost_id, amount, paid_date, method
) VALUES (
  '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000005',
  15000, current_date, 'Wire'
);

SELECT is((SELECT approved_revenue FROM public.v_consulting_financial_position WHERE project_id = '95000000-0000-4000-8000-000000000002'), 70000::numeric, 'executed proposals establish approved revenue');
SELECT is((SELECT cash_received FROM public.v_consulting_financial_position WHERE project_id = '95000000-0000-4000-8000-000000000002'), 70000::numeric, 'client receipts establish cash in');
SELECT is((SELECT total_costs FROM public.v_consulting_financial_position WHERE project_id = '95000000-0000-4000-8000-000000000002'), 15000::numeric, 'approved subcontractor bills establish project cost');
SELECT is((SELECT net_profit FROM public.v_consulting_financial_position WHERE project_id = '95000000-0000-4000-8000-000000000002'), 55000::numeric, 'net profit equals cash in minus cash out');
SELECT ok((SELECT is_reconciled FROM public.v_consulting_financial_position WHERE project_id = '95000000-0000-4000-8000-000000000002'), 'fully settled consulting project is reconciled');

SELECT throws_ok(
  $$ INSERT INTO public.consulting_invoice_payments (tenant_id, invoice_id, amount, received_date)
     VALUES ('95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000004', 1, current_date) $$,
  'P0001', 'Receipt exceeds the remaining client invoice balance',
  'client invoice cannot be overpaid'
);

SELECT throws_ok(
  $$ INSERT INTO public.consulting_cost_payments (tenant_id, cost_id, amount, paid_date)
     VALUES ('95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000005', 1, current_date) $$,
  'P0001', 'Payment exceeds the remaining approved cost balance',
  'subcontractor cost cannot be overpaid'
);

SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"super_admin"}}', true);
SELECT lives_ok(
  $$ SELECT public.close_consulting_project('95000000-0000-4000-8000-000000000002', 'Reconciled test closeout') $$,
  'reconciled consulting project closes through the controlled function'
);
SELECT is(
  (SELECT status::text FROM public.projects WHERE id = '95000000-0000-4000-8000-000000000002'),
  'closed',
  'financial closeout marks the project closed'
);
SELECT is(
  (SELECT net_profit FROM public.consulting_financial_closeouts WHERE project_id = '95000000-0000-4000-8000-000000000002'),
  55000::numeric,
  'closeout snapshot stamps final net profit'
);

SELECT * FROM finish();
ROLLBACK;
