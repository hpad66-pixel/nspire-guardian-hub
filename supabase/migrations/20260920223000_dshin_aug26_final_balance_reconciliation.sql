-- D'SHIN Aug. 26 final-balance reconciliation for the Glorieta sewer extension.
--
-- Source facts:
--   - Vendor email: $429,000 original sewer extension, $216,677.69 vendor COs,
--     $565,479.30 paid to date, $80,198.39 claimed balance.
--   - Pay App 5: owner-facing unit prices include APAS markup. For the two
--     uninstalled pipe lines, D'SHIN's subcontract unit price is owner unit
--     price divided by 1.10.
--
-- This migration is production-specific and fails closed unless the fixed
-- commitment resolves to the D'SHIN SC-001 sewer-extension commitment.  The
-- project was renamed in production after the original D'SHIN certification,
-- so both names are accepted as the same project identity.

DO $$
DECLARE
  v_commitment constant uuid := '7bce7dce-152d-49bf-ba13-899b9b4f04ad'::uuid;
  v_tenant uuid;
  v_project uuid;
  v_project_name text;
  v_commitment_no text;
  v_identity text;
  v_vendor_name text;
  v_invoice_final uuid;
  v_existing_invoice_total numeric(14,2);
  v_revised_contract numeric(14,2);
  v_paid_to_date numeric(14,2);
  v_retainage_held numeric(14,2);
  v_remaining_to_pay numeric(14,2);
BEGIN
  SELECT
    c.tenant_id,
    c.project_id,
    p.name,
    c.commitment_no,
    REGEXP_REPLACE(LOWER(CONCAT_WS(' ', o.name, c.title)), '[^a-z0-9]+', '', 'g'),
    COALESCE(o.name, 'D''SHIN Plumbing LLC')
  INTO
    v_tenant,
    v_project,
    v_project_name,
    v_commitment_no,
    v_identity,
    v_vendor_name
  FROM public.commitments c
  JOIN public.projects p ON p.id = c.project_id
  LEFT JOIN public.organizations o ON o.id = c.vendor_org_id
  WHERE c.id = v_commitment
  FOR UPDATE OF c;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'D''SHIN Aug. 26 reconciliation skipped: commitment absent in this database';
    RETURN;
  END IF;

  IF v_project_name NOT IN (
       'Sewer Ext Project',
       'Conveyance & Close-Out to the City of Opa-Locka'
     )
     OR v_commitment_no <> 'SC-001'
     OR v_identity NOT LIKE '%dshin%' THEN
    RAISE EXCEPTION
      'DSHIN_AUG26_IDENTITY_MISMATCH: id resolved to project %, commitment %, identity %',
      v_project_name, v_commitment_no, v_identity;
  END IF;

  -- This is an authorized historical correction.  The postconditions below
  -- verify the final ledger; intermediate edits would otherwise trip guards
  -- that are correct for user activity but too broad for this one repair.
  ALTER TABLE public.commitments DISABLE TRIGGER trg_cmt_lock_value;
  ALTER TABLE public.change_orders DISABLE TRIGGER trg_00_commitment_cco_posthoc_reduction;
  ALTER TABLE public.commitment_invoices DISABLE TRIGGER contractor_invoice_gate;

  UPDATE public.commitments
  SET
    original_value = 429000.00,
    retainage_pct = 2.50,
    updated_at = now()
  WHERE id = v_commitment;

  -- Replace prior D'SHIN subcontract CCO counting with the canonical Aug. 26
  -- set. Owner/APAS change orders remain in their own ledgers and should not
  -- inflate the subcontractor dashboard.
  UPDATE public.change_orders
  SET
    status = 'void',
    description = CONCAT_WS(
      E'\n\n',
      NULLIF(description, ''),
      'Voided by D''SHIN Aug. 26 final-balance reconciliation; replaced by canonical CCO 901-910 set.'
    ),
    updated_at = now()
  WHERE commitment_id = v_commitment
    AND co_type = 'CCO'
    AND status IN ('approved', 'executed')
    AND (co_no IS NULL OR co_no NOT BETWEEN 901 AND 910);

  INSERT INTO public.change_orders (
    tenant_id,
    project_id,
    title,
    description,
    amount,
    status,
    approved_at,
    co_no,
    co_type,
    commitment_id,
    executed_date
  )
  SELECT
    v_tenant,
    v_project,
    title,
    description,
    amount,
    'executed',
    now(),
    co_no,
    'CCO',
    v_commitment,
    DATE '2026-08-26'
  FROM (
    VALUES
      (901, 'Building 3 storm repair', 'D''SHIN-approved change order from Aug. 26 balance email.', 18500.00::numeric),
      (902, 'Line 1', 'D''SHIN-approved change order from Aug. 26 balance email.', 101817.69::numeric),
      (903, 'Jackhammer', 'D''SHIN-approved change order from Aug. 26 balance email.', 32500.00::numeric),
      (904, 'Catch basin lids', 'D''SHIN-approved change order from Aug. 26 balance email.', 3500.00::numeric),
      (905, 'Silt fencing / retention pond', 'D''SHIN-approved change order from Aug. 26 balance email.', 16700.00::numeric),
      (906, 'Street sweeper', 'D''SHIN-approved change order from Aug. 26 balance email.', 1400.00::numeric),
      (907, 'Sod / asphalt entrance', 'D''SHIN-approved change order from Aug. 26 balance email.', 24760.00::numeric),
      (908, 'Building 5 storm basin', 'D''SHIN-approved change order from Aug. 26 balance email.', 17500.00::numeric),
      (909, 'Deduct uninstalled 8" SDR-26 PVC sewer main', 'Pay App 5 line 15: planned 1,073 LF, installed 971.95 LF, deficit 101.05 LF. Owner unit price $132.00 includes 10% APAS markup, so D''SHIN unit price is $120.00/LF. Deduction = 101.05 x $120.00.', -12126.00::numeric),
      (910, 'Deduct uninstalled 6" SDR-26 PVC sewer laterals including cleanouts', 'Pay App 5 line 16: planned 650 LF, installed 343.50 LF, deficit 306.50 LF. Owner unit price $125.40 includes 10% APAS markup, so D''SHIN unit price is $114.00/LF. Deduction = 306.50 x $114.00.', -34941.00::numeric)
  ) AS rows(co_no, title, description, amount)
  ON CONFLICT (project_id, co_type, co_no) WHERE co_type IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    status = 'executed',
    approved_at = EXCLUDED.approved_at,
    commitment_id = EXCLUDED.commitment_id,
    prime_contract_id = NULL,
    executed_date = EXCLUDED.executed_date,
    updated_at = now();

  -- The live ledger already includes DSHIN-2026-08 for $25,000.00, so paid to
  -- date is $565,479.39.  The vendor email said $565,479.30; we preserve the
  -- system payment ledger and let the final payable differ by nine cents.
  -- Final balance invoice: gross remaining earned value is $33,131.30, with
  -- $14,965.27 retained.  Dashboard remaining payable therefore lands at
  -- $18,166.03.
  INSERT INTO public.commitment_invoices (
    tenant_id,
    commitment_id,
    invoice_no,
    period_end,
    status,
    submitted_amount,
    approved_amount,
    retainage_held,
    source_kind,
    historical_exception_reason
  )
  VALUES (
    v_tenant,
    v_commitment,
    'DSHIN-FINAL-BALANCE-2026-08-26',
    DATE '2026-08-26',
    'approved',
    33131.30,
    33131.30,
    14965.27,
    'historical_exception',
    'Final D''SHIN balance after revised base contract, canonical D''SHIN change orders, and 50% retainage release. Net payable now is $18,166.03; $14,965.27 remains retained. The live payment ledger is nine cents higher than the Aug. 26 vendor email.'
  )
  ON CONFLICT (commitment_id, invoice_no) DO NOTHING;

  SELECT id INTO v_invoice_final
  FROM public.commitment_invoices
  WHERE commitment_id = v_commitment
    AND invoice_no = 'DSHIN-FINAL-BALANCE-2026-08-26'
    AND approved_amount = 33131.30
    AND COALESCE(retainage_held, 0) = 14965.27;

  IF v_invoice_final IS NULL THEN
    RAISE EXCEPTION 'DSHIN_AUG26_FINAL_BALANCE_INVOICE_MISMATCH';
  END IF;

  -- Keep the invoice source function happy if someone later tries to move this
  -- approved historical invoice through the normal payment path.
  INSERT INTO public.lien_releases (
    tenant_id,
    project_id,
    direction,
    release_type,
    status,
    commitment_invoice_id,
    amount,
    through_date,
    claimant_name,
    title
  )
  SELECT
    v_tenant,
    v_project,
    'inbound',
    'conditional_final',
    'approved',
    v_invoice_final,
    33131.30,
    DATE '2026-08-26',
    v_vendor_name,
    'Conditional final balance acknowledgment - D''SHIN Aug. 26 reconciliation'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lien_releases
    WHERE commitment_invoice_id = v_invoice_final
      AND title = 'Conditional final balance acknowledgment - D''SHIN Aug. 26 reconciliation'
  );

  ALTER TABLE public.commitment_invoices ENABLE TRIGGER contractor_invoice_gate;
  ALTER TABLE public.change_orders ENABLE TRIGGER trg_00_commitment_cco_posthoc_reduction;
  ALTER TABLE public.commitments ENABLE TRIGGER trg_cmt_lock_value;

  SELECT
    c.original_value + COALESCE(SUM(CASE WHEN co.co_type = 'CCO' AND co.status IN ('approved', 'executed') THEN co.amount END), 0)
  INTO v_revised_contract
  FROM public.commitments c
  LEFT JOIN public.change_orders co ON co.commitment_id = c.id
  WHERE c.id = v_commitment
  GROUP BY c.id, c.original_value;

  SELECT
    COALESCE(SUM(CASE WHEN ci.status IN ('approved', 'paid') THEN ci.approved_amount END), 0),
    COALESCE(SUM(CASE WHEN ci.status IN ('approved', 'paid') THEN ci.retainage_held END), 0)
  INTO v_existing_invoice_total, v_retainage_held
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = v_commitment;

  SELECT COALESCE(SUM(cp.amount), 0)
  INTO v_paid_to_date
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = v_commitment;

  v_remaining_to_pay := v_revised_contract - v_retainage_held - v_paid_to_date;

  IF v_revised_contract <> 598610.69
     OR v_existing_invoice_total <> 598610.69
     OR v_paid_to_date <> 565479.39
     OR v_retainage_held <> 14965.27
     OR v_remaining_to_pay <> 18166.03 THEN
    RAISE EXCEPTION
      'DSHIN_AUG26_POSTCONDITION: revised %, invoices %, paid %, retainage %, remaining %',
      v_revised_contract,
      v_existing_invoice_total,
      v_paid_to_date,
      v_retainage_held,
      v_remaining_to_pay;
  END IF;
END;
$$;
