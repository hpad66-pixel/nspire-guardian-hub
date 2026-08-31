-- Glorieta Pay App #5 — Line 9 true unbuilt delta + restore item #32 to $9,600.
--
-- 1) FINAL invoice Line 9 must be Line 3 − Line 4 (contract − completed) =
--    the true unbuilt leftover. The prior snapshot stored the AIA
--    "balance to finish including retainage" (Line 3 − Line 6), which is
--    unbuilt + retainage and looked like $66,146.15 instead of ~$32,137.99.
-- 2) Item #32 was capped at executed CO $8,400; restore imported G703 $9,600
--    on SOV + this pay app's progress + the linked change order so admins can
--    reload the cover from SOV without fighting the overbill guard.

DO $$
DECLARE
  v_pay_app uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_tenant uuid;
  v_sov32 uuid;
  v_co32 uuid;
  v_old_sched numeric := 0;
  v_old_billed numeric := 0;
  v_old_ret numeric := 0;
  v_rate numeric := 0;
  v_data jsonb;
  v_contract_sum numeric;
  v_completed numeric;
  v_line9 numeric;
  v_prog_found boolean := false;
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app AND prime_contract_id = v_contract;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'Glorieta Pay App 5 not found — skipping Line 9 / item 32 fix';
    RETURN;
  END IF;

  -- ── Item #32 → $9,600 (SOV + progress + CO) ───────────────────────────────
  SELECT id, change_order_id, scheduled_value
    INTO v_sov32, v_co32, v_old_sched
  FROM public.sov_line_items
  WHERE prime_contract_id = v_contract
    AND item_no = '32'
  LIMIT 1;

  IF v_sov32 IS NOT NULL THEN
    SELECT COALESCE(retainage, 0), COALESCE(value_to_date, 0)
      INTO v_old_ret, v_old_billed
    FROM public.pay_app_line_progress
    WHERE pay_app_id = v_pay_app AND sov_line_item_id = v_sov32;
    v_prog_found := FOUND;

    IF v_prog_found AND COALESCE(v_old_billed, 0) > 0 AND v_old_ret > 0 THEN
      v_rate := v_old_ret / v_old_billed;
    ELSIF COALESCE(v_old_sched, 0) > 0 AND v_old_ret > 0 THEN
      v_rate := v_old_ret / v_old_sched;
    ELSE
      v_rate := 0.03; -- contract default-ish; line may be exempt
    END IF;

    UPDATE public.sov_line_items
    SET
      scheduled_value = 9600.00,
      unit_price = 9600.00,
      scheduled_qty = 1,
      updated_at = now()
    WHERE id = v_sov32;

    UPDATE public.pay_app_line_progress
    SET
      value_to_date = 9600.00,
      value_this_period = 9600.00,
      qty_to_date = 1,
      qty_this_period = 1,
      pct_complete = 100,
      retainage = ROUND(9600.00 * v_rate, 2),
      updated_at = now()
    WHERE pay_app_id = v_pay_app
      AND sov_line_item_id = v_sov32;

    IF v_co32 IS NOT NULL THEN
      UPDATE public.change_orders
      SET amount = 9600.00, updated_at = now()
      WHERE id = v_co32;
    END IF;

    RAISE NOTICE 'Glorieta item #32 restored to $9,600 (was sched % / billed %)', v_old_sched, v_old_billed;
  ELSE
    RAISE NOTICE 'Glorieta SOV item #32 not found — Line 9 still corrected';
  END IF;

  -- ── Fix Line 9 on the pinned cover (do not invent new contract/completed) ─
  SELECT pay_app_data INTO v_data
  FROM public.prime_contract_pay_apps
  WHERE id = v_pay_app;

  IF v_data IS NULL THEN
    RAISE NOTICE 'Pay App 5 has no pay_app_data — skipping Line 9 rewrite';
    RETURN;
  END IF;

  v_contract_sum := COALESCE((v_data->>'contract_sum_to_date')::numeric, 953350.35);
  v_completed := COALESCE((v_data->>'completed_stored_to_date')::numeric, 921212.36);
  -- FINAL Line 9 = contract − completed (true unbuilt).
  v_line9 := ROUND(v_contract_sum - v_completed, 2);

  UPDATE public.prime_contract_pay_apps
  SET
    is_final_invoice = true,
    pay_app_data = v_data
      || jsonb_build_object(
        'balance_to_finish', v_line9,
        'use_reconciled_snapshot', true,
        'is_final_invoice', true,
        'reconciliation_note',
          COALESCE(v_data->>'reconciliation_note', '')
          || ' Line 9 corrected to Line 3 − Line 4 (unbuilt) $'
          || to_char(v_line9, 'FM999999990.00')
          || ' (was AIA Line 3 − Line 6 which bundled retainage). '
          || 'Item #32 SOV restored to $9,600 — use Admin → Reload cover from SOV '
          || 'if the cover totals should re-sum from the live Schedule of Values.'
      ),
    updated_at = now()
  WHERE id = v_pay_app;

  RAISE NOTICE 'Pay App 5 Line 9 (unbuilt) set to % (= % − %)',
    v_line9, v_contract_sum, v_completed;
END $$;
