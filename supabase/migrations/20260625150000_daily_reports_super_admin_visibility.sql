-- Daily reports were invisible to everyone for projects that have no linked
-- property: the SELECT/UPDATE/DELETE policies require project → property →
-- workspace_id, and the construction projects (Sewer Ext, Stormwater Management)
-- have property_id = NULL, so the EXISTS never matches and nobody — not even the
-- super admin — can read them. Add a super_admin bypass (matches the financial
-- tables' `OR is_super_admin()` pattern) so platform admins always see every report.
DROP POLICY IF EXISTS daily_reports_select ON public.daily_reports;
CREATE POLICY daily_reports_select ON public.daily_reports
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  );

DROP POLICY IF EXISTS daily_reports_update ON public.daily_reports;
CREATE POLICY daily_reports_update ON public.daily_reports
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  );

DROP POLICY IF EXISTS daily_reports_delete ON public.daily_reports;
CREATE POLICY daily_reports_delete ON public.daily_reports
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()
    )
  );
