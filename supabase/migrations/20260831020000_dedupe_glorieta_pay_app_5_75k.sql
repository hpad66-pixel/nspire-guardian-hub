-- Glorieta Pay App 5: the $75k interim was already on the ledger as an
-- unlabeled 2026-08-06 wire (9fffbe5b-...). The prior reconciliation
-- migration inserted INV-26-37 as a second $75k row, so contract cash
-- became $817,871.38 instead of $742,871.38 (Line 7 $667,871.38 + one $75k).
--
-- Keep the original 8/6 receipt, stamp it INV-26-37, and drop the extra row.
-- Fresh environments that only have the INV-26-37 insert are left alone.

DO $$
DECLARE
  v_pay_app uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_existing uuid := '9fffbe5b-8855-4407-83e5-6da1aa90d2b3';
  v_duplicate uuid := 'a75c0f5e-75a0-4b75-9c75-000000000075';
  v_existing_ok boolean := false;
  v_duplicate_ok boolean := false;
BEGIN
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
        || 'Certificate current due $219,332.82; remaining after this receipt $144,332.82. '
        || 'Received 2026-08-06 (same $75k as INV-26-37; duplicate row removed).',
      updated_at = now()
    WHERE id = v_existing;

    DELETE FROM public.prime_contract_payments
    WHERE id = v_duplicate
      AND prime_contract_id = v_contract
      AND amount = 75000;

    RAISE NOTICE 'Glorieta Pay App 5: removed duplicate $75k INV-26-37; stamped existing 8/6 receipt';
  ELSIF v_existing_ok THEN
    UPDATE public.prime_contract_payments
    SET
      reference = COALESCE(NULLIF(reference, ''), 'INV-26-37'),
      notes = COALESCE(
        NULLIF(notes, ''),
        'Interim release against Pay App 5 per 2026-07-29 progress meeting. '
          || 'Certificate current due $219,332.82; remaining after this receipt $144,332.82.'
      ),
      updated_at = now()
    WHERE id = v_existing
      AND (reference IS NULL OR reference = '' OR notes IS NULL OR notes = '');

    RAISE NOTICE 'Glorieta Pay App 5: existing 8/6 $75k receipt already present — no duplicate to remove';
  ELSE
    RAISE NOTICE 'Glorieta Pay App 5: unlabeled 8/6 $75k receipt not found — leaving INV-26-37 row in place';
  END IF;
END $$;
