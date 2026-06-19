-- ============================================================
-- F0 demo seed — sewer-extension job, end-to-end on the cost-code cascade.
-- Idempotent: skips if the demo project already exists.
-- Run: psql "$DATABASE_URL" -f supabase/seed/f0_sewer_extension_demo.sql
-- ============================================================
DO $$
DECLARE
  v_tenant uuid;
  v_prop uuid;
  v_project uuid;
  v_lib uuid;
  cc_gc uuid; cc_sew uuid; cc_mh uuid;
  v_pc uuid; v_payapp uuid;
  v_cmt uuid; v_inv uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.workspaces ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN RAISE NOTICE 'No workspace; aborting demo seed.'; RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.properties WHERE name = 'F0 Sewer Extension Demo') THEN
    RAISE NOTICE 'Demo already seeded.'; RETURN;
  END IF;

  -- property + project
  INSERT INTO public.properties (name, workspace_id)
  VALUES ('F0 Sewer Extension Demo', v_tenant) RETURNING id INTO v_prop;
  INSERT INTO public.projects (property_id, name, status)
  VALUES (v_prop, 'Sewer Infrastructure Extension', 'active') RETURNING id INTO v_project;

  -- cost codes
  SELECT id INTO v_lib FROM public.cost_code_libraries WHERE tenant_id = v_tenant AND is_default LIMIT 1;
  IF v_lib IS NULL THEN
    INSERT INTO public.cost_code_libraries (tenant_id, name, source, is_default)
    VALUES (v_tenant, 'Demo WBS', 'custom', true) RETURNING id INTO v_lib;
  END IF;
  INSERT INTO public.cost_codes (library_id, code, description, level) VALUES (v_lib, 'GC-100', 'General Conditions', 1) RETURNING id INTO cc_gc;
  INSERT INTO public.cost_codes (library_id, code, description, level) VALUES (v_lib, 'SEW-200', 'Sewer Main', 1) RETURNING id INTO cc_sew;
  INSERT INTO public.cost_codes (library_id, code, description, level) VALUES (v_lib, 'MH-300', 'Manholes', 1) RETURNING id INTO cc_mh;

  -- prime contract $523,000 + SOV (cost-coded)
  INSERT INTO public.prime_contracts (tenant_id, project_id, contract_no, title, original_value, retainage_pct, status, executed_date)
  VALUES (v_tenant, v_project, 'PC-01', 'Glorieta Gardens — Sewer Extension', 523000, 5, 'executed', CURRENT_DATE - 60)
  RETURNING id INTO v_pc;
  INSERT INTO public.prime_contract_sov_lines (tenant_id, prime_contract_id, line_no, cost_code_id, description, scheduled_value) VALUES
    (v_tenant, v_pc, 1, cc_gc,  'General Conditions',   33000),
    (v_tenant, v_pc, 2, cc_sew, '8" SDR-26 PVC Main',  424000),
    (v_tenant, v_pc, 3, cc_mh,  'Sanitary Manholes',    66000);

  -- change orders: CO-1 +40k & CO-2 +15k executed; CO-4 +10k pending
  INSERT INTO public.change_orders (tenant_id, project_id, title, description, amount, status, co_no, co_type, prime_contract_id, executed_date) VALUES
    (v_tenant, v_project, 'CO-1 Extra excavation', 'Rock excavation', 40000, 'executed', 1, 'PCO', v_pc, CURRENT_DATE - 30),
    (v_tenant, v_project, 'CO-2 Added laterals',   'Two extra laterals', 15000, 'executed', 2, 'PCO', v_pc, CURRENT_DATE - 20);
  INSERT INTO public.change_orders (tenant_id, project_id, title, description, amount, status, co_no, co_type, prime_contract_id) VALUES
    (v_tenant, v_project, 'CO-4 Dewatering', 'Additional dewatering', 10000, 'draft', 4, 'PCO', v_pc);

  -- pay app #1 $93,000 approved + partial $50,000 receipt
  INSERT INTO public.prime_contract_pay_apps (tenant_id, prime_contract_id, pay_app_no, period_end, status, submitted_amount, approved_amount, retainage_held, approved_date, invoice_no)
  VALUES (v_tenant, v_pc, 1, CURRENT_DATE - 5, 'approved', 93000, 93000, 4650, CURRENT_DATE - 3, 'APP-001')
  RETURNING id INTO v_payapp;
  INSERT INTO public.prime_contract_payments (tenant_id, prime_contract_id, pay_app_id, amount, received_date, method, reference)
  VALUES (v_tenant, v_pc, v_payapp, 50000, CURRENT_DATE - 1, 'ach', 'ACH-7781');

  -- subcontract + invoice + approved conditional lien + partial AP payment
  INSERT INTO public.commitments (tenant_id, project_id, commitment_type, commitment_no, title, original_value, retainage_pct, status, executed_date)
  VALUES (v_tenant, v_project, 'subcontract', 'SC-01', 'Dewatering Sub', 100000, 10, 'executed', CURRENT_DATE - 40)
  RETURNING id INTO v_cmt;
  INSERT INTO public.commitment_sov_lines (tenant_id, commitment_id, line_no, cost_code_id, description, scheduled_value)
  VALUES (v_tenant, v_cmt, 1, cc_sew, 'Dewatering services', 100000);
  INSERT INTO public.commitment_invoices (tenant_id, commitment_id, invoice_no, period_end, status, submitted_amount, approved_amount, retainage_held)
  VALUES (v_tenant, v_cmt, 'SUBINV-1', CURRENT_DATE - 7, 'approved', 20000, 20000, 2000)
  RETURNING id INTO v_inv;
  INSERT INTO public.lien_releases (tenant_id, project_id, direction, release_type, commitment_invoice_id, status, through_date, amount)
  VALUES (v_tenant, v_project, 'inbound', 'conditional_progress', v_inv, 'approved', CURRENT_DATE - 7, 20000);
  INSERT INTO public.commitment_payments (tenant_id, commitment_id, commitment_invoice_id, amount, paid_date, method, reference)
  VALUES (v_tenant, v_cmt, v_inv, 8000, CURRENT_DATE, 'check', '1042');

  RAISE NOTICE 'Seeded F0 sewer demo: project %.', v_project;
END $$;
