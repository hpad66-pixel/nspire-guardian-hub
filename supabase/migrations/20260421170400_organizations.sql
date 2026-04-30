-- ============================================================
-- Organizations — foundational table referenced by every module
-- that tracks vendors, subs, owners, and the GC company.
-- Must run BEFORE B1 (project directory), C1 (RFIs), C2 (submittals),
-- D1 (prime contracts), D2 (commitments), and D5 (direct costs).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  kind text NOT NULL DEFAULT 'vendor'
    CHECK (kind IN ('owner','gc','sub','vendor','consultant','municipality','other')),
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON public.organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(tenant_id, LOWER(name));

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_tenant ON public.organizations FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
