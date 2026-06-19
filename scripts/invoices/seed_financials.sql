-- Rows-only seed for the three Glorieta invoices (no PDF upload — use
-- import_to_supabase.mjs for attachments). Idempotent: guarded by NOT EXISTS.
-- Run: psql "$DATABASE_URL" -f scripts/invoices/seed_financials.sql
DO $$
DECLARE
  v_tenant   uuid;
  v_project  uuid;
  v_owner    uuid;   -- owner contract (A/R)
  v_ecotech  uuid;   -- vendor subcontract (A/P)
  v_co       uuid;   -- turbidity change order
BEGIN
  SELECT p.workspace_id, pr.id
    INTO v_tenant, v_project
    FROM public.properties p
    JOIN public.projects pr ON pr.property_id = p.id
   WHERE p.name ILIKE 'Glorieta%'
   ORDER BY pr.created_at
   LIMIT 1;

  IF v_project IS NULL THEN
    RAISE NOTICE 'No Glorieta project found — nothing seeded.';
    RETURN;
  END IF;

  -- Owner contract (APAS -> R4)
  SELECT id INTO v_owner FROM public.project_contracts
   WHERE project_id = v_project AND contract_number = 'OWN-R4';
  IF v_owner IS NULL THEN
    INSERT INTO public.project_contracts (tenant_id, project_id, contract_number, contract_title,
      contract_type, status, prime_contractor_name, prime_contractor_email,
      subcontractor_name, subcontractor_email, project_address, retainage_percent)
    VALUES (v_tenant, v_project, 'OWN-R4', 'Glorieta Gardens — Owner Agreement (R4 Capital)',
      'prime', 'executed', 'APAS Consulting LLC', 'admin@apas.ai',
      'R4 Capital C/o R4 GGOL GP LLC', 'csullivan@r4cap.com',
      '13210 Alexandria Dr, Opa-locka, FL 33054', 5.0)
    RETURNING id INTO v_owner;
  END IF;

  -- Eco Tech subcontract (Eco Tech -> APAS)
  SELECT id INTO v_ecotech FROM public.project_contracts
   WHERE project_id = v_project AND contract_number = 'SUB-ECOTECH';
  IF v_ecotech IS NULL THEN
    INSERT INTO public.project_contracts (tenant_id, project_id, contract_number, contract_title,
      contract_type, status, prime_contractor_name, subcontractor_name,
      subcontractor_address, project_address, retainage_percent)
    VALUES (v_tenant, v_project, 'SUB-ECOTECH', 'Eco Tech Consulting — Field Services',
      'subcontract', 'executed', 'APAS Consulting LLC', 'Eco Tech Consulting, LLC',
      '556 NW 53rd Street, Boca Raton, FL 33487',
      '13210 Alexandria Dr, Opa-locka, FL 33054', 0)
    RETURNING id INTO v_ecotech;
  END IF;

  -- Change order CO-001 (turbidity, billed to owner)
  SELECT id INTO v_co FROM public.contract_change_orders
   WHERE contract_id = v_owner AND co_number = 'CO-001';
  IF v_co IS NULL THEN
    INSERT INTO public.contract_change_orders (tenant_id, contract_id, co_number, description,
      amount, status, co_date, reason)
    VALUES (v_tenant, v_owner, 'CO-001',
      'Turbidity meter rental & logistics (pass-through, Eco Tech backup)',
      2075.00, 'approved', '2026-06-15', 'Owner-requested water-quality monitoring')
    RETURNING id INTO v_co;
  END IF;

  -- A/R Pay App #5
  IF NOT EXISTS (SELECT 1 FROM public.contract_invoices
                  WHERE contract_id = v_owner AND invoice_number = 'INV-26-34') THEN
    INSERT INTO public.contract_invoices (tenant_id, contract_id, invoice_number, invoice_date,
      period_end, amount, retainage, status, invoice_kind, pay_app_no, notes)
    VALUES (v_tenant, v_owner, 'INV-26-34', '2026-06-15', '2026-06-30',
      91857.43, 0, 'submitted', 'pay_app', 5, 'Interim Invoice for Pay App #5');
  END IF;

  -- A/R turbidity invoice (tied to CO-001)
  IF NOT EXISTS (SELECT 1 FROM public.contract_invoices
                  WHERE contract_id = v_owner AND invoice_number = 'INV-26-33') THEN
    INSERT INTO public.contract_invoices (tenant_id, contract_id, invoice_number, invoice_date,
      period_end, amount, retainage, status, invoice_kind, change_order_id, notes)
    VALUES (v_tenant, v_owner, 'INV-26-33', '2026-06-15', '2026-07-15',
      2075.00, 0, 'submitted', 'invoice', v_co, 'Turbidity Meter Rental');
  END IF;

  -- A/P Eco Tech vendor bill
  IF NOT EXISTS (SELECT 1 FROM public.contract_invoices
                  WHERE contract_id = v_ecotech AND invoice_number = '594') THEN
    INSERT INTO public.contract_invoices (tenant_id, contract_id, invoice_number, invoice_date,
      period_end, amount, retainage, status, invoice_kind, notes)
    VALUES (v_tenant, v_ecotech, '594', '2026-05-30', '2026-05-30',
      2075.00, 0, 'approved', 'invoice', 'Turbidity meter logistics (Pine Environmental / Eros)');
  END IF;

  RAISE NOTICE 'Seeded Glorieta financials: project %, tenant %.', v_project, v_tenant;
END $$;
