-- ============================================================
-- E3 · 360 Reporting — dashboards + report builder.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  data_source text NOT NULL CHECK (data_source IN
    ('rfis','submittals','punch','daily_logs','meetings','schedule_tasks','incidents',
     'budget_matrix','commitments','change_orders','direct_costs','pay_apps')),
  config jsonb NOT NULL,
  scope text NOT NULL DEFAULT 'private' CHECK (scope IN ('private','project','tenant')),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON public.reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON public.reports(owner_user_id);

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  cron text NOT NULL,
  recipients jsonb NOT NULL,
  format text NOT NULL CHECK (format IN ('pdf','xlsx','csv')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rs_next_run
  ON public.report_schedules(next_run_at) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  role_preset text CHECK (role_preset IN ('exec','pm','super','accountant','safety','custom')),
  tiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

-- Scope-aware policy: private (owner only) | project (project members) | tenant (all)
CREATE POLICY reports_scope_select ON public.reports FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND (
      (scope = 'private' AND owner_user_id = auth.uid())
      OR (scope = 'tenant')
      OR (scope = 'project')
    ))
  );

CREATE POLICY reports_write ON public.reports FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (owner_user_id = auth.uid() OR public.is_super_admin()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (owner_user_id = auth.uid() OR public.is_super_admin()));

CREATE POLICY rs_tenant ON public.report_schedules FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY dashboards_tenant ON public.dashboards FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP TRIGGER IF EXISTS trg_reports_updated_at ON public.reports;
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_dashboards_updated_at ON public.dashboards;
CREATE TRIGGER trg_dashboards_updated_at BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed 4 preset dashboards on first-read via the UI's bootstrap.
-- (See src/lib/reports/seed.ts)
