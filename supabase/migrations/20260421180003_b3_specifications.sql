-- ============================================================
-- B3 · Specifications — CSI-divisioned spec book.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.specification_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  set_date date,
  status text NOT NULL DEFAULT 'active',
  pdf_path text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specification_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES public.specification_sets(id) ON DELETE CASCADE,
  division text NOT NULL,
  section_number text NOT NULL,
  title text NOT NULL,
  pdf_page_start int,
  pdf_page_end int,
  revision text NOT NULL DEFAULT 'A',
  cost_code_id uuid REFERENCES public.cost_codes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ss_set ON public.specification_sections(set_id);
CREATE INDEX IF NOT EXISTS idx_ss_section_num ON public.specification_sections(section_number);

CREATE TABLE IF NOT EXISTS public.spec_submittal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.specification_sections(id) ON DELETE CASCADE,
  requirement_text text NOT NULL,
  submittal_type text,
  is_generated boolean NOT NULL DEFAULT false
);

ALTER TABLE public.specification_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_submittal_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY specset_tenant ON public.specification_sets FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY specsec_tenant ON public.specification_sections FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY ssr_via_section ON public.spec_submittal_requirements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.specification_sections s
                 WHERE s.id = spec_submittal_requirements.section_id
                 AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.specification_sections s
                      WHERE s.id = spec_submittal_requirements.section_id
                      AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())));
