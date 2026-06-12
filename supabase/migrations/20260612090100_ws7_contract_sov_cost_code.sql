-- ============================================================
-- WS-7 · #2 · contract_sov_items.cost_code_id (CLAUDE.md rule 2).
-- ============================================================
-- Financial SOV / line tables carry cost_code_id so the D6 Budget matrix
-- can aggregate by cost code. contract_sov_items shipped without it
-- (20260611_project_contracts.sql). Add it as a nullable FK — no backfill;
-- existing rows keep their free-text budget_code and a null cost_code_id
-- until a user maps them in the contract SOV form.
--
-- NOTE: the D6 budget_matrix view (20260421190006_d6_budget.sql) does NOT
-- currently read contract_sov_items — it aggregates committed cost from
-- commitments, executed CCOs from change_orders, direct costs, and pending
-- exposure from change_events. So contract SOV does not yet roll into
-- Budget. This migration only adds the column to honor the convention and
-- capture the linkage; wiring contracts into the matrix is intentionally
-- left out of scope (called out in the PR).
-- ============================================================

ALTER TABLE public.contract_sov_items
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id);

CREATE INDEX IF NOT EXISTS idx_contract_sov_items_cost_code
  ON public.contract_sov_items(cost_code_id);
