-- Glorieta PC-01 Pay App #5 final-invoice reconciliation.
-- Sources: Chris Sullivan payment notes (agreed 2026-06-25), his 2026-07-23
-- paid-to-date figure ($667,871.38), the 2026-07-29 meeting release of $75,000
-- against Pay App 5, and APAS_Glorieta_Master_Reconciliation.xlsx (as of 7/31).
--
-- Model:
--   Line 7 = cash received before the $75k interim = $667,871.38
--   Line 8 / submitted_amount = $219,332.82 (TELR − Line 7)
--   $75,000 recorded as a payment against Pay App 5
--   Remaining balance due = $144,332.82

DO $$
DECLARE
  v_pay_app uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_tenant uuid;
  v_payment uuid := 'a75c0f5e-75a0-4b75-9c75-000000000075';
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app AND prime_contract_id = v_contract;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'Glorieta Pay App 5 not found — skipping reconciliation data fix';
    RETURN;
  END IF;

  -- Only rewrite while still draft (do not clobber an already-submitted certificate).
  UPDATE public.prime_contract_pay_apps
  SET
    period_end = '2026-07-22',
    invoice_no = '5',
    submitted_amount = 219332.82,
    retainage_held = 34008.16,
    pay_app_data = jsonb_build_object(
      'app_no', 5,
      'period_end', '2026-07-22',
      'original_contract_sum', 523061.00,
      'net_change_orders', 430289.35,
      'contract_sum_to_date', 953350.35,
      'completed_stored_to_date', 921212.36,
      'retainage_total', 34008.16,
      'retainage_pct_completed', 3.69,
      'total_earned_less_retainage', 887204.20,
      'less_previous_certificates', 667871.38,
      'current_payment_due', 219332.82,
      'balance_to_finish', 66146.15,
      'amount_certified', 219332.82,
      'cash_received_before_this_app', 667871.38,
      'interim_received_this_app', 75000.00,
      'balance_still_due_this_app', 144332.82,
      'reconciliation_note',
        'Line 7 is actual R4→APAS cash through Chris 7/23 figure ($667,871.38). '
        || '$75,000 INV-26-37 interim is recorded as a payment against this app. '
        || 'Remaining due = $144,332.82. Net CO uses workbook $430,289.35 '
        || '($160 street-sweeper true-up vs PA5 SOV $1,870 / PCO-014 $1,710).',
      'qa_sources', jsonb_build_array(
        'Chris Sullivan payment notes 2026-06-24 (agreed 2026-06-25)',
        'Chris Sullivan Pay App 5 comments 2026-07-23 ($667,871.38 Line 7)',
        'Progress meeting minutes 2026-07-29 (release $75,000 against Pay App 5)',
        'APAS_Glorieta_Master_Reconciliation.xlsx as of 2026-07-31'
      )
    ),
    updated_at = now()
  WHERE id = v_pay_app
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE NOTICE 'Glorieta Pay App 5 is not draft — G702 snapshot left unchanged';
  END IF;

  -- Record the $75k interim if not already present (idempotent by fixed id + reference).
  IF NOT EXISTS (
    SELECT 1 FROM public.prime_contract_payments
    WHERE id = v_payment
       OR (prime_contract_id = v_contract AND reference = 'INV-26-37' AND amount = 75000)
  ) THEN
    INSERT INTO public.prime_contract_payments (
      id, tenant_id, prime_contract_id, pay_app_id,
      amount, received_date, method, reference, notes
    ) VALUES (
      v_payment,
      v_tenant,
      v_contract,
      v_pay_app,
      75000.00,
      '2026-07-30',
      'wire',
      'INV-26-37',
      'Interim release against Pay App 5 per 2026-07-29 progress meeting. Certificate current due $219,332.82; remaining after this receipt $144,332.82.'
    );
  END IF;
END $$;
