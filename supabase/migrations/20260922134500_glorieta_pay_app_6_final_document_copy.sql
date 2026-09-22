-- Glorieta Sewer Extension Pay App #6 final document presentation metadata.
--
-- Presentation only: this does not change workflow status, approved amount,
-- submitted amount, receipts, or retainage held. It gives the PDF/app renderer
-- the labels needed for a FINAL paid reconciliation copy.

DO $$
DECLARE
  v_pay_app_6_id uuid := '1a0aaec0-c856-472d-b5a1-b9ac363ea5c0'::uuid;
  v_project_id uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.prime_contract_pay_apps pa
    JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
    WHERE pa.id = v_pay_app_6_id
      AND pc.project_id = v_project_id
  )
  INTO v_exists;

  IF NOT v_exists THEN
    RAISE NOTICE 'Pay App 6 % not found for Glorieta; skipping final document copy metadata', v_pay_app_6_id;
    RETURN;
  END IF;

  UPDATE public.prime_contract_pay_apps
  SET pay_app_data = COALESCE(pay_app_data, '{}'::jsonb)
        || jsonb_build_object(
          'final_document_copy', true,
          'payment_received_date', '2026-09-04',
          'certified_amount_this_application', COALESCE((pay_app_data->>'current_payment_due')::numeric, submitted_amount, 136680.65),
          'outstanding_this_application', COALESCE((pay_app_data->>'balance_still_due_this_app')::numeric, 0),
          'retainage_credit_basis_adjustment', -2678.69,
          'detail_positive_row_retainage_at_5_pct', 47783.92,
          'final_paid_note',
            'Final document copy only: certified amount is preserved, the 2026-09-04 receipt is shown separately, outstanding this application is $0, and remaining warranty retainage stays separate from payment due.'
        ),
      updated_at = now()
  WHERE id = v_pay_app_6_id;

  RAISE NOTICE 'Pay App 6 final document copy metadata applied without changing workflow status or payment amounts';
END $$;
