-- Approved change orders must roll up into the financials, not just 'executed' ones.
--
-- The app treats 'approved' and 'executed' as equivalent everywhere in code
-- (usePayAppContinuation APPROVED_CO_STATUSES = ['executed','approved'], useMargin,
-- the pay-app generator), but these four roll-up views counted ONLY status='executed'.
-- Result: a change order the user *approved* (e.g. the Ecotech CO) silently dropped
-- out of committed totals, revised contract/commitment value, the dashboard summary,
-- and the budget matrix. This aligns the SQL with the app: count CHANGE ORDERS with
-- status IN ('approved','executed'). Commitment status='executed' filters are left
-- as-is — 'executed' is the correct active state for commitments themselves.

-- 1) Per-project dashboard summary -------------------------------------------------
DROP VIEW IF EXISTS public.v_project_financial_summary;
CREATE VIEW public.v_project_financial_summary WITH (security_invoker = on) AS
WITH prime AS (
  SELECT project_id, tenant_id, SUM(original_value) AS original_contract
  FROM public.prime_contracts GROUP BY project_id, tenant_id
),
prime_co AS (
  SELECT project_id, SUM(amount) AS approved_co_value
  FROM public.change_orders
  WHERE prime_contract_id IS NOT NULL AND status IN ('approved','executed')
  GROUP BY project_id
),
billed AS (
  SELECT pc.project_id,
         SUM(COALESCE(pa.approved_amount, pa.submitted_amount, 0)) AS billed_to_date,
         SUM(COALESCE(pa.retainage_held, 0)) AS ar_retainage_held
  FROM public.prime_contract_pay_apps pa
  JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
  GROUP BY pc.project_id
),
received AS (
  SELECT pc.project_id, SUM(pp.amount) AS received_to_date
  FROM public.prime_contract_payments pp
  JOIN public.prime_contracts pc ON pc.id = pp.prime_contract_id
  GROUP BY pc.project_id
),
committed AS (
  SELECT project_id, SUM(original_value) AS committed_base
  FROM public.commitments GROUP BY project_id
),
commit_co AS (
  SELECT project_id, SUM(amount) AS committed_co
  FROM public.change_orders
  WHERE commitment_id IS NOT NULL AND status IN ('approved','executed')
  GROUP BY project_id
),
invoiced AS (
  SELECT cm.project_id,
         SUM(COALESCE(ci.approved_amount, ci.submitted_amount, 0)) AS commitment_invoiced,
         SUM(COALESCE(ci.retainage_held, 0)) AS ap_retainage_held
  FROM public.commitment_invoices ci
  JOIN public.commitments cm ON cm.id = ci.commitment_id
  GROUP BY cm.project_id
),
paid AS (
  SELECT cm.project_id, SUM(cp.amount) AS paid_to_subs
  FROM public.commitment_payments cp
  JOIN public.commitments cm ON cm.id = cp.commitment_id
  GROUP BY cm.project_id
)
SELECT
  prime.project_id,
  prime.tenant_id,
  COALESCE(prime.original_contract, 0)                              AS original_contract,
  COALESCE(prime_co.approved_co_value, 0)                          AS approved_co_value,
  COALESCE(prime.original_contract, 0) + COALESCE(prime_co.approved_co_value, 0) AS revised_contract,
  COALESCE(billed.billed_to_date, 0)                               AS billed_to_date,
  COALESCE(received.received_to_date, 0)                           AS received_to_date,
  COALESCE(billed.billed_to_date, 0) - COALESCE(received.received_to_date, 0) AS ar_outstanding,
  COALESCE(billed.ar_retainage_held, 0)                            AS ar_retainage_held,
  COALESCE(committed.committed_base, 0) + COALESCE(commit_co.committed_co, 0) AS committed_total,
  COALESCE(invoiced.commitment_invoiced, 0)                        AS commitment_invoiced,
  COALESCE(paid.paid_to_subs, 0)                                   AS paid_to_subs,
  COALESCE(invoiced.commitment_invoiced, 0) - COALESCE(paid.paid_to_subs, 0) AS ap_outstanding,
  COALESCE(invoiced.ap_retainage_held, 0)                          AS ap_retainage_held,
  COALESCE(received.received_to_date, 0) - COALESCE(paid.paid_to_subs, 0) AS net_cash_position
FROM prime
LEFT JOIN prime_co  ON prime_co.project_id  = prime.project_id
LEFT JOIN billed    ON billed.project_id    = prime.project_id
LEFT JOIN received  ON received.project_id  = prime.project_id
LEFT JOIN committed ON committed.project_id = prime.project_id
LEFT JOIN commit_co ON commit_co.project_id = prime.project_id
LEFT JOIN invoiced  ON invoiced.project_id  = prime.project_id
LEFT JOIN paid      ON paid.project_id      = prime.project_id;

-- 2) Prime contract totals ---------------------------------------------------------
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
  WHERE prime_contract_id IS NOT NULL AND status IN ('approved','executed')
  GROUP BY prime_contract_id
) co ON co.prime_contract_id = pc.id
LEFT JOIN (
  SELECT prime_contract_id, SUM(COALESCE(approved_amount, submitted_amount, 0)) AS billed_to_date
  FROM public.prime_contract_pay_apps
  GROUP BY prime_contract_id
) pa ON pa.prime_contract_id = pc.id;

-- 3) Commitment totals -------------------------------------------------------------
CREATE OR REPLACE VIEW public.commitment_totals AS
SELECT
  c.id AS commitment_id,
  c.original_value,
  COALESCE(SUM(CASE WHEN cco.status IN ('approved','executed') AND cco.co_type='CCO' THEN cco.amount END), 0) AS executed_cco_value,
  c.original_value + COALESCE(SUM(CASE WHEN cco.status IN ('approved','executed') AND cco.co_type='CCO' THEN cco.amount END), 0) AS revised_commitment_value,
  COALESCE(SUM(CASE WHEN ci.status='approved' THEN ci.approved_amount END), 0) AS billed_to_date
FROM public.commitments c
LEFT JOIN public.change_orders cco ON cco.commitment_id = c.id
LEFT JOIN public.commitment_invoices ci ON ci.commitment_id = c.id
GROUP BY c.id, c.original_value;

-- 4) Budget matrix (only the CCO change-order filter; commitment status stays 'executed') --
CREATE OR REPLACE VIEW public.budget_matrix AS
SELECT
  bl.project_budget_id,
  bl.cost_code_id,
  cc.code AS cost_code,
  cc.description AS cost_code_desc,
  bl.original_budget,
  COALESCE(bm_net.net_transfer, 0) AS approved_budget_mods,
  bl.original_budget + COALESCE(bm_net.net_transfer, 0) AS revised_budget,
  COALESCE(cs.committed_cost, 0) AS committed_cost,
  COALESCE(cs.executed_cco, 0) AS executed_cco,
  COALESCE(dc.direct_cost, 0) AS direct_cost,
  COALESCE(cev.pending_exposure, 0) AS pending_exposure,
  (COALESCE(cs.committed_cost, 0) + COALESCE(cs.executed_cco, 0)
   + COALESCE(dc.direct_cost, 0) + COALESCE(cev.pending_exposure, 0)) AS forecast_to_complete,
  (bl.original_budget + COALESCE(bm_net.net_transfer, 0))
   - (COALESCE(cs.committed_cost, 0) + COALESCE(cs.executed_cco, 0)
      + COALESCE(dc.direct_cost, 0) + COALESCE(cev.pending_exposure, 0)) AS variance
FROM public.budget_lines bl
JOIN public.cost_codes cc ON cc.id = bl.cost_code_id
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN bml.to_cost_code_id = bl.cost_code_id   THEN bml.amount ELSE 0 END) -
    SUM(CASE WHEN bml.from_cost_code_id = bl.cost_code_id THEN bml.amount ELSE 0 END) AS net_transfer
  FROM public.budget_modification_lines bml
  JOIN public.budget_modifications bm ON bm.id = bml.budget_modification_id
  WHERE bm.status = 'approved'
    AND bm.project_budget_id = bl.project_budget_id
) bm_net ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE((
      SELECT SUM(csl.scheduled_value)
      FROM public.commitment_sov_lines csl
      JOIN public.commitments c ON c.id = csl.commitment_id
      WHERE csl.cost_code_id = bl.cost_code_id
        AND c.status = 'executed'
        AND c.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
    ), 0) AS committed_cost,
    COALESCE((
      SELECT SUM(col.amount)
      FROM public.change_order_lines col
      JOIN public.change_orders co ON co.id = col.change_order_id
      WHERE col.cost_code_id = bl.cost_code_id
        AND co.co_type = 'CCO'
        AND co.status IN ('approved','executed')
        AND co.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
    ), 0) AS executed_cco
) cs ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(dcl.amount), 0) AS direct_cost
  FROM public.direct_cost_lines dcl
  JOIN public.direct_costs dc ON dc.id = dcl.direct_cost_id
  WHERE dcl.cost_code_id = bl.cost_code_id
    AND dc.status IN ('approved','paid')
    AND dc.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
) dc ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(cel.estimated_cost), 0) AS pending_exposure
  FROM public.change_event_lines cel
  JOIN public.change_events ce ON ce.id = cel.change_event_id
  WHERE cel.cost_code_id = bl.cost_code_id
    AND cel.status_bucket = 'pending'
    AND ce.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
) cev ON true;

GRANT SELECT ON public.v_project_financial_summary TO authenticated;
GRANT SELECT ON public.prime_contract_totals TO authenticated;
GRANT SELECT ON public.commitment_totals TO authenticated;
GRANT SELECT ON public.budget_matrix TO authenticated;
