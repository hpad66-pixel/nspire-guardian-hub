-- ============================================================
-- F0 · AP cash layer on the cascade.
-- commitment_payments = us → sub/vendor, recorded against a commitment invoice.
-- Hard rule: NO invoice → NO payment (NOT NULL FK).
-- Lien gate: payment blocked until an approved inbound lien release exists.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.commitment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  -- No invoice → no payment. RESTRICT keeps the cash trail intact.
  commitment_invoice_id uuid NOT NULL REFERENCES public.commitment_invoices(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_date date NOT NULL,
  method text CHECK (method IN ('check','ach','wire','card','other')),
  reference text,
  notes text,
  artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmtpay_invoice ON public.commitment_payments(commitment_invoice_id);
CREATE INDEX IF NOT EXISTS idx_cmtpay_commitment ON public.commitment_payments(commitment_id);

ALTER TABLE public.commitment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitment_payments_tenant_isolation ON public.commitment_payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER commitment_payments_updated_at
  BEFORE UPDATE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant-boundary trigger (rule 8).
CREATE OR REPLACE FUNCTION public.enforce_commitment_payment_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.commitment_invoices WHERE id = NEW.commitment_invoice_id;
  IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'commitment_invoice_id % is not in tenant %', NEW.commitment_invoice_id, NEW.tenant_id;
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

DROP TRIGGER IF EXISTS trg_commitment_payment_tenant ON public.commitment_payments;
CREATE TRIGGER trg_commitment_payment_tenant
  BEFORE INSERT OR UPDATE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commitment_payment_tenant();

-- Over-payment guard against the invoice ceiling.
CREATE OR REPLACE FUNCTION public.guard_commitment_payment_overpay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ceiling numeric(14,2);
  v_existing numeric(14,2);
BEGIN
  SELECT COALESCE(approved_amount, submitted_amount, 0) INTO v_ceiling
    FROM public.commitment_invoices WHERE id = NEW.commitment_invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_existing
    FROM public.commitment_payments
    WHERE commitment_invoice_id = NEW.commitment_invoice_id AND id <> NEW.id;
  IF (v_existing + NEW.amount) > v_ceiling THEN
    RAISE EXCEPTION 'OVERPAYMENT: payments (%) would exceed invoice ceiling (%)',
      v_existing + NEW.amount, v_ceiling;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_payment_overpay ON public.commitment_payments;
CREATE TRIGGER trg_commitment_payment_overpay
  BEFORE INSERT OR UPDATE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_payment_overpay();

-- Lien gate (rule 5): block unless an APPROVED inbound lien release exists on the
-- invoice. UI mirrors this in lib/financial/lien.ts; the DB is the hard guard.
CREATE OR REPLACE FUNCTION public.guard_commitment_payment_lien()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok int;
BEGIN
  SELECT COUNT(*) INTO v_ok
    FROM public.lien_releases lr
    WHERE lr.commitment_invoice_id = NEW.commitment_invoice_id
      AND lr.direction = 'inbound'
      AND lr.status = 'approved';
  IF v_ok = 0 THEN
    RAISE EXCEPTION 'LIEN_REQUIRED: invoice % has no approved inbound lien release',
      NEW.commitment_invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_payment_lien ON public.commitment_payments;
CREATE TRIGGER trg_commitment_payment_lien
  BEFORE INSERT ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_payment_lien();

-- Flip invoice to 'paid' when fully disbursed.
CREATE OR REPLACE FUNCTION public.sync_commitment_invoice_paid_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv uuid := COALESCE(NEW.commitment_invoice_id, OLD.commitment_invoice_id);
  v_ceiling numeric(14,2);
  v_paid numeric(14,2);
  v_status text;
BEGIN
  SELECT COALESCE(approved_amount, submitted_amount, 0), status
    INTO v_ceiling, v_status
    FROM public.commitment_invoices WHERE id = v_inv;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.commitment_payments WHERE commitment_invoice_id = v_inv;
  IF v_ceiling > 0 AND v_paid >= v_ceiling THEN
    UPDATE public.commitment_invoices SET status = 'paid' WHERE id = v_inv AND status <> 'paid';
  ELSIF v_status = 'paid' AND v_paid < v_ceiling THEN
    UPDATE public.commitment_invoices SET status = 'approved' WHERE id = v_inv;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_paid_status ON public.commitment_payments;
CREATE TRIGGER trg_commitment_invoice_paid_status
  AFTER INSERT OR UPDATE OR DELETE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_commitment_invoice_paid_status();
