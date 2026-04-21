-- ============================================================
-- D1 · Prime Contract — root of the financial cascade.
-- Every downstream row reconciles back to revised_contract_value.
-- Mapping: spec.directory_orgs → public.organizations (see CLAUDE.md).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prime_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_no text NOT NULL,
  title text NOT NULL,
  owner_org_id uuid REFERENCES public.organizations(id),
  gc_org_id uuid REFERENCES public.organizations(id),
  executed_date date,
  original_value numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','out_for_signature','executed','closed','terminated')),
  retainage_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, contract_no)
);

-- Only one prime contract per project (enforced at app layer; enable below for DB-level)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_prime_contract_per_project
  ON public.prime_contracts(project_id);

CREATE TABLE IF NOT EXISTS public.prime_contract_sov_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prime_contract_id uuid NOT NULL REFERENCES public.prime_contracts(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  description text NOT NULL,
  scheduled_value numeric(14,2) NOT NULL,
  UNIQUE (prime_contract_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_pcsl_contract ON public.prime_contract_sov_lines(prime_contract_id);
CREATE INDEX IF NOT EXISTS idx_pcsl_cost_code ON public.prime_contract_sov_lines(cost_code_id);

CREATE TABLE IF NOT EXISTS public.prime_contract_pay_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prime_contract_id uuid NOT NULL REFERENCES public.prime_contracts(id) ON DELETE CASCADE,
  pay_app_no int NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','paid','rejected')),
  submitted_amount numeric(14,2),
  approved_amount numeric(14,2),
  retainage_held numeric(14,2),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prime_contract_id, pay_app_no)
);

CREATE TABLE IF NOT EXISTS public.prime_contract_pay_app_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_app_id uuid NOT NULL REFERENCES public.prime_contract_pay_apps(id) ON DELETE CASCADE,
  sov_line_id uuid NOT NULL REFERENCES public.prime_contract_sov_lines(id),
  work_this_period numeric(14,2) NOT NULL DEFAULT 0,
  materials_stored numeric(14,2) NOT NULL DEFAULT 0,
  pct_complete numeric(5,2),
  UNIQUE (pay_app_id, sov_line_id)
);

-- RLS
ALTER TABLE public.prime_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prime_contract_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prime_contract_pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prime_contract_pay_app_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY pc_tenant ON public.prime_contracts FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pcsl_tenant ON public.prime_contract_sov_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pcpa_tenant ON public.prime_contract_pay_apps FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pcpal_via_payapp ON public.prime_contract_pay_app_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prime_contract_pay_apps pa
                 WHERE pa.id = prime_contract_pay_app_lines.pay_app_id
                 AND (pa.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prime_contract_pay_apps pa
                      WHERE pa.id = prime_contract_pay_app_lines.pay_app_id
                      AND (pa.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

-- SOV total validator: scheduled_value sum MUST equal original_value when contract status moves to 'executed'
CREATE OR REPLACE FUNCTION public.validate_prime_contract_sov()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total numeric(14,2);
BEGIN
  IF NEW.status = 'executed' AND (OLD.status IS DISTINCT FROM 'executed') THEN
    SELECT COALESCE(SUM(scheduled_value), 0)
      INTO v_total
      FROM public.prime_contract_sov_lines
      WHERE prime_contract_id = NEW.id;
    IF v_total <> NEW.original_value THEN
      RAISE EXCEPTION 'Prime contract SOV total (%) must equal original_value (%)', v_total, NEW.original_value;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pc_validate_sov ON public.prime_contracts;
CREATE TRIGGER trg_pc_validate_sov
  BEFORE UPDATE ON public.prime_contracts
  FOR EACH ROW EXECUTE FUNCTION public.validate_prime_contract_sov();

-- Pay-app lock trigger: once status='approved', lines are read-only
CREATE OR REPLACE FUNCTION public.lock_approved_pay_app_lines()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.prime_contract_pay_apps
   WHERE id = COALESCE(NEW.pay_app_id, OLD.pay_app_id);
  IF v_status IN ('approved','paid') THEN
    RAISE EXCEPTION 'Pay app is % and cannot be modified', v_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_pcpal_lock ON public.prime_contract_pay_app_lines;
CREATE TRIGGER trg_pcpal_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.prime_contract_pay_app_lines
  FOR EACH ROW EXECUTE FUNCTION public.lock_approved_pay_app_lines();

DROP TRIGGER IF EXISTS trg_pc_updated_at ON public.prime_contracts;
CREATE TRIGGER trg_pc_updated_at BEFORE UPDATE ON public.prime_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pcpa_updated_at ON public.prime_contract_pay_apps;
CREATE TRIGGER trg_pcpa_updated_at BEFORE UPDATE ON public.prime_contract_pay_apps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
