-- Glorieta Sewer Extension Pay App #6 retainage release.
--
-- Keep the audited SOV/G703 detail at gross 5% retainage on every positive,
-- billable line item. Separately release 50% of the accumulated gross
-- retainage on the draft final Pay App #6 and store gross / released /
-- remaining values in pay_app_data so the cover, PDF, and audit trail do not
-- blend the concepts.

DO $$
DECLARE
  v_pay_app_id uuid := '1a0aaec0-c856-472d-b5a1-b9ac363ea5c0'::uuid;
  v_project_id uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;
  v_pay_app public.prime_contract_pay_apps%ROWTYPE;
  v_contract public.prime_contracts%ROWTYPE;
  v_net_change_orders numeric(14,2);
  v_contract_sum_to_date numeric(14,2);
  v_completed_stored numeric(14,2);
  v_gross_retainage numeric(14,2);
  v_release_this_app numeric(14,2);
  v_remaining_retainage numeric(14,2);
  v_total_earned_less_retainage numeric(14,2);
  v_previous_certificates numeric(14,2);
  v_current_payment_due numeric(14,2);
  v_balance_to_finish numeric(14,2);
  v_existing_release numeric(14,2);
BEGIN
  SELECT *
  INTO v_pay_app
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Pay App % was not found in this database; skipping production data correction', v_pay_app_id;
    RETURN;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.prime_contracts
  WHERE id = v_pay_app.prime_contract_id
    AND project_id = v_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Pay App % is not tied to Sewer Extension project % in this database; skipping production data correction', v_pay_app_id, v_project_id;
    RETURN;
  END IF;

  IF v_pay_app.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Pay App % is %, not draft/submitted; refusing to rewrite certified history', v_pay_app_id, v_pay_app.status;
  END IF;

  SELECT round(COALESCE(SUM(COALESCE((pa.pay_app_data->>'retainage_released_this_app')::numeric, 0)), 0)::numeric, 2)
  INTO v_existing_release
  FROM public.prime_contract_pay_apps pa
  WHERE pa.prime_contract_id = v_contract.id
    AND pa.id <> v_pay_app_id
    AND pa.pay_app_no <= v_pay_app.pay_app_no;

  IF COALESCE(v_existing_release, 0) <> 0 THEN
    RAISE EXCEPTION 'Prior retainage release of % already exists on this contract; refusing to auto-release again', v_existing_release;
  END IF;

  -- Preserve the latest 5% line-level rule in case this migration is applied
  -- independently in another environment.
  UPDATE public.prime_contracts
  SET retainage_pct = 5.00,
      updated_at = now()
  WHERE id = v_contract.id
    AND retainage_pct IS DISTINCT FROM 5.00;

  UPDATE public.sov_line_items
  SET retainage_pct = CASE WHEN scheduled_value < 0 THEN 0 ELSE 5.00 END,
      billing_treatment = CASE WHEN scheduled_value < 0 THEN 'contract_credit_only' ELSE 'normal' END,
      updated_at = now()
  WHERE prime_contract_id = v_contract.id;

  UPDATE public.pay_app_line_progress p
  SET retainage = CASE
        WHEN COALESCE(li.billing_treatment, 'normal') = 'contract_credit_only'
          OR li.scheduled_value < 0
          OR p.value_to_date <= 0
        THEN 0
        ELSE round((p.value_to_date * 0.05)::numeric, 2)
      END,
      updated_at = now()
  FROM public.sov_line_items li
  WHERE p.pay_app_id = v_pay_app_id
    AND li.id = p.sov_line_item_id
    AND li.prime_contract_id = v_contract.id;

  SELECT
    round(COALESCE(SUM(CASE WHEN kind = 'change_order' THEN scheduled_value ELSE 0 END), 0)::numeric, 2),
    round(COALESCE(SUM(CASE
      WHEN COALESCE(billing_treatment, 'normal') <> 'contract_credit_only'
      THEN p.value_to_date
      ELSE 0
    END), 0)::numeric, 2),
    round(COALESCE(SUM(CASE
      WHEN COALESCE(billing_treatment, 'normal') <> 'contract_credit_only'
      THEN p.retainage
      ELSE 0
    END), 0)::numeric, 2)
  INTO v_net_change_orders, v_completed_stored, v_gross_retainage
  FROM public.sov_line_items li
  LEFT JOIN public.pay_app_line_progress p
    ON p.sov_line_item_id = li.id
   AND p.pay_app_id = v_pay_app_id
  WHERE li.prime_contract_id = v_contract.id;

  v_release_this_app := round((v_gross_retainage / 2.0)::numeric, 2);
  v_remaining_retainage := round((v_gross_retainage - v_release_this_app)::numeric, 2);
  v_contract_sum_to_date := round((v_contract.original_value + v_net_change_orders)::numeric, 2);
  v_total_earned_less_retainage := round((v_completed_stored - v_remaining_retainage)::numeric, 2);

  SELECT round(COALESCE(SUM(amount), 0)::numeric, 2)
  INTO v_previous_certificates
  FROM public.prime_contract_payments
  WHERE prime_contract_id = v_contract.id;

  v_previous_certificates := COALESCE(v_previous_certificates, 0);
  v_current_payment_due := round((v_total_earned_less_retainage - v_previous_certificates)::numeric, 2);
  v_balance_to_finish := round((v_contract_sum_to_date - v_completed_stored)::numeric, 2);

  UPDATE public.prime_contract_pay_apps
  SET retainage_held = v_remaining_retainage,
      submitted_amount = v_current_payment_due,
      approved_amount = CASE
        WHEN status IN ('approved', 'paid') THEN v_current_payment_due
        ELSE approved_amount
      END,
      is_final_invoice = true,
      pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
        || jsonb_build_object(
          'original_contract_sum', round(v_contract.original_value::numeric, 2),
          'net_change_orders', v_net_change_orders,
          'contract_sum_to_date', v_contract_sum_to_date,
          'completed_stored_to_date', v_completed_stored,
          'gross_retainage_at_5_pct', v_gross_retainage,
          'retainage_released_this_app', v_release_this_app,
          'retainage_released_to_date', v_release_this_app,
          'retainage_remaining_held', v_remaining_retainage,
          'retainage_total', v_remaining_retainage,
          'retainage_policy', 'Gross 5% on eligible positive SOV lines; negative contract-credit-only lines hold $0. Pay App 6 separately releases 50% of accumulated gross retainage.',
          'retainage_release_policy', '50% of total accumulated gross retainage released on final Pay App 6; remaining 50% continues to be held.',
          'total_earned_less_retainage', v_total_earned_less_retainage,
          'less_previous_certificates', v_previous_certificates,
          'cash_received_to_date', v_previous_certificates,
          'current_payment_due', v_current_payment_due,
          'amount_certified', v_current_payment_due,
          'balance_still_due_this_app', v_current_payment_due,
          'balance_to_finish', v_balance_to_finish,
          'is_final_invoice', true,
          'use_reconciled_snapshot', true,
          'retainage_release_reconciled_at', now(),
          'reconciliation_note',
            concat(
              'Final Pay App 6: gross retainage is 5% on every positive billable SOV line (',
              to_char(v_gross_retainage, 'FM$999,999,990.00'),
              '); negative contract-credit-only lines hold $0 retainage. ',
              'Released 50% of accumulated gross retainage (',
              to_char(v_release_this_app, 'FM$999,999,990.00'),
              '), leaving retainage held of ',
              to_char(v_remaining_retainage, 'FM$999,999,990.00'),
              '. Prior cash/certificate basis preserved at ',
              to_char(v_previous_certificates, 'FM$999,999,990.00'),
              '.'
            )
        )
  WHERE id = v_pay_app_id;

  RAISE NOTICE
    'Pay App % retainage release: gross %, released %, remaining %, completed %, previous %, current due %, balance %',
    v_pay_app_id,
    v_gross_retainage,
    v_release_this_app,
    v_remaining_retainage,
    v_completed_stored,
    v_previous_certificates,
    v_current_payment_due,
    v_balance_to_finish;
END $$;
