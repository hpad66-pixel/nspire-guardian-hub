-- ─────────────────────────────────────────────────────────────────────────────
-- Subcontractor (commitment) payment allocations — split one payment to a sub
-- across the commitment base, a commitment change order (CCO), and/or specific
-- commitment SOV line items. Mirrors prime_payment_allocations (AR side).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commitment_payment_allocations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payment_id             uuid NOT NULL REFERENCES public.commitment_payments(id) ON DELETE CASCADE,
  kind                   text NOT NULL CHECK (kind IN ('base', 'change_order', 'line_item')),
  change_order_id        uuid REFERENCES public.change_orders(id) ON DELETE CASCADE,
  commitment_sov_line_id uuid REFERENCES public.commitment_sov_lines(id) ON DELETE CASCADE,
  amount                 numeric NOT NULL CHECK (amount > 0),
  note                   text,
  created_by             uuid,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commitment_payment_alloc_target_chk CHECK (
    (kind = 'base'         AND change_order_id IS NULL AND commitment_sov_line_id IS NULL) OR
    (kind = 'change_order' AND change_order_id IS NOT NULL AND commitment_sov_line_id IS NULL) OR
    (kind = 'line_item'    AND commitment_sov_line_id IS NOT NULL AND change_order_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_commitment_payment_allocations_payment
  ON public.commitment_payment_allocations(payment_id);

ALTER TABLE public.commitment_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commitment_payment_allocations_tenant_isolation ON public.commitment_payment_allocations;
CREATE POLICY commitment_payment_allocations_tenant_isolation ON public.commitment_payment_allocations
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Rule 8: polymorphic FKs → tenant-boundary trigger. Also caps total allocations
-- at the payment amount.
CREATE OR REPLACE FUNCTION public.guard_commitment_payment_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay_tenant uuid;
  pay_amount numeric;
  allocated  numeric;
  fk_tenant  uuid;
BEGIN
  SELECT tenant_id, amount INTO pay_tenant, pay_amount
  FROM public.commitment_payments WHERE id = NEW.payment_id;
  IF pay_tenant IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', NEW.payment_id;
  END IF;
  IF pay_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Allocation tenant does not match its payment';
  END IF;

  IF NEW.change_order_id IS NOT NULL THEN
    SELECT tenant_id INTO fk_tenant FROM public.change_orders WHERE id = NEW.change_order_id;
    IF fk_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Change order belongs to a different tenant';
    END IF;
  END IF;

  IF NEW.commitment_sov_line_id IS NOT NULL THEN
    SELECT tenant_id INTO fk_tenant FROM public.commitment_sov_lines WHERE id = NEW.commitment_sov_line_id;
    IF fk_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Line item belongs to a different tenant';
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO allocated
  FROM public.commitment_payment_allocations
  WHERE payment_id = NEW.payment_id AND id <> NEW.id;

  IF allocated + NEW.amount > pay_amount + 0.01 THEN
    RAISE EXCEPTION 'Allocations (% already + % new) exceed the payment amount %',
      round(allocated, 2), round(NEW.amount, 2), round(pay_amount, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_commitment_payment_allocation ON public.commitment_payment_allocations;
CREATE TRIGGER trg_guard_commitment_payment_allocation
  BEFORE INSERT OR UPDATE ON public.commitment_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_payment_allocation();
