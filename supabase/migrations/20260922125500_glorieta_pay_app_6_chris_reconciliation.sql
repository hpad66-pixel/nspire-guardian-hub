-- Glorieta Sewer Extension Pay App #6 Chris Sullivan reconciliation.
--
-- Source: Chris Sullivan email dated 2026-09-02 requested:
--   Total Completed and Stored to Date: $902,104.65
--   Retainage 5%: $45,105.23
--   2.5% release on substantial completion: $22,552.61
--   Remaining 2.5% after warranty inspection: $22,552.62
--   Total Earned Less Retainage after release: $879,552.03
--   Less previous certificates/payment as of 2026-09-02: $742,871.38
--   Current Payment Due: $136,680.65
--   Unpaid Balance: $22,552.62
--
-- The existing 2026-09-04 $136,680.65 receipt was user-directed to be
-- reallocated from Pay App #5 to Pay App #6. Preserve the same payment row,
-- date, amount, and aggregate cash. Do not create a duplicate receipt.

DO $$
DECLARE
  v_pay_app_5_id uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da'::uuid;
  v_pay_app_6_id uuid := '1a0aaec0-c856-472d-b5a1-b9ac363ea5c0'::uuid;
  v_project_id uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;
  v_pay_app_6 public.prime_contract_pay_apps%ROWTYPE;
  v_contract public.prime_contracts%ROWTYPE;
  v_receipt_id uuid;
  v_pre_0904_paid numeric(14,2) := 742871.38;
  v_receipt_amount numeric(14,2) := 136680.65;
  v_contract_sum numeric(14,2) := 902104.65;
  v_gross_retainage numeric(14,2) := 45105.23;
  v_release_this_app numeric(14,2) := 22552.61;
  v_remaining_retainage numeric(14,2) := 22552.62;
  v_total_earned_less_retainage numeric(14,2) := 879552.03;
  v_cash_received_to_date numeric(14,2) := 879552.03;
BEGIN
  SELECT *
  INTO v_pay_app_6
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app_6_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Pay App 6 % not found; skipping Chris reconciliation', v_pay_app_6_id;
    RETURN;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.prime_contracts
  WHERE id = v_pay_app_6.prime_contract_id
    AND project_id = v_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Pay App 6 % is not tied to Glorieta project %; skipping Chris reconciliation', v_pay_app_6_id, v_project_id;
    RETURN;
  END IF;

  IF v_pay_app_6.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Pay App 6 % is %, not draft/submitted; refusing to rewrite certified history', v_pay_app_6_id, v_pay_app_6.status;
  END IF;

  -- Reallocate the existing 2026-09-04 receipt exactly once. This is not a new
  -- cash event; it is an allocation correction from Pay App 5 to Pay App 6.
  SELECT id
  INTO v_receipt_id
  FROM public.prime_contract_payments
  WHERE prime_contract_id = v_contract.id
    AND amount = v_receipt_amount
    AND received_date = '2026-09-04'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF v_receipt_id IS NULL THEN
    RAISE NOTICE 'No 2026-09-04 $136,680.65 receipt found to reallocate; Pay App 6 cover will still be reconciled.';
  ELSE
    UPDATE public.prime_contract_payments
    SET pay_app_id = v_pay_app_6_id,
        reference = COALESCE(reference, 'Pay App 6 receipt'),
        notes = concat_ws(
          ' ',
          NULLIF(notes, ''),
          '[Reallocated from Pay App 5 to Pay App 6 per user direction during Chris Sullivan reconciliation; original amount/date preserved.]'
        ),
        updated_at = now()
    WHERE id = v_receipt_id
      AND pay_app_id IS DISTINCT FROM v_pay_app_6_id;
  END IF;

  UPDATE public.prime_contracts
  SET retainage_pct = 5.00,
      updated_at = now()
  WHERE id = v_contract.id
    AND retainage_pct IS DISTINCT FROM 5.00;

  -- Keep positive lines at 5% retainage and negative contract credits at zero.
  UPDATE public.sov_line_items
  SET retainage_pct = CASE WHEN scheduled_value < 0 THEN 0 ELSE 5.00 END,
      billing_treatment = CASE WHEN scheduled_value < 0 THEN 'contract_credit_only' ELSE 'normal' END,
      updated_at = now()
  WHERE prime_contract_id = v_contract.id;

  -- Final Pay App 6 should show the full final SOV values, with pipe deductions
  -- carried by the separate negative credit line. This makes the visible detail
  -- chronological and prevents double-counting the pipe credit.
  UPDATE public.pay_app_line_progress p
  SET qty_to_date = li.scheduled_qty,
      value_to_date = li.scheduled_value,
      pct_complete = CASE WHEN li.scheduled_value = 0 THEN 0 ELSE 100 END,
      retainage = CASE WHEN li.scheduled_value < 0 THEN 0 ELSE round((li.scheduled_value * 0.05)::numeric, 2) END,
      updated_at = now()
  FROM public.sov_line_items li
  WHERE p.pay_app_id = v_pay_app_6_id
    AND p.sov_line_item_id = li.id
    AND li.prime_contract_id = v_contract.id;

  UPDATE public.prime_contract_pay_apps
  SET retainage_held = v_remaining_retainage,
      submitted_amount = v_receipt_amount,
      approved_amount = CASE
        WHEN status IN ('approved', 'paid') THEN v_receipt_amount
        ELSE approved_amount
      END,
      is_final_invoice = false,
      pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
        || jsonb_build_object(
          'original_contract_sum', 523061.00,
          'net_change_orders', 379043.65,
          'contract_sum_to_date', v_contract_sum,
          'completed_stored_to_date', v_contract_sum,
          'gross_retainage_at_5_pct', v_gross_retainage,
          'retainage_released_this_app', v_release_this_app,
          'retainage_released_to_date', v_release_this_app,
          'retainage_remaining_held', v_remaining_retainage,
          'retainage_total', v_remaining_retainage,
          'retainage_policy', 'Cover retainage follows Chris Sullivan 2026-09-02 reconciliation: 5% of net contract/completed value. Positive detail rows carry 5%; negative contract-credit rows carry $0.',
          'retainage_release_policy', '2.5% released on substantial completion; remaining 2.5% held until final warranty inspection, 12 months after conveyance.',
          'total_earned_less_retainage', v_total_earned_less_retainage,
          'less_previous_certificates', v_pre_0904_paid,
          'cash_received_to_date', v_cash_received_to_date,
          'payment_received_this_app', v_receipt_amount,
          'current_payment_due', v_receipt_amount,
          'amount_certified', v_receipt_amount,
          'balance_still_due_this_app', 0,
          'net_due_after_receipts', 0,
          'balance_to_finish', v_remaining_retainage,
          'is_final_invoice', false,
          'use_reconciled_snapshot', true,
          'chris_reconciliation_applied_at', now(),
          'chris_reconciliation_source', 'Chris Sullivan email 2026-09-02 plus user-directed 2026-09-04 receipt reallocation',
          'reconciliation_note',
            'Chris Sullivan reconciliation: Line 4 $902,104.65; gross 5% retainage $45,105.23; release $22,552.61; remaining retainage $22,552.62; Line 7 prior certificates $742,871.38; Line 8 current due $136,680.65. Existing 2026-09-04 receipt for $136,680.65 is allocated to Pay App 6, leaving $0 net due on this application and $22,552.62 retained until warranty closeout.'
        )
  WHERE id = v_pay_app_6_id;

  -- Remove the Pay App 6 receipt from Pay App 5's apparent collection status
  -- while preserving Pay App 5's historical cover snapshot.
  UPDATE public.prime_contract_pay_apps
  SET pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
        || jsonb_build_object(
          'cash_received_to_date', v_pre_0904_paid,
          'reconciliation_note',
            concat_ws(
              ' ',
              NULLIF(pay_app_data->>'reconciliation_note', ''),
              'The 2026-09-04 $136,680.65 receipt was reallocated from Pay App 5 to Pay App 6 per user direction; aggregate contract cash was not changed.'
            )
        ),
      updated_at = now()
  WHERE id = v_pay_app_5_id;

  RAISE NOTICE 'Pay App 6 reconciled: contract %, gross retainage %, released %, remaining %, previous %, current due %, receipt %, net due 0',
    v_contract_sum,
    v_gross_retainage,
    v_release_this_app,
    v_remaining_retainage,
    v_pre_0904_paid,
    v_receipt_amount,
    v_receipt_amount;
END $$;
