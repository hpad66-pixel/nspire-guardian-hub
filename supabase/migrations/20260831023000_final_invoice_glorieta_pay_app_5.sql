-- Glorieta PC-01 Pay App #5 — final invoice after the $75k interim.
--
-- 1) Dedupe the double-counted $75k (INV-26-37 insert + unlabeled 8/6 wire).
-- 2) Pin the G702 cover so Line 7 includes ALL cash received to date
--    ($742,871.38) and Line 8 / Amount Certified = remaining due $144,332.82.
-- 3) Flag use_reconciled_snapshot so draft Export PDF serves this cover
--    instead of recomputing incomplete live SOV placeholders.

DO $$
DECLARE
  v_pay_app uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_existing uuid := '9fffbe5b-8855-4407-83e5-6da1aa90d2b3';
  v_duplicate uuid := 'a75c0f5e-75a0-4b75-9c75-000000000075';
  v_existing_ok boolean := false;
  v_duplicate_ok boolean := false;
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app AND prime_contract_id = v_contract;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'Glorieta Pay App 5 not found — skipping final-invoice reconciliation';
    RETURN;
  END IF;

  -- ── 1. Dedupe $75k ────────────────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM public.prime_contract_payments
    WHERE id = v_existing
      AND prime_contract_id = v_contract
      AND pay_app_id = v_pay_app
      AND amount = 75000
  ) INTO v_existing_ok;

  SELECT EXISTS (
    SELECT 1 FROM public.prime_contract_payments
    WHERE id = v_duplicate
      AND prime_contract_id = v_contract
      AND pay_app_id = v_pay_app
      AND amount = 75000
  ) INTO v_duplicate_ok;

  IF v_existing_ok AND v_duplicate_ok THEN
    UPDATE public.prime_contract_payments
    SET
      reference = 'INV-26-37',
      method = 'wire',
      notes = 'Interim release against Pay App 5 per 2026-07-29 progress meeting. '
        || 'Final invoice Line 7 includes this $75k; Current Due / Amount Certified = $144,332.82. '
        || 'Received 2026-08-06 (same $75k as INV-26-37; duplicate row removed).',
      updated_at = now()
    WHERE id = v_existing;

    DELETE FROM public.prime_contract_payments
    WHERE id = v_duplicate
      AND prime_contract_id = v_contract
      AND amount = 75000;

    RAISE NOTICE 'Glorieta Pay App 5: removed duplicate $75k; stamped 8/6 receipt INV-26-37';
  ELSIF v_existing_ok THEN
    UPDATE public.prime_contract_payments
    SET
      reference = COALESCE(NULLIF(reference, ''), 'INV-26-37'),
      notes = COALESCE(
        NULLIF(notes, ''),
        'Interim release against Pay App 5 per 2026-07-29 progress meeting. '
          || 'Final invoice Line 7 includes this $75k; Current Due = $144,332.82.'
      ),
      updated_at = now()
    WHERE id = v_existing;

    RAISE NOTICE 'Glorieta Pay App 5: single $75k receipt already present';
  ELSIF v_duplicate_ok THEN
    -- Fresh env that only got the INV-26-37 insert — keep it, retarget notes.
    UPDATE public.prime_contract_payments
    SET
      notes = 'Interim release against Pay App 5 per 2026-07-29 progress meeting. '
        || 'Final invoice Line 7 includes this $75k; Current Due / Amount Certified = $144,332.82.',
      updated_at = now()
    WHERE id = v_duplicate;
    RAISE NOTICE 'Glorieta Pay App 5: keeping INV-26-37 as the sole $75k receipt';
  ELSE
    RAISE NOTICE 'Glorieta Pay App 5: no $75k receipt found — G702 still updated to final figures';
  END IF;

  -- ── 2. Final-invoice G702 (cash-inclusive Line 7) ─────────────────────────
  -- Only rewrite while still draft (do not clobber an already-submitted certificate).
  UPDATE public.prime_contract_pay_apps
  SET
    period_end = '2026-07-22',
    invoice_no = '5',
    submitted_amount = 144332.82,
    retainage_held = 34008.16,
    pay_app_data = jsonb_build_object(
      'app_no', 5,
      'period_end', '2026-07-22',
      'use_reconciled_snapshot', true,
      'original_contract_sum', 523061.00,
      'net_change_orders', 430289.35,
      'contract_sum_to_date', 953350.35,
      'completed_stored_to_date', 921212.36,
      'retainage_total', 34008.16,
      'retainage_pct_completed', 3.69,
      'total_earned_less_retainage', 887204.20,
      -- Line 7 = all R4→APAS cash to date including the $75k interim
      'less_previous_certificates', 742871.38,
      'current_payment_due', 144332.82,
      'balance_to_finish', 66146.15,
      'amount_certified', 144332.82,
      'cash_received_before_this_app', 667871.38,
      'interim_received_this_app', 75000.00,
      'cash_received_to_date', 742871.38,
      'balance_still_due_this_app', 144332.82,
      'reconciliation_note',
        'FINAL invoice. Line 7 is actual R4→APAS cash through INV-26-37 / 8/6 wire '
        || '($742,871.38 = Chris 7/23 $667,871.38 + $75,000). '
        || 'Line 8 / Amount Certified = remaining due $144,332.82. '
        || 'Net CO uses workbook $430,289.35. TELR $887,204.20 − cash $742,871.38 = $144,332.82.',
      'qa_sources', jsonb_build_array(
        'Chris Sullivan payment notes 2026-06-24 (agreed 2026-06-25)',
        'Chris Sullivan Pay App 5 comments 2026-07-23 ($667,871.38 prior to $75k)',
        'Progress meeting minutes 2026-07-29 (release $75,000 against Pay App 5)',
        'APAS_Glorieta_Master_Reconciliation.xlsx as of 2026-07-31',
        'Bank / ledger 2026-08-06 $75,000 wire (INV-26-37)'
      )
    ),
    updated_at = now()
  WHERE id = v_pay_app
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE NOTICE 'Glorieta Pay App 5 is not draft — G702 snapshot left unchanged';
  END IF;
END $$;
