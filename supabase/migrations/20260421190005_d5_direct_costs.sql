-- ============================================================
-- D5 · Direct Costs — non-commitment cost ledger.
-- Invoices, timecards, expenses. Every line carries cost_code_id.
-- Mapping: spec.documents → public.pl_documents (from B5).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.direct_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('invoice','timecard','expense')),
  reference_no text,
  vendor_org_id uuid REFERENCES public.organizations(id),
  employee_id uuid REFERENCES auth.users(id),
  cost_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','approved','paid','void')),
  attachment_doc_id uuid REFERENCES public.pl_documents(id),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Type-specific requirements
  CHECK (
    (cost_type = 'invoice'  AND vendor_org_id IS NOT NULL) OR
    (cost_type = 'timecard' AND employee_id   IS NOT NULL) OR
    (cost_type = 'expense'  AND (vendor_org_id IS NOT NULL OR employee_id IS NOT NULL))
  )
);

CREATE INDEX IF NOT EXISTS idx_dc_project ON public.direct_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_dc_status ON public.direct_costs(status);
CREATE INDEX IF NOT EXISTS idx_dc_date ON public.direct_costs(cost_date);

CREATE TABLE IF NOT EXISTS public.direct_cost_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  direct_cost_id uuid NOT NULL REFERENCES public.direct_costs(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  amount numeric(14,2) NOT NULL,
  hours numeric(6,2),
  rate numeric(8,2)
);

CREATE INDEX IF NOT EXISTS idx_dcl_cost_code ON public.direct_cost_lines(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_dcl_direct_cost ON public.direct_cost_lines(direct_cost_id);

ALTER TABLE public.direct_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_cost_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY dc_tenant ON public.direct_costs FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY dcl_tenant ON public.direct_cost_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Timecard line auto-compute: amount = hours * rate (enforce at trigger time)
CREATE OR REPLACE FUNCTION public.compute_direct_cost_line_amount()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_cost_type text;
BEGIN
  SELECT cost_type INTO v_cost_type FROM public.direct_costs WHERE id = NEW.direct_cost_id;
  IF v_cost_type = 'timecard' AND NEW.hours IS NOT NULL AND NEW.rate IS NOT NULL THEN
    NEW.amount := NEW.hours * NEW.rate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dcl_compute ON public.direct_cost_lines;
CREATE TRIGGER trg_dcl_compute
  BEFORE INSERT OR UPDATE ON public.direct_cost_lines
  FOR EACH ROW EXECUTE FUNCTION public.compute_direct_cost_line_amount();

-- Validator: invoices and expenses require attachment_doc_id when status moves to 'approved'
CREATE OR REPLACE FUNCTION public.validate_direct_cost_approval()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_line_total numeric(14,2);
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.cost_type IN ('invoice','expense') AND NEW.attachment_doc_id IS NULL THEN
      RAISE EXCEPTION '% requires an attachment before approval', NEW.cost_type;
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_line_total
      FROM public.direct_cost_lines WHERE direct_cost_id = NEW.id;
    IF v_line_total <> NEW.amount THEN
      RAISE EXCEPTION 'Direct cost lines total (%) must equal header amount (%)', v_line_total, NEW.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dc_validate_approve ON public.direct_costs;
CREATE TRIGGER trg_dc_validate_approve
  BEFORE UPDATE ON public.direct_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_direct_cost_approval();

DROP TRIGGER IF EXISTS trg_dc_updated_at ON public.direct_costs;
CREATE TRIGGER trg_dc_updated_at BEFORE UPDATE ON public.direct_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
