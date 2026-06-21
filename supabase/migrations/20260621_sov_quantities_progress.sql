-- ============================================================
-- Quantity-based Schedule of Values + per-pay-app progress.
-- Mirrors the AIA G703 continuation sheet for unit-price prime
-- contracts: each line has a scheduled quantity + unit price, and
-- each pay application records quantity/value completed to date.
-- Powers the Quantities & Progress dashboard (base contract + COs).
--
-- NOTE on cost_code_id: rule 2 (financial cascade) wants a NOT NULL
-- cost_code_id. These rows are imported from G703 "budget codes" that
-- do not always map to a cost_code, so cost_code_id is nullable here
-- (this table feeds the progress dashboard, not the D6 budget matrix).
-- ============================================================

-- ── Scheduled line items (the G703 "C" column — constant per contract) ──
CREATE TABLE IF NOT EXISTS public.sov_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prime_contract_id uuid NOT NULL REFERENCES public.prime_contracts(id) ON DELETE CASCADE,
  item_no text NOT NULL,                         -- G703 item ("1".."16", "17"..)
  kind text NOT NULL DEFAULT 'base' CHECK (kind IN ('base','change_order')),
  change_order_id uuid REFERENCES public.change_orders(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id),   -- nullable (see note above)
  budget_code text,
  description text NOT NULL,
  unit text,                                     -- LF / EA / LS / TON …
  scheduled_qty numeric(14,4) NOT NULL DEFAULT 0,
  unit_price numeric(14,4) NOT NULL DEFAULT 0,
  scheduled_value numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prime_contract_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_sov_li_contract ON public.sov_line_items(prime_contract_id);
CREATE INDEX IF NOT EXISTS idx_sov_li_project ON public.sov_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_sov_li_co ON public.sov_line_items(change_order_id);

ALTER TABLE public.sov_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sov_line_items_tenant_isolation ON public.sov_line_items;
CREATE POLICY sov_line_items_tenant_isolation ON public.sov_line_items
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Per-pay-app progress per line (the G703 "G" column to-date) ──
CREATE TABLE IF NOT EXISTS public.pay_app_line_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pay_app_id uuid NOT NULL REFERENCES public.prime_contract_pay_apps(id) ON DELETE CASCADE,
  sov_line_item_id uuid NOT NULL REFERENCES public.sov_line_items(id) ON DELETE CASCADE,
  qty_to_date numeric(14,4) NOT NULL DEFAULT 0,
  value_to_date numeric(14,2) NOT NULL DEFAULT 0,
  pct_complete numeric(6,2) NOT NULL DEFAULT 0,         -- G / C
  qty_this_period numeric(14,4) NOT NULL DEFAULT 0,
  value_this_period numeric(14,2) NOT NULL DEFAULT 0,
  retainage numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pay_app_id, sov_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_palp_payapp ON public.pay_app_line_progress(pay_app_id);
CREATE INDEX IF NOT EXISTS idx_palp_line ON public.pay_app_line_progress(sov_line_item_id);

ALTER TABLE public.pay_app_line_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pay_app_line_progress_tenant_isolation ON public.pay_app_line_progress;
CREATE POLICY pay_app_line_progress_tenant_isolation ON public.pay_app_line_progress
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Current progress = each line's latest pay-app snapshot (auto-updates
--    when a newer pay app is added). Drives the dashboard. ──
CREATE OR REPLACE VIEW public.v_sov_current_progress AS
SELECT DISTINCT ON (li.id)
  li.id AS sov_line_item_id,
  li.tenant_id, li.project_id, li.prime_contract_id,
  li.item_no, li.kind, li.change_order_id, li.cost_code_id, li.budget_code,
  li.description, li.unit, li.scheduled_qty, li.unit_price, li.scheduled_value, li.sort_order,
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
