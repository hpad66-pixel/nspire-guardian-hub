-- ============================================================
-- D2 · Commitments (Subcontracts + Purchase Orders)
-- Each commitment has an SOV + invoice stream; rolls up into Budget.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commitment_type text NOT NULL CHECK (commitment_type IN ('subcontract','purchase_order')),
  commitment_no text NOT NULL,
  title text NOT NULL,
  vendor_org_id uuid REFERENCES public.organizations(id),
  executed_date date,
  original_value numeric(14,2) NOT NULL DEFAULT 0,
  retainage_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','out_for_signature','executed','closed','terminated','void')),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, commitment_no)
);

CREATE INDEX IF NOT EXISTS idx_commitments_project ON public.commitments(project_id);
CREATE INDEX IF NOT EXISTS idx_commitments_vendor ON public.commitments(vendor_org_id);

CREATE TABLE IF NOT EXISTS public.commitment_sov_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  description text NOT NULL,
  scheduled_value numeric(14,2) NOT NULL,
  UNIQUE (commitment_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_csl_cost_code ON public.commitment_sov_lines(cost_code_id);

CREATE TABLE IF NOT EXISTS public.commitment_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  invoice_no text NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','paid','rejected')),
  submitted_amount numeric(14,2),
  approved_amount numeric(14,2),
  retainage_held numeric(14,2),
  rejection_comment text,
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commitment_id, invoice_no)
);

CREATE TABLE IF NOT EXISTS public.commitment_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.commitment_invoices(id) ON DELETE CASCADE,
  sov_line_id uuid NOT NULL REFERENCES public.commitment_sov_lines(id),
  work_this_period numeric(14,2) NOT NULL DEFAULT 0,
  materials_stored numeric(14,2) NOT NULL DEFAULT 0,
  pct_complete numeric(5,2),
  UNIQUE (invoice_id, sov_line_id)
);

-- RLS
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmt_tenant ON public.commitments FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY csl_tenant ON public.commitment_sov_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY ci_tenant ON public.commitment_invoices FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY cil_via_inv ON public.commitment_invoice_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commitment_invoices ci
                 WHERE ci.id = commitment_invoice_lines.invoice_id
                 AND (ci.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.commitment_invoices ci
                      WHERE ci.id = commitment_invoice_lines.invoice_id
                      AND (ci.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

-- Validator: subcontract SOV total must match original_value on execute.
-- POs with a single line equal to original_value are exempted.
CREATE OR REPLACE FUNCTION public.validate_commitment_sov()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total numeric(14,2);
  v_line_count int;
BEGIN
  IF NEW.status = 'executed' AND (OLD.status IS DISTINCT FROM 'executed') THEN
    SELECT COALESCE(SUM(scheduled_value), 0), COUNT(*)
      INTO v_total, v_line_count
      FROM public.commitment_sov_lines
      WHERE commitment_id = NEW.id;
    IF NEW.commitment_type = 'purchase_order' AND v_line_count <= 1
       AND v_total = NEW.original_value THEN
      RETURN NEW;
    END IF;
    IF v_total <> NEW.original_value THEN
      RAISE EXCEPTION 'Commitment SOV total (%) must equal original_value (%)', v_total, NEW.original_value;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cmt_validate_sov ON public.commitments;
CREATE TRIGGER trg_cmt_validate_sov
  BEFORE UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.validate_commitment_sov();

-- Once executed, original_value is locked — changes only via CCO
CREATE OR REPLACE FUNCTION public.lock_executed_commitment_value()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'executed' AND NEW.original_value <> OLD.original_value THEN
    RAISE EXCEPTION 'Cannot modify original_value on executed commitment — use a CCO (D4)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cmt_lock_value ON public.commitments;
CREATE TRIGGER trg_cmt_lock_value
  BEFORE UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.lock_executed_commitment_value();

DROP TRIGGER IF EXISTS trg_cmt_updated_at ON public.commitments;
CREATE TRIGGER trg_cmt_updated_at BEFORE UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ci_updated_at ON public.commitment_invoices;
CREATE TRIGGER trg_ci_updated_at BEFORE UPDATE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
