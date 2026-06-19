-- ============================================================
-- F0 · Lien releases — both directions.
--   inbound  = received from a sub  → attached to a commitment_invoice
--   outbound = issued by us to owner → attached to a prime pay app
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lien_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  release_type text NOT NULL CHECK (release_type IN (
    'conditional_progress','unconditional_progress','conditional_final','unconditional_final')),
  -- Polymorphic parent: exactly one non-null (CHECK + trigger below).
  commitment_invoice_id uuid REFERENCES public.commitment_invoices(id) ON DELETE CASCADE,
  pay_app_id uuid REFERENCES public.prime_contract_pay_apps(id) ON DELETE CASCADE,
  through_date date,
  amount numeric(14,2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','approved','rejected','void')),
  artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lien_one_parent CHECK (
    (commitment_invoice_id IS NOT NULL)::int + (pay_app_id IS NOT NULL)::int = 1
  ),
  -- inbound must hang off a commitment invoice; outbound off a pay app.
  CONSTRAINT lien_direction_parent CHECK (
    (direction = 'inbound'  AND commitment_invoice_id IS NOT NULL) OR
    (direction = 'outbound' AND pay_app_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lien_project ON public.lien_releases(project_id);
CREATE INDEX IF NOT EXISTS idx_lien_inv ON public.lien_releases(commitment_invoice_id);
CREATE INDEX IF NOT EXISTS idx_lien_payapp ON public.lien_releases(pay_app_id);

ALTER TABLE public.lien_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY lien_releases_tenant_isolation ON public.lien_releases
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER lien_releases_updated_at
  BEFORE UPDATE ON public.lien_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant-boundary trigger (rule 8): parent + artifact must be same tenant.
CREATE OR REPLACE FUNCTION public.enforce_lien_release_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  IF NEW.commitment_invoice_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.commitment_invoices WHERE id = NEW.commitment_invoice_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'commitment_invoice_id % is not in tenant %', NEW.commitment_invoice_id, NEW.tenant_id;
    END IF;
  END IF;
  IF NEW.pay_app_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.prime_contract_pay_apps WHERE id = NEW.pay_app_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'pay_app_id % is not in tenant %', NEW.pay_app_id, NEW.tenant_id;
    END IF;
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

DROP TRIGGER IF EXISTS trg_lien_release_tenant ON public.lien_releases;
CREATE TRIGGER trg_lien_release_tenant
  BEFORE INSERT OR UPDATE ON public.lien_releases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lien_release_tenant();
