-- ============================================================
-- property_operational_intelligence
-- Utility bill tracking, materials inventory, and analytics
-- No existing tables modified.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE 1: property_utility_bills
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_utility_bills (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid          NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Utility type: 'electric' | 'water' | 'gas' | 'sewer' | 'trash' | 'internet' | 'other'
  utility_type        text          NOT NULL,

  -- Billing period
  bill_period_start   date          NOT NULL,
  bill_period_end     date          NOT NULL,
  bill_date           date,
  due_date            date,

  -- Financials
  amount              numeric(10,2) NOT NULL,
  amount_paid         numeric(10,2),
  paid_at             date,

  -- Consumption (optional but valuable for trending)
  consumption_value   numeric(10,2),
  consumption_unit    text,           -- 'kwh' | 'gallons' | 'therms' | 'ccf' | 'hcf'

  -- Provider
  provider_name       text,
  account_number      text,

  -- Document
  document_url        text,
  document_name       text,

  -- Flags
  notes               text,
  is_estimated        boolean       NOT NULL DEFAULT false,

  -- Status: 'pending' | 'paid' | 'disputed'
  status              text          NOT NULL DEFAULT 'pending',

  -- Metadata
  created_by          uuid          REFERENCES auth.users(id),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.property_utility_bills ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage bills for properties they own
CREATE POLICY "utility_bills_select" ON public.property_utility_bills
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "utility_bills_insert" ON public.property_utility_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "utility_bills_update" ON public.property_utility_bills
  FOR UPDATE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "utility_bills_delete" ON public.property_utility_bills
  FOR DELETE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

-- Fast date-range analytics
CREATE INDEX idx_utility_bills_property_period
  ON public.property_utility_bills (property_id, utility_type, bill_period_start);

-- updated_at trigger
CREATE TRIGGER update_utility_bills_updated_at
  BEFORE UPDATE ON public.property_utility_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- TABLE 2: property_inventory_items
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_inventory_items (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid          NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Item identification
  name                text          NOT NULL,
  sku                 text,
  -- 'hvac' | 'plumbing' | 'electrical' | 'cleaning' | 'grounds' |
  -- 'safety' | 'paint' | 'hardware' | 'general'
  category            text          NOT NULL DEFAULT 'general',
  description         text,
  unit_of_measure     text          NOT NULL DEFAULT 'each',

  -- Stock levels (maintained via trigger on inventory_transactions)
  current_quantity    numeric(10,2) NOT NULL DEFAULT 0,
  minimum_quantity    numeric(10,2)           DEFAULT 0,

  -- Cost tracking
  unit_cost           numeric(10,2),
  preferred_vendor    text,

  -- Location
  storage_location    text,

  -- Photo for field staff identification
  photo_url           text,

  is_active           boolean       NOT NULL DEFAULT true,

  created_by          uuid          REFERENCES auth.users(id),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.property_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select" ON public.property_inventory_items
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "inventory_items_insert" ON public.property_inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "inventory_items_update" ON public.property_inventory_items
  FOR UPDATE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "inventory_items_delete" ON public.property_inventory_items
  FOR DELETE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE INDEX idx_inventory_items_property
  ON public.property_inventory_items (property_id, category);

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.property_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- TABLE 3: inventory_transactions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id               uuid          NOT NULL REFERENCES public.property_inventory_items(id) ON DELETE CASCADE,
  property_id           uuid          NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- 'received' | 'used' | 'adjustment' | 'returned' | 'disposed'
  transaction_type      text          NOT NULL,

  -- positive = stock in, negative = stock out
  quantity              numeric(10,2) NOT NULL,
  quantity_after        numeric(10,2),   -- snapshot after this transaction (set by trigger)

  -- Cost
  unit_cost             numeric(10,2),
  total_cost            numeric(10,2),   -- ABS(quantity) * unit_cost (set by trigger)

  -- Cost allocation links
  linked_work_order_id  uuid,            -- FK to work_orders (soft reference — table may not exist yet)
  linked_project_id     uuid          REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Reference
  reference_number      text,
  vendor                text,
  notes                 text,

  transaction_date      date          NOT NULL DEFAULT CURRENT_DATE,

  created_by            uuid          REFERENCES auth.users(id),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_tx_select" ON public.inventory_transactions
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "inventory_tx_insert" ON public.inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "inventory_tx_update" ON public.inventory_transactions
  FOR UPDATE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "inventory_tx_delete" ON public.inventory_transactions
  FOR DELETE TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE created_by = auth.uid()
    )
  );

CREATE INDEX idx_inventory_tx_item     ON public.inventory_transactions (item_id, transaction_date);
CREATE INDEX idx_inventory_tx_property ON public.inventory_transactions (property_id, transaction_date);


-- ────────────────────────────────────────────────────────────
-- TRIGGER: Keep current_quantity in sync on every transaction
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_inventory_quantity()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity_after numeric(10,2);
BEGIN
  -- Update running total on the parent item
  UPDATE public.property_inventory_items
  SET
    current_quantity = current_quantity + NEW.quantity,
    updated_at       = now()
  WHERE id = NEW.item_id
  RETURNING current_quantity INTO v_quantity_after;

  -- Snapshot the post-transaction quantity
  NEW.quantity_after := v_quantity_after;

  -- Auto-compute total_cost
  IF NEW.unit_cost IS NOT NULL THEN
    NEW.total_cost := ABS(NEW.quantity) * NEW.unit_cost;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_inventory_transaction
  BEFORE INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_quantity();