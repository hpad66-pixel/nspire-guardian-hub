-- ============================================================
-- D4 · Change Orders — PCO / OCO / CCO.
-- ALTERs existing public.change_orders to add Procore Lite columns.
-- ============================================================

-- The existing change_orders.status column uses the `change_order_status` enum
-- which only has draft/pending/approved/rejected. Procore Lite needs
-- executed, out_for_signature, void. Convert the column to text so
-- we can use the full spec status set via a CHECK constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders'
      AND column_name = 'status' AND udt_name = 'change_order_status'
  ) THEN
    ALTER TABLE public.change_orders
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE text USING status::text,
      ALTER COLUMN status SET DEFAULT 'draft';
  END IF;
END $$;

-- Add the expanded status CHECK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'change_orders_status_check_v2'
  ) THEN
    ALTER TABLE public.change_orders
      ADD CONSTRAINT change_orders_status_check_v2
      CHECK (status IN ('draft','pending','out_for_signature','executed','approved','rejected','void'));
  END IF;
END $$;

-- Extend the existing change_orders table
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS co_no int,
  ADD COLUMN IF NOT EXISTS co_type text
    CHECK (co_type IN ('PCO','OCO','CCO')),
  ADD COLUMN IF NOT EXISTS prime_contract_id uuid REFERENCES public.prime_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS days_impact int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS parent_pco_id uuid REFERENCES public.change_orders(id),
  ADD COLUMN IF NOT EXISTS peer_co_id uuid REFERENCES public.change_orders(id),
  ADD COLUMN IF NOT EXISTS executed_date date,
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid REFERENCES public.workflow_instances(id);

-- Composite unique per (project, co_type, co_no) for Procore Lite rows (co_type NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_co_project_type_no
  ON public.change_orders(project_id, co_type, co_no)
  WHERE co_type IS NOT NULL;

-- Type/link consistency: PCO/OCO → prime_contract_id, CCO → commitment_id
CREATE OR REPLACE FUNCTION public.validate_co_type_link()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.co_type IS NULL THEN RETURN NEW; END IF;
  IF NEW.co_type IN ('PCO','OCO') THEN
    IF NEW.prime_contract_id IS NULL OR NEW.commitment_id IS NOT NULL THEN
      RAISE EXCEPTION '% must have prime_contract_id and no commitment_id', NEW.co_type;
    END IF;
  ELSIF NEW.co_type = 'CCO' THEN
    IF NEW.commitment_id IS NULL OR NEW.prime_contract_id IS NOT NULL THEN
      RAISE EXCEPTION 'CCO must have commitment_id and no prime_contract_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_validate_link ON public.change_orders;
CREATE TRIGGER trg_co_validate_link
  BEFORE INSERT OR UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_co_type_link();

-- Auto-increment co_no per (project, co_type)
CREATE OR REPLACE FUNCTION public.assign_co_no()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.co_no IS NULL AND NEW.co_type IS NOT NULL THEN
    NEW.co_no := COALESCE(
      (SELECT MAX(co_no) FROM public.change_orders
        WHERE project_id = NEW.project_id AND co_type = NEW.co_type),
      0
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_assign_no ON public.change_orders;
CREATE TRIGGER trg_co_assign_no
  BEFORE INSERT ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_co_no();

-- OCO paired to CCO: CCO amount must be ≤ OCO amount
CREATE OR REPLACE FUNCTION public.validate_oco_cco_pair()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_oco_amount numeric(14,2);
BEGIN
  IF NEW.co_type = 'OCO' AND NEW.peer_co_id IS NOT NULL THEN
    SELECT amount INTO v_oco_amount FROM public.change_orders WHERE id = NEW.peer_co_id AND co_type = 'CCO';
    IF v_oco_amount IS NOT NULL AND v_oco_amount > NEW.amount THEN
      RAISE EXCEPTION 'Peer CCO amount (%) exceeds OCO amount (%)', v_oco_amount, NEW.amount;
    END IF;
  ELSIF NEW.co_type = 'CCO' AND NEW.peer_co_id IS NOT NULL THEN
    SELECT amount INTO v_oco_amount FROM public.change_orders WHERE id = NEW.peer_co_id AND co_type = 'OCO';
    IF v_oco_amount IS NOT NULL AND NEW.amount > v_oco_amount THEN
      RAISE EXCEPTION 'CCO amount (%) exceeds paired OCO amount (%)', NEW.amount, v_oco_amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_validate_pair ON public.change_orders;
CREATE TRIGGER trg_co_validate_pair
  BEFORE INSERT OR UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_oco_cco_pair();

-- Line grid for CO (cost-code-keyed; feeds Budget)
CREATE TABLE IF NOT EXISTS public.change_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  description text NOT NULL,
  amount numeric(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_col_co ON public.change_order_lines(change_order_id);
CREATE INDEX IF NOT EXISTS idx_col_cost_code ON public.change_order_lines(cost_code_id);

ALTER TABLE public.change_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY col_tenant ON public.change_order_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Validator: line total MUST equal header amount (when any lines exist)
CREATE OR REPLACE FUNCTION public.validate_co_lines_total()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_line_total numeric(14,2);
  v_co_amount numeric(14,2);
  v_co_status text;
BEGIN
  SELECT amount, status INTO v_co_amount, v_co_status
    FROM public.change_orders
    WHERE id = COALESCE(NEW.change_order_id, OLD.change_order_id);
  IF v_co_status = 'executed' THEN
    RAISE EXCEPTION 'Cannot modify lines on an executed change order';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_line_total
    FROM public.change_order_lines
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);
  -- Informational only at line-change time; hard check happens when CO transitions to 'executed'
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_col_validate ON public.change_order_lines;
CREATE TRIGGER trg_col_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.change_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.validate_co_lines_total();

-- On CO execute: enforce line total == header amount
CREATE OR REPLACE FUNCTION public.validate_co_execute()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_line_total numeric(14,2);
BEGIN
  IF NEW.status = 'executed' AND (OLD.status IS DISTINCT FROM 'executed') THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_line_total
      FROM public.change_order_lines
      WHERE change_order_id = NEW.id;
    IF v_line_total > 0 AND v_line_total <> NEW.amount THEN
      RAISE EXCEPTION 'CO line total (%) must equal header amount (%)', v_line_total, NEW.amount;
    END IF;
    IF NEW.executed_date IS NULL THEN
      NEW.executed_date := current_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_validate_execute ON public.change_orders;
CREATE TRIGGER trg_co_validate_execute
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_co_execute();

-- Now that change_orders exists with the right shape, wire the FK from D3.change_event_lines.pco_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'change_event_lines_pco_id_fkey'
  ) THEN
    ALTER TABLE public.change_event_lines
      ADD CONSTRAINT change_event_lines_pco_id_fkey
      FOREIGN KEY (pco_id) REFERENCES public.change_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Derived views for Budget + contract totals
CREATE OR REPLACE VIEW public.prime_contract_totals AS
SELECT
  pc.id AS prime_contract_id,
  pc.original_value,
  COALESCE(SUM(CASE WHEN oco.status='executed' AND oco.co_type='OCO' THEN oco.amount END), 0) AS executed_co_value,
  pc.original_value + COALESCE(SUM(CASE WHEN oco.status='executed' AND oco.co_type='OCO' THEN oco.amount END), 0) AS revised_contract_value,
  COALESCE(SUM(CASE WHEN pa.status='approved' THEN pa.approved_amount END), 0) AS billed_to_date
FROM public.prime_contracts pc
LEFT JOIN public.change_orders oco ON oco.prime_contract_id = pc.id
LEFT JOIN public.prime_contract_pay_apps pa ON pa.prime_contract_id = pc.id
GROUP BY pc.id, pc.original_value;

CREATE OR REPLACE VIEW public.commitment_totals AS
SELECT
  c.id AS commitment_id,
  c.original_value,
  COALESCE(SUM(CASE WHEN cco.status='executed' AND cco.co_type='CCO' THEN cco.amount END), 0) AS executed_cco_value,
  c.original_value + COALESCE(SUM(CASE WHEN cco.status='executed' AND cco.co_type='CCO' THEN cco.amount END), 0) AS revised_commitment_value,
  COALESCE(SUM(CASE WHEN ci.status='approved' THEN ci.approved_amount END), 0) AS billed_to_date
FROM public.commitments c
LEFT JOIN public.change_orders cco ON cco.commitment_id = c.id
LEFT JOIN public.commitment_invoices ci ON ci.commitment_id = c.id
GROUP BY c.id, c.original_value;

GRANT SELECT ON public.prime_contract_totals TO authenticated;
GRANT SELECT ON public.commitment_totals TO authenticated;
