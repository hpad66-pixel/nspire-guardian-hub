-- Construction pay apps: first-class "final invoice" flag.
-- When set, the G702 PDF renders a FINAL INVOICE banner and Line 9 explains
-- that leftover quantities / credits will not be billed (project closing).

ALTER TABLE public.prime_contract_pay_apps
  ADD COLUMN IF NOT EXISTS is_final_invoice boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.prime_contract_pay_apps.is_final_invoice IS
  'When true, this Application for Payment is the final invoice — PDF shows FINAL INVOICE and Line 9 is worded as unbilled leftover (not to be finished/billed).';

-- Mark Glorieta / Sewer Extension Pay App #5 as the final invoice (already
-- cash-reconciled via prior migrations). Match by contract title so we do not
-- depend on a hard-coded UUID.
UPDATE public.prime_contract_pay_apps pa
SET
  is_final_invoice = true,
  pay_app_data = COALESCE(pa.pay_app_data, '{}'::jsonb)
    || jsonb_build_object(
      'is_final_invoice', true,
      'use_reconciled_snapshot', true
    )
FROM public.prime_contracts pc
WHERE pa.prime_contract_id = pc.id
  AND pa.pay_app_no = 5
  AND (
    pc.title ILIKE '%Sewer Extension%'
    OR pc.title ILIKE '%Conveyance%Close-Out%'
    OR pc.title ILIKE '%Opa-Locka%'
  );
