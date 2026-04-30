-- ============================================================
-- B1 · Project Directory — unified People + Companies per project.
-- ============================================================

-- Extend existing organizations with vendor/compliance fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS vendor_number text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS dbe_mbe_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS bonding_capacity_cents bigint;

CREATE TABLE IF NOT EXISTS public.project_directory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  role_label text,
  is_key_contact boolean NOT NULL DEFAULT false,
  permission_template_id uuid REFERENCES public.permission_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pde_project ON public.project_directory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_pde_tenant ON public.project_directory_entries(tenant_id);

CREATE TABLE IF NOT EXISTS public.organization_trades (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, cost_code_id)
);

ALTER TABLE public.project_directory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY pde_tenant ON public.project_directory_entries FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY ot_via_org ON public.organization_trades FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_trades.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_trades.organization_id));
