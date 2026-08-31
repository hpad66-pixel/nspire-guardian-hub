-- Re-align Pay App 5 Column I retainage to G702 Line 5 ($34,008.16).
--
-- Prior migration 20260831061000 only ran while status = 'draft'. Pay App 5 is
-- now approved/final, so that guard skipped and live line retainage still summed
-- ~$27,657.75 while the cover showed $34,008.16. Apply the same proportional
-- scale regardless of status so the DB sheet matches the certificate.

DO $$
DECLARE
  v_pay_app_id uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_target numeric := 34008.16;
  v_current numeric;
  v_scale numeric;
  v_allocated numeric := 0;
  v_last_id uuid;
  v_last_adj numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.prime_contract_pay_apps WHERE id = v_pay_app_id
  ) THEN
    RAISE NOTICE 'Pay App 5 % not found — skipping retainage align', v_pay_app_id;
    RETURN;
  END IF;

  SELECT COALESCE(round(SUM(retainage)::numeric, 2), 0)
    INTO v_current
  FROM public.pay_app_line_progress
  WHERE pay_app_id = v_pay_app_id;

  IF v_current <= 0 OR abs(v_current - v_target) < 0.02 THEN
    RAISE NOTICE 'Pay App 5 Column I already aligned (current=%)', v_current;
    -- Still keep cover fields in lockstep.
    UPDATE public.prime_contract_pay_apps
    SET
      retainage_held = v_target,
      pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
        || jsonb_build_object('retainage_total', v_target),
      updated_at = now()
    WHERE id = v_pay_app_id;
    RETURN;
  END IF;

  v_scale := v_target / v_current;

  UPDATE public.pay_app_line_progress p
  SET retainage = round((p.retainage * v_scale)::numeric, 2),
      updated_at = now()
  WHERE p.pay_app_id = v_pay_app_id
    AND p.retainage > 0;

  SELECT COALESCE(round(SUM(retainage)::numeric, 2), 0)
    INTO v_allocated
  FROM public.pay_app_line_progress
  WHERE pay_app_id = v_pay_app_id;

  IF abs(v_allocated - v_target) >= 0.01 THEN
    SELECT id INTO v_last_id
    FROM public.pay_app_line_progress
    WHERE pay_app_id = v_pay_app_id AND retainage > 0
    ORDER BY retainage DESC, id
    LIMIT 1;

    IF v_last_id IS NOT NULL THEN
      v_last_adj := round((v_target - v_allocated)::numeric, 2);
      UPDATE public.pay_app_line_progress
      SET retainage = round((retainage + v_last_adj)::numeric, 2),
          updated_at = now()
      WHERE id = v_last_id;
    END IF;
  END IF;

  UPDATE public.prime_contract_pay_apps
  SET
    retainage_held = v_target,
    pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
      || jsonb_build_object(
        'retainage_total', v_target,
        'retainage_pct_completed',
          CASE
            WHEN COALESCE((pay_app_data->>'completed_stored_to_date')::numeric, 0) > 0
            THEN round(
              (v_target / (pay_app_data->>'completed_stored_to_date')::numeric) * 100,
              2
            )
            ELSE 3.69
          END,
        'reconciliation_note',
          trim(
            both
            FROM COALESCE(pay_app_data->>'reconciliation_note', '')
              || ' Column I retainage re-aligned to G702 Line 5 ($34,008.16) after final-invoice status.'
          )
      ),
    updated_at = now()
  WHERE id = v_pay_app_id;

  RAISE NOTICE 'Pay App 5 Column I aligned: % → %', v_current, v_target;
END $$;
