-- ============================================================
-- E1 · Schedule — Gantt + P6/MSP import.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text NOT NULL DEFAULT 'native' CHECK (source IN ('native','p6','msp')),
  imported_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  task_code text,
  name text NOT NULL,
  start_date date,
  finish_date date,
  duration_days int,
  pct_complete numeric NOT NULL DEFAULT 0 CHECK (pct_complete BETWEEN 0 AND 100),
  is_milestone boolean NOT NULL DEFAULT false,
  is_critical boolean NOT NULL DEFAULT false,
  parent_task_id uuid REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  wbs_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_schedule ON public.schedule_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_st_parent ON public.schedule_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_st_dates ON public.schedule_tasks(schedule_id, start_date, finish_date);

CREATE TABLE IF NOT EXISTS public.schedule_predecessors (
  task_id uuid NOT NULL REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  predecessor_task_id uuid NOT NULL REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  relation text NOT NULL CHECK (relation IN ('FS','SS','FF','SF')),
  lag_days int NOT NULL DEFAULT 0,
  PRIMARY KEY (task_id, predecessor_task_id)
);

CREATE TABLE IF NOT EXISTS public.schedule_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  name text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid REFERENCES auth.users(id),
  tasks_snapshot jsonb NOT NULL
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_predecessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY sch_tenant ON public.schedules FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY st_via_schedule ON public.schedule_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_tasks.schedule_id
                 AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_tasks.schedule_id
                      AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY sp_via_task ON public.schedule_predecessors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schedule_tasks t JOIN public.schedules s ON s.id = t.schedule_id
                 WHERE t.id = schedule_predecessors.task_id
                 AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.schedule_tasks t JOIN public.schedules s ON s.id = t.schedule_id
                      WHERE t.id = schedule_predecessors.task_id
                      AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY sbl_via_schedule ON public.schedule_baselines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_baselines.schedule_id
                 AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_baselines.schedule_id
                      AND (s.tenant_id = public.current_tenant_id() OR public.is_super_admin())));
