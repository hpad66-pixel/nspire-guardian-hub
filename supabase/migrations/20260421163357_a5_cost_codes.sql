-- ============================================================
-- A5 · Cost Code Library (WBS)
-- CSI MasterFormat-based; per-tenant clonable; per-project customizable.
-- Every financial row in D1-D6 carries cost_code_id + cost_type_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cost_code_libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text NOT NULL CHECK (source IN ('csi','custom','imported')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccl_tenant ON public.cost_code_libraries(tenant_id);

-- Only one default library per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ccl_default_per_tenant
  ON public.cost_code_libraries(tenant_id) WHERE is_default = true;

CREATE TABLE IF NOT EXISTS public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.cost_code_libraries(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  parent_id uuid REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level BETWEEN 1 AND 5),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(library_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cc_library_parent
  ON public.cost_codes(library_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_cc_library_code
  ON public.cost_codes(library_id, code);

CREATE TABLE IF NOT EXISTS public.cost_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.project_cost_code_overrides (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  alias text,
  is_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (project_id, cost_code_id)
);

-- RLS --------------------------------------------------------
ALTER TABLE public.cost_code_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cost_code_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccl_tenant ON public.cost_code_libraries FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY cc_via_library ON public.cost_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cost_code_libraries ccl
                 WHERE ccl.id = cost_codes.library_id
                 AND (ccl.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cost_code_libraries ccl
                      WHERE ccl.id = cost_codes.library_id
                      AND (ccl.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY ct_tenant ON public.cost_types FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pcco_project ON public.project_cost_code_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = project_cost_code_overrides.project_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = project_cost_code_overrides.project_id));

-- Guard: cannot delete a cost_code that's referenced in any financial table.
-- Enforced at the trigger level so it fires regardless of FK direction.
-- Each D-prompt that adds a financial table should add itself to the check list below.
CREATE OR REPLACE FUNCTION public.prevent_cost_code_delete_if_referenced()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count int := 0;
BEGIN
  -- Budget lines, commitments, change events, change orders, direct costs
  -- are created in later prompts; use to_regclass so this is idempotent now.
  IF to_regclass('public.budget_lines') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.budget_lines WHERE cost_code_id = $1'
      INTO v_count USING OLD.id;
    IF v_count > 0 THEN RAISE EXCEPTION 'Cost code is referenced by budget_lines'; END IF;
  END IF;
  IF to_regclass('public.commitment_sov_lines') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.commitment_sov_lines WHERE cost_code_id = $1'
      INTO v_count USING OLD.id;
    IF v_count > 0 THEN RAISE EXCEPTION 'Cost code is referenced by commitment_sov_lines'; END IF;
  END IF;
  IF to_regclass('public.change_events') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.change_events WHERE cost_code_id = $1'
      INTO v_count USING OLD.id;
    IF v_count > 0 THEN RAISE EXCEPTION 'Cost code is referenced by change_events'; END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cc_prevent_delete ON public.cost_codes;
CREATE TRIGGER trg_cc_prevent_delete
  BEFORE DELETE ON public.cost_codes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_cost_code_delete_if_referenced();

DROP TRIGGER IF EXISTS trg_ccl_updated_at ON public.cost_code_libraries;
CREATE TRIGGER trg_ccl_updated_at
  BEFORE UPDATE ON public.cost_code_libraries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
