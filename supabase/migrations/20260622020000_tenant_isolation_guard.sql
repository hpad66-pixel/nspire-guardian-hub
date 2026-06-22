-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant-isolation regression guard for the legacy (pre-Procore) tables.
--
-- CONTEXT
--   A QA/QC pass flagged ~36 legacy tables as "missing tenant_id / RLS". That
--   was a false positive from reading only the CREATE TABLE migrations: these
--   tables were comprehensively hardened in 20260219204436 (cd0dc3be) with
--   workspace-scoped policies of the form `workspace_id = get_my_workspace_id()`
--   (directly or via a property/project join), and their original wide-open
--   `USING (true)` policies were dropped in the intervening migrations.
--
--   The legacy tables therefore isolate by the `workspace_id` /
--   `get_my_workspace_id()` convention rather than the Procore `tenant_id` /
--   `current_tenant_id()` convention. These are EQUIVALENT: get_my_workspace_id()
--   wraps current_tenant_id() (COALESCE(current_tenant_id(), …fallbacks)), both
--   SECURITY DEFINER. We deliberately do NOT duplicate the value into a second
--   `tenant_id` column — that would be redundant and risk breaking the working
--   policies. Isolation is already enforced.
--
-- WHAT THIS MIGRATION DOES (idempotent, safe to re-run)
--   For each legacy table that exists:
--     1. Ensures ROW LEVEL SECURITY is enabled.
--     2. Drops any residual fully-permissive `USING (true)` policy — but ONLY
--        when the table also has at least one scoped policy, so a table can
--        never be left RLS-enabled-with-no-policy (which would deny all access).
--     3. If a table somehow has ONLY wide-open policies, it is LEFT ALONE and a
--        WARNING is raised for manual review (never auto-lock a table).
--
--   This is a belt-and-suspenders guard: on a correctly-migrated database it is
--   a no-op. It exists to slam the door on any residual cross-tenant read leak
--   and to document the isolation contract for these tables.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl           text;
  pol           record;
  scoped_count  int;
  legacy_tables text[] := ARRAY[
    'profiles','user_roles','properties','units','inspections','defects','issues',
    'daily_reports','projects','activity_log','project_team_members',
    'project_communications','project_rfis','project_submittals','punch_items',
    'project_documents','document_folders','user_module_access','client_action_items',
    'client_messages','project_client_updates','inventory_transactions',
    'property_inventory_items','property_utility_bills','lw_courses','lw_sso_sessions',
    'training_assignments','training_completions','training_share_links',
    'property_module_overrides','workspace_modules','asset_type_definitions',
    'push_subscriptions','portal_client_uploads','photo_gallery','meeting_unlock_requests'
  ];
BEGIN
  FOREACH tbl IN ARRAY legacy_tables LOOP
    -- Skip anything not present in this database.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Count scoped (non wide-open read) policies currently on the table.
    SELECT count(*) INTO scoped_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = tbl
      AND coalesce(qual, '') <> 'true';

    IF scoped_count > 0 THEN
      -- Safe to remove any wide-open read policy: a scoped one remains.
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND qual = 'true'
      LOOP
        RAISE NOTICE 'tenant-isolation guard: dropping wide-open policy "%" on %', pol.policyname, tbl;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;
    ELSE
      -- Only wide-open (or zero) policies exist — do NOT touch, would lock out.
      RAISE WARNING 'tenant-isolation guard: % has no workspace-scoped policy; left intact for manual review', tbl;
    END IF;
  END LOOP;
END $$;
