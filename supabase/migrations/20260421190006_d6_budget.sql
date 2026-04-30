-- ============================================================
-- D6 · Budget — cost-code-keyed matrix view over D1-D5.
-- The single source of truth.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Primary Budget',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active project_budget per project
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_budget_active
  ON public.project_budgets(project_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  original_budget numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_budget_id, cost_code_id)
);

CREATE INDEX IF NOT EXISTS idx_bl_cost_code ON public.budget_lines(cost_code_id);

CREATE TABLE IF NOT EXISTS public.budget_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  mod_no int NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','void')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_budget_id, mod_no)
);

CREATE TABLE IF NOT EXISTS public.budget_modification_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_modification_id uuid NOT NULL REFERENCES public.budget_modifications(id) ON DELETE CASCADE,
  from_cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  to_cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS public.budget_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  period_end date NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_modification_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY pb_tenant ON public.project_budgets FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY bl_tenant ON public.budget_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY bm_tenant ON public.budget_modifications FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY bml_via_mod ON public.budget_modification_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.budget_modifications bm
                 WHERE bm.id = budget_modification_lines.budget_modification_id
                 AND (bm.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.budget_modifications bm
                      WHERE bm.id = budget_modification_lines.budget_modification_id
                      AND (bm.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY bs_tenant ON public.budget_snapshots FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Auto mod_no per budget
CREATE OR REPLACE FUNCTION public.assign_budget_mod_no()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mod_no IS NULL THEN
    NEW.mod_no := COALESCE(
      (SELECT MAX(mod_no) FROM public.budget_modifications WHERE project_budget_id = NEW.project_budget_id),
      0
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bm_assign_no ON public.budget_modifications;
CREATE TRIGGER trg_bm_assign_no
  BEFORE INSERT ON public.budget_modifications
  FOR EACH ROW EXECUTE FUNCTION public.assign_budget_mod_no();

-- Budget mod must net to zero across all lines (sum from = sum to; equivalent to all transfers balancing)
CREATE OR REPLACE FUNCTION public.validate_budget_mod_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT COUNT(*) INTO v_count FROM public.budget_modification_lines
      WHERE budget_modification_id = NEW.id;
    IF v_count = 0 THEN
      RAISE EXCEPTION 'Budget modification must have at least one line to be approved';
    END IF;
    -- Each line represents a balanced transfer (equal amount moves from→to) so nets to zero by construction.
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bm_validate ON public.budget_modifications;
CREATE TRIGGER trg_bm_validate
  BEFORE UPDATE ON public.budget_modifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_mod_balance();

-- The matrix view — single source of truth
CREATE OR REPLACE VIEW public.budget_matrix AS
SELECT
  bl.project_budget_id,
  bl.cost_code_id,
  cc.code AS cost_code,
  cc.description AS cost_code_desc,
  bl.original_budget,
  COALESCE(bm_net.net_transfer, 0) AS approved_budget_mods,
  bl.original_budget + COALESCE(bm_net.net_transfer, 0) AS revised_budget,
  COALESCE(cs.committed_cost, 0) AS committed_cost,
  COALESCE(cs.executed_cco, 0) AS executed_cco,
  COALESCE(dc.direct_cost, 0) AS direct_cost,
  COALESCE(cev.pending_exposure, 0) AS pending_exposure,
  (COALESCE(cs.committed_cost, 0) + COALESCE(cs.executed_cco, 0)
   + COALESCE(dc.direct_cost, 0) + COALESCE(cev.pending_exposure, 0)) AS forecast_to_complete,
  (bl.original_budget + COALESCE(bm_net.net_transfer, 0))
   - (COALESCE(cs.committed_cost, 0) + COALESCE(cs.executed_cco, 0)
      + COALESCE(dc.direct_cost, 0) + COALESCE(cev.pending_exposure, 0)) AS variance
FROM public.budget_lines bl
JOIN public.cost_codes cc ON cc.id = bl.cost_code_id
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN bml.to_cost_code_id = bl.cost_code_id   THEN bml.amount ELSE 0 END) -
    SUM(CASE WHEN bml.from_cost_code_id = bl.cost_code_id THEN bml.amount ELSE 0 END) AS net_transfer
  FROM public.budget_modification_lines bml
  JOIN public.budget_modifications bm ON bm.id = bml.budget_modification_id
  WHERE bm.status = 'approved'
    AND bm.project_budget_id = bl.project_budget_id
) bm_net ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE((
      SELECT SUM(csl.scheduled_value)
      FROM public.commitment_sov_lines csl
      JOIN public.commitments c ON c.id = csl.commitment_id
      WHERE csl.cost_code_id = bl.cost_code_id
        AND c.status = 'executed'
        AND c.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
    ), 0) AS committed_cost,
    COALESCE((
      SELECT SUM(col.amount)
      FROM public.change_order_lines col
      JOIN public.change_orders co ON co.id = col.change_order_id
      WHERE col.cost_code_id = bl.cost_code_id
        AND co.co_type = 'CCO'
        AND co.status = 'executed'
        AND co.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
    ), 0) AS executed_cco
) cs ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(dcl.amount), 0) AS direct_cost
  FROM public.direct_cost_lines dcl
  JOIN public.direct_costs dc ON dc.id = dcl.direct_cost_id
  WHERE dcl.cost_code_id = bl.cost_code_id
    AND dc.status IN ('approved','paid')
    AND dc.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
) dc ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(cel.estimated_cost), 0) AS pending_exposure
  FROM public.change_event_lines cel
  JOIN public.change_events ce ON ce.id = cel.change_event_id
  WHERE cel.cost_code_id = bl.cost_code_id
    AND cel.status_bucket = 'pending'
    AND ce.project_id IN (SELECT pb.project_id FROM public.project_budgets pb WHERE pb.id = bl.project_budget_id)
) cev ON true;

GRANT SELECT ON public.budget_matrix TO authenticated;

DROP TRIGGER IF EXISTS trg_pb_updated_at ON public.project_budgets;
CREATE TRIGGER trg_pb_updated_at BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
