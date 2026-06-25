-- Review comments / action items an admin attaches to a daily field report and
-- sends back to the field staff. Each item is acknowledged by staff (the "tickler"
-- loop): open → acknowledged. Scoped like daily_reports (project → property →
-- workspace, plus super-admin bypass).
CREATE TABLE IF NOT EXISTS public.daily_report_action_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id     uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  body                text NOT NULL,
  created_by          uuid,
  created_by_name     text,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged')),
  acknowledged_at     timestamptz,
  acknowledged_by     uuid,
  acknowledged_by_name text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dr_action_items_report ON public.daily_report_action_items(daily_report_id);

ALTER TABLE public.daily_report_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_report_action_items_rw ON public.daily_report_action_items;
CREATE POLICY daily_report_action_items_rw ON public.daily_report_action_items
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_report_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_report_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  );
