-- Project contracts and SOV line items
-- Tenant references workspaces(id) per CLAUDE.md convention

CREATE TABLE public.project_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Identification
  contract_number TEXT,
  contract_title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'subcontract', -- prime | subcontract | owner
  status TEXT NOT NULL DEFAULT 'draft', -- draft | out_for_signature | executed | terminated
  docusign_envelope_id TEXT,

  -- Parties — prime contractor (or owner-side)
  prime_contractor_name TEXT,
  prime_contractor_address TEXT,
  prime_contractor_contact TEXT,
  prime_contractor_email TEXT,

  -- Parties — subcontractor (or GC-side when contract_type = prime)
  subcontractor_name TEXT,
  subcontractor_address TEXT,
  subcontractor_contact TEXT,
  subcontractor_email TEXT,

  -- Project location
  project_address TEXT,

  -- Dates
  contract_date DATE,
  start_date DATE,
  substantial_completion_date DATE,
  final_completion_date DATE,
  actual_completion_date DATE,
  signed_contract_received_date DATE,

  -- Financial
  base_contract_amount NUMERIC(14,2),
  retainage_percent NUMERIC(5,2) DEFAULT 5.0,
  mobilization_advance NUMERIC(14,2),
  liquidated_damages_per_day NUMERIC(10,2),

  -- Retainage release split
  retainage_release_substantial NUMERIC(5,2) DEFAULT 2.5,
  retainage_release_final NUMERIC(5,2) DEFAULT 2.5,
  retainage_warranty_months INTEGER DEFAULT 12,

  -- Payment cycle
  payment_cycle_days INTEGER DEFAULT 15,
  payment_due_within_days INTEGER DEFAULT 3,

  -- Narrative fields
  scope_description TEXT,
  inclusions TEXT,
  exclusions TEXT,
  special_conditions TEXT,

  -- Link to repository artifact
  artifact_id UUID REFERENCES public.project_artifacts(id) ON DELETE SET NULL,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_contracts_project_idx ON public.project_contracts(project_id);
CREATE INDEX project_contracts_tenant_idx  ON public.project_contracts(tenant_id);

ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_contracts_tenant_isolation ON public.project_contracts
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- SOV line items
CREATE TABLE public.contract_sov_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,

  item_number INTEGER NOT NULL,
  budget_code TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3),
  unit TEXT,
  unit_cost NUMERIC(14,2),
  subtotal NUMERIC(14,2),

  -- Progress tracking (updated via pay apps / invoices)
  completed_qty NUMERIC(12,3) DEFAULT 0,
  completed_pct NUMERIC(5,2) DEFAULT 0,
  billed_to_date NUMERIC(14,2) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX contract_sov_items_contract_idx ON public.contract_sov_items(contract_id);

ALTER TABLE public.contract_sov_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_sov_items_tenant_isolation ON public.contract_sov_items
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER project_contracts_updated_at
  BEFORE UPDATE ON public.project_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contract_sov_items_updated_at
  BEFORE UPDATE ON public.contract_sov_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
