-- ============================================================
-- F0 · AR cash layer on the cost-code cascade.
-- prime_contract_payments = owner → us, recorded against a pay app.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prime_contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prime_contract_id uuid NOT NULL REFERENCES public.prime_contracts(id) ON DELETE CASCADE,
  -- A receipt must attach to a specific pay app (RESTRICT: keep the cash trail).
  pay_app_id uuid NOT NULL REFERENCES public.prime_contract_pay_apps(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  received_date date NOT NULL,
  method text CHECK (method IN ('check','ach','wire','card','other')),
  reference text,
  notes text,
  artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcp_pay_app ON public.prime_contract_payments(pay_app_id);
CREATE INDEX IF NOT EXISTS idx_pcp_contract ON public.prime_contract_payments(prime_contract_id);

ALTER TABLE public.prime_contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY prime_contract_payments_tenant_isolation ON public.prime_contract_payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER prime_contract_payments_updated_at
  BEFORE UPDATE ON public.prime_contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant-boundary trigger (rule 8): pay_app_id + artifact_id must be same tenant.
CREATE OR REPLACE FUNCTION public.enforce_prime_payment_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.prime_contract_pay_apps WHERE id = NEW.pay_app_id;
  IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'pay_app_id % is not in tenant %', NEW.pay_app_id, NEW.tenant_id;
  END IF;
  IF NEW.artifact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.project_artifacts WHERE id = NEW.artifact_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'artifact_id % is not in tenant %', NEW.artifact_id, NEW.tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prime_payment_tenant ON public.prime_contract_payments;
CREATE TRIGGER trg_prime_payment_tenant
  BEFORE INSERT OR UPDATE ON public.prime_contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prime_payment_tenant();

-- Over-payment guard: Σ payments ≤ approved_amount (or submitted_amount pre-approval).
CREATE OR REPLACE FUNCTION public.guard_prime_payment_overpay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ceiling numeric(14,2);
  v_existing numeric(14,2);
BEGIN
  SELECT COALESCE(approved_amount, submitted_amount, 0) INTO v_ceiling
    FROM public.prime_contract_pay_apps WHERE id = NEW.pay_app_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_existing
    FROM public.prime_contract_payments
    WHERE pay_app_id = NEW.pay_app_id AND id <> NEW.id;
  IF (v_existing + NEW.amount) > v_ceiling THEN
    RAISE EXCEPTION 'OVERPAYMENT: payments (%) would exceed pay app ceiling (%)',
      v_existing + NEW.amount, v_ceiling;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prime_payment_overpay ON public.prime_contract_payments;
CREATE TRIGGER trg_prime_payment_overpay
  BEFORE INSERT OR UPDATE ON public.prime_contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_prime_payment_overpay();

-- When a pay app is fully received, flip it to 'paid'; else leave as-is.
CREATE OR REPLACE FUNCTION public.sync_pay_app_paid_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pay_app uuid := COALESCE(NEW.pay_app_id, OLD.pay_app_id);
  v_ceiling numeric(14,2);
  v_paid numeric(14,2);
  v_status text;
BEGIN
  SELECT COALESCE(approved_amount, submitted_amount, 0), status
    INTO v_ceiling, v_status
    FROM public.prime_contract_pay_apps WHERE id = v_pay_app;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.prime_contract_payments WHERE pay_app_id = v_pay_app;
  IF v_ceiling > 0 AND v_paid >= v_ceiling THEN
    UPDATE public.prime_contract_pay_apps SET status = 'paid' WHERE id = v_pay_app AND status <> 'paid';
  ELSIF v_status = 'paid' AND v_paid < v_ceiling THEN
    -- payment removed → revert from paid to approved
    UPDATE public.prime_contract_pay_apps SET status = 'approved' WHERE id = v_pay_app;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay_app_paid_status ON public.prime_contract_payments;
CREATE TRIGGER trg_pay_app_paid_status
  AFTER INSERT OR UPDATE OR DELETE ON public.prime_contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_pay_app_paid_status();
