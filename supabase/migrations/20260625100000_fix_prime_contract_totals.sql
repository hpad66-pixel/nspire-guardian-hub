-- Fix prime_contract_totals: the Prime Contract summary page read this view and
-- showed Revised = base / Exec COs = $0, because:
--   1) it summed only co_type='OCO' executed COs, but prime change orders are 'PCO';
--   2) it LEFT JOINed change_orders AND pay_apps in one query, so once the CO filter
--      matched, the CO sum would be multiplied by the pay-app row count (cartesian).
-- Rewritten to mirror v_project_financial_summary: any executed CO linked to the
-- prime contract counts, and CO vs pay-app sums are computed in separate subqueries.
CREATE OR REPLACE VIEW public.prime_contract_totals AS
SELECT
  pc.id                                              AS prime_contract_id,
  pc.original_value,
  COALESCE(co.executed_co_value, 0)                  AS executed_co_value,
  pc.original_value + COALESCE(co.executed_co_value, 0) AS revised_contract_value,
  COALESCE(pa.billed_to_date, 0)                     AS billed_to_date
FROM public.prime_contracts pc
LEFT JOIN (
  SELECT prime_contract_id, SUM(amount) AS executed_co_value
  FROM public.change_orders
  WHERE prime_contract_id IS NOT NULL AND status = 'executed'
  GROUP BY prime_contract_id
) co ON co.prime_contract_id = pc.id
LEFT JOIN (
  SELECT prime_contract_id, SUM(COALESCE(approved_amount, submitted_amount, 0)) AS billed_to_date
  FROM public.prime_contract_pay_apps
  GROUP BY prime_contract_id
) pa ON pa.prime_contract_id = pc.id;

GRANT SELECT ON public.prime_contract_totals TO authenticated;
