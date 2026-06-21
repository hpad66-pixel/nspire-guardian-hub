-- ============================================================
-- Quantity-aware line items for a change order (the priced rows on
-- the signed CO proposal). Powers the per-CO drill-down on the
-- Quantities & Progress dashboard. Distinct from change_order_lines
-- (D4, cost-code + amount only) — this carries qty / unit / unit price.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 0,
  description text NOT NULL,
  unit text,
  qty numeric(14,4) NOT NULL DEFAULT 0,
  unit_price numeric(14,4) NOT NULL DEFAULT 0,
  extended_value numeric(14,2) NOT NULL DEFAULT 0,
  basis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (change_order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_coli_co ON public.change_order_line_items(change_order_id);

ALTER TABLE public.change_order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS change_order_line_items_tenant_isolation ON public.change_order_line_items;
CREATE POLICY change_order_line_items_tenant_isolation ON public.change_order_line_items
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
