-- Cap Glorieta PC-01 SOV items #30 and #32 that show Over 100%.
--
-- Cause: pay-app progress was billed at the imported G703 amounts
--   #30 Street Sweeper (PCO-014): $1,870
--   #32 Road Cavity / Sinkhole (PCO-013): $9,600
-- then "Load approved change orders" synced scheduled_value down to the
-- executed CO amounts ($1,710 and $8,400). value_to_date stayed high, so the
-- continuation sheet flagged Over 100% even though qty_to_date = scheduled_qty.
--
-- Fix: clamp value_to_date (and retainage / pct) to the current scheduled_value
-- on every pay_app_line_progress row for those lines. Also re-derive pct_complete
-- for any other Glorieta SOV progress rows whose stored % drifted from
-- value_to_date / scheduled_value.

DO $$
DECLARE
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_pay_app uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
BEGIN
  -- Cap overbilled progress to the CO-synced scheduled value.
  UPDATE public.pay_app_line_progress p
  SET
    value_this_period = GREATEST(
      0::numeric,
      round((p.value_this_period - (p.value_to_date - li.scheduled_value))::numeric, 2)
    ),
    retainage = round(
      li.scheduled_value
        * (CASE WHEN p.value_to_date = 0 THEN 0 ELSE p.retainage / p.value_to_date END)
    , 2),
    value_to_date = li.scheduled_value,
    pct_complete = CASE WHEN li.scheduled_value = 0 THEN 0 ELSE 100 END,
    updated_at = now()
  FROM public.sov_line_items li
  WHERE p.sov_line_item_id = li.id
    AND li.prime_contract_id = v_contract
    AND li.item_no IN ('30', '32')
    AND p.value_to_date > li.scheduled_value + 0.01;

  -- Re-derive % complete from value/scheduled for every Glorieta progress row
  -- (fixes stale 100% on under-billed lines like #31 sod as well).
  UPDATE public.pay_app_line_progress p
  SET
    pct_complete = CASE
      WHEN li.scheduled_value = 0 THEN 0
      ELSE round((p.value_to_date / li.scheduled_value) * 100, 2)
    END,
    updated_at = now()
  FROM public.sov_line_items li
  WHERE p.sov_line_item_id = li.id
    AND li.prime_contract_id = v_contract
    AND abs(
      p.pct_complete
      - CASE
          WHEN li.scheduled_value = 0 THEN 0
          ELSE round((p.value_to_date / li.scheduled_value) * 100, 2)
        END
    ) > 0.005;

  -- Clarify the Pay App 5 reconciliation note: the $160 sweeper gap is closed
  -- by billing at the executed PCO-014 amount ($1,710), not the imported $1,870.
  UPDATE public.prime_contract_pay_apps
  SET
    pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
      || jsonb_build_object(
        'reconciliation_note',
          'Line 7 is actual R4→APAS cash through Chris 7/23 figure ($667,871.38). '
          || '$75,000 INV-26-37 interim is recorded as a payment against this app. '
          || 'Remaining due = $144,332.82. Net CO uses executed PCO amounts '
          || '($430,289.35 workbook). SOV items #30 (PCO-014) and #32 (PCO-013) '
          || 'are capped at the executed CO amounts so G703 % cannot exceed 100%.',
        'sov_overbill_capped',
          jsonb_build_array(
            jsonb_build_object('item_no', '30', 'pco', '014', 'scheduled', 1710, 'was_billed', 1870),
            jsonb_build_object('item_no', '32', 'pco', '013', 'scheduled', 8400, 'was_billed', 9600)
          )
      ),
    updated_at = now()
  WHERE id = v_pay_app
    AND status = 'draft';
END $$;
