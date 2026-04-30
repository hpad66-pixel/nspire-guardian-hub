-- ============================================================
-- C2 · Submittals (multi-step workflow) — enhance existing project_submittals.
-- ============================================================

ALTER TABLE public.project_submittals
  ADD COLUMN IF NOT EXISTS submittal_number text,
  ADD COLUMN IF NOT EXISTS submittal_type text,
  ADD COLUMN IF NOT EXISTS specification_section_id uuid REFERENCES public.specification_sections(id),
  ADD COLUMN IF NOT EXISTS responsible_contractor_org_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS submittal_manager_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS final_due_date date,
  ADD COLUMN IF NOT EXISTS anticipated_delivery_date date,
  ADD COLUMN IF NOT EXISTS confirmed_delivery_date date,
  ADD COLUMN IF NOT EXISTS actual_delivery_date date,
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id),
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_id uuid;

CREATE TABLE IF NOT EXISTS public.submittal_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_submittals
  ADD CONSTRAINT submittals_package_fk
  FOREIGN KEY (package_id) REFERENCES public.submittal_packages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.submittal_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES public.project_submittals(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  due_date date,
  response text CHECK (response IN ('approved','approved_as_noted','revise','rejected','fyi')),
  responded_at timestamptz,
  comment text,
  UNIQUE(submittal_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_sws_submittal ON public.submittal_workflow_steps(submittal_id, sequence);

CREATE TABLE IF NOT EXISTS public.submittal_register_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  specification_section_id uuid REFERENCES public.specification_sections(id),
  required_type text,
  submittal_id uuid REFERENCES public.project_submittals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'required' CHECK (status IN ('required','draft','in_progress','approved'))
);

ALTER TABLE public.submittal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_register_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sp_tenant ON public.submittal_packages FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY sws_via_sub ON public.submittal_workflow_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_submittals s WHERE s.id = submittal_workflow_steps.submittal_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_submittals s WHERE s.id = submittal_workflow_steps.submittal_id));

CREATE POLICY sri_tenant ON public.submittal_register_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
