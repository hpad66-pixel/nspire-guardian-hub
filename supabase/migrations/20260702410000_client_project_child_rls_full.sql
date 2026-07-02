-- Comprehensive fix: every project child table that scoped RLS ONLY through the
-- project's property now also allows the project's client (property-less /
-- consulting / client / standalone projects). See 20260702400000 for the
-- rationale; that one covered 4 tables — this covers the full set so no module
-- fails on a client-linked project. Permissive FOR ALL policy OR'd with the
-- existing property policies → property projects unaffected, isolation preserved.

-- Direct children: have a project_id column.
DO $$
DECLARE
  tbl text;
  direct_children text[] := ARRAY[
    'change_orders','client_action_items','client_messages','daily_reports',
    'portal_client_uploads','project_action_items','project_client_updates',
    'project_closeout_items','project_communications','project_discussions',
    'project_documents','project_lessons_learned','project_meetings',
    'project_milestones','project_progress_entries','project_progress_reports',
    'project_proposals','project_purchase_orders','project_rfis',
    'project_safety_incidents','project_submittals','project_team_members',
    'project_toolbox_talks','project_warranties','punch_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY direct_children LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=tbl AND column_name='project_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl||'_client_all', tbl);
      EXECUTE format($f$
        CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.projects p WHERE p.id = %I.project_id AND (
            EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
            OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
          )))
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.projects p WHERE p.id = %I.project_id AND (
            EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
            OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
          )))
      $f$, tbl||'_client_all', tbl, tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Grandchild: action_item_comments -> project_action_items -> project.
DROP POLICY IF EXISTS action_item_comments_client_all ON public.action_item_comments;
CREATE POLICY action_item_comments_client_all ON public.action_item_comments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id
    WHERE pai.id = action_item_comments.action_item_id AND (
      EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
    )))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id
    WHERE pai.id = action_item_comments.action_item_id AND (
      EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = p.property_id AND pr.workspace_id = public.get_my_workspace_id())
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.workspace_id = public.get_my_workspace_id())
    )));

NOTIFY pgrst, 'reload schema';
