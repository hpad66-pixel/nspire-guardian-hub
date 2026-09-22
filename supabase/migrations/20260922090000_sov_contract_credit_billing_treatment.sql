-- Contract-credit-only SOV lines.
--
-- Deductive owner change orders such as Glorieta PCO-0018 reduce G702 Line 2
-- and Line 3, but they are not negative completed work and must not create
-- negative retainage. This treatment lets the pay-app calculator distinguish a
-- contract credit from normal billable work.

ALTER TABLE public.sov_line_items
  ADD COLUMN IF NOT EXISTS billing_treatment text NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sov_line_items_billing_treatment_check'
      AND conrelid = 'public.sov_line_items'::regclass
  ) THEN
    ALTER TABLE public.sov_line_items
      ADD CONSTRAINT sov_line_items_billing_treatment_check
      CHECK (billing_treatment IN ('normal', 'contract_credit_only'));
  END IF;
END $$;

COMMENT ON COLUMN public.sov_line_items.billing_treatment IS
  'normal = scheduled value and progress both affect billing; contract_credit_only = scheduled value affects G702 Line 2/3 only and is excluded from completed work and retainage.';

-- Backfill existing deductive owner CO lines. The deleted-bollards credit and
-- Glorieta PCO-0018 style pipe credits should lower the contract, not lower
-- Column G completed work a second time.
UPDATE public.sov_line_items
SET billing_treatment = 'contract_credit_only',
    updated_at = now()
WHERE kind = 'change_order'
  AND scheduled_value < 0;

-- Contract-credit-only lines hold no retainage even if an old progress row had
-- inherited the contract default retainage percent.
UPDATE public.pay_app_line_progress p
SET retainage = 0,
    updated_at = now()
FROM public.sov_line_items li
WHERE li.id = p.sov_line_item_id
  AND li.billing_treatment = 'contract_credit_only'
  AND p.retainage IS DISTINCT FROM 0;

CREATE OR REPLACE VIEW public.v_sov_current_progress AS
SELECT DISTINCT ON (li.id)
  li.id AS sov_line_item_id,
  li.tenant_id, li.project_id, li.prime_contract_id,
  li.item_no, li.kind, li.change_order_id, li.cost_code_id, li.budget_code,
  li.description, li.unit, li.scheduled_qty, li.unit_price, li.scheduled_value,
  li.billing_treatment, li.sort_order,
  COALESCE(p.qty_to_date, 0)    AS qty_to_date,
  COALESCE(p.value_to_date, 0)  AS value_to_date,
  COALESCE(p.pct_complete, 0)   AS pct_complete,
  COALESCE(p.retainage, 0)      AS retainage,
  li.scheduled_qty   - COALESCE(p.qty_to_date, 0)   AS qty_remaining,
  li.scheduled_value - COALESCE(p.value_to_date, 0) AS value_remaining,
  pa.pay_app_no AS latest_pay_app_no
FROM public.sov_line_items li
LEFT JOIN public.pay_app_line_progress p ON p.sov_line_item_id = li.id
LEFT JOIN public.prime_contract_pay_apps pa ON pa.id = p.pay_app_id
ORDER BY li.id, pa.pay_app_no DESC NULLS LAST;

GRANT SELECT ON public.v_sov_current_progress TO authenticated;
