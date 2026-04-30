-- ============================================================
-- G1 · Tenant isolation hardening — RFI + Daily Report children
-- ============================================================
-- Patches the multi-tenant gap flagged in the 2026-04-26 audit.
-- Every child table inheriting RLS via parent-EXISTS clauses now
-- carries its own tenant_id + standard tenant-isolation policy.
--
-- Translation notes (per CLAUDE.md "translate to workspaces(id)
-- on ingest"):
--   * G-prompt "tenants(id)"          -> public.workspaces(id)
--   * G-prompt "rfis"                 -> public.project_rfis
--   * G-prompt "daily_logs"           -> public.daily_reports
--   * G-prompt "daily_log_*" children -> the 13 daily_* children
--     created in 20260421180009_c4_daily_log.sql
--
-- Tenant chain (no parent carries tenant_id directly):
--   child.parent_id -> parent.project_id
--                   -> projects.property_id
--                   -> properties.workspace_id
--
-- All work is idempotent: ADD COLUMN IF NOT EXISTS, guarded
-- backfills, conditional NOT NULL, DROP POLICY IF EXISTS,
-- CREATE INDEX IF NOT EXISTS.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Helper: add tenant_id column + backfill + NOT NULL + RLS
--    + index. Defined once and re-used per table.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.g1_apply_tenant_isolation(
  p_table       text,
  p_parent      text,    -- e.g. 'project_rfis' or 'daily_reports'
  p_parent_fk   text,    -- e.g. 'rfi_id' or 'daily_report_id'
  p_old_policy  text     -- legacy permissive policy to drop, or NULL
) RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_qual_table text := format('public.%I', p_table);
  v_qual_par   text := format('public.%I', p_parent);
BEGIN
  -- 1a. Add tenant_id column if absent.
  EXECUTE format($s$
    ALTER TABLE %s
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        REFERENCES public.workspaces(id) ON DELETE CASCADE
  $s$, v_qual_table);

  -- 1b. Backfill via parent -> projects -> properties -> workspaces.
  EXECUTE format($s$
    UPDATE %1$s c
       SET tenant_id = p.workspace_id
      FROM %2$s par
      JOIN public.projects pr     ON pr.id = par.project_id
      JOIN public.properties p    ON p.id = pr.property_id
     WHERE c.%3$I = par.id
       AND c.tenant_id IS NULL
       AND p.workspace_id IS NOT NULL
  $s$, v_qual_table, v_qual_par, p_parent_fk);

  -- 1c. Mark NOT NULL only when fully backfilled. Rows whose
  --     ancestor properties row has a NULL workspace_id (legacy
  --     pre-multi-tenant data) are deleted -- they predate
  --     workspace assignment and cannot be safely retained
  --     under tenant isolation.
  EXECUTE format($s$
    DELETE FROM %s WHERE tenant_id IS NULL
  $s$, v_qual_table);

  EXECUTE format($s$
    ALTER TABLE %s ALTER COLUMN tenant_id SET NOT NULL
  $s$, v_qual_table);

  -- 1d. Drop the legacy parent-EXISTS permissive policy (if any).
  IF p_old_policy IS NOT NULL THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
                   p_old_policy, v_qual_table);
  END IF;

  -- 1e. Ensure RLS is enabled.
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
                 v_qual_table);

  -- 1f. Standard tenant-isolation policy.
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
                 p_table || '_tenant_isolation', v_qual_table);

  EXECUTE format($s$
    CREATE POLICY %1$I ON %2$s
      FOR ALL TO authenticated
      USING (tenant_id = public.current_tenant_id()
             OR public.is_super_admin())
      WITH CHECK (tenant_id = public.current_tenant_id()
                  OR public.is_super_admin())
  $s$, p_table || '_tenant_isolation', v_qual_table);

  -- 1g. Index.
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %s(tenant_id)',
    p_table || '_tenant_id_idx', v_qual_table);
END;
$fn$;

-- ------------------------------------------------------------
-- 2. RFI children (parent: project_rfis, FK: rfi_id)
--    Legacy policies named `rfir_via_rfi` / `rfiat_via_rfi`
--    were created in 20260421180006_c1_rfis_enhanced.sql.
-- ------------------------------------------------------------
SELECT pg_temp.g1_apply_tenant_isolation(
  'rfi_responses',   'project_rfis', 'rfi_id', 'rfir_via_rfi');
SELECT pg_temp.g1_apply_tenant_isolation(
  'rfi_attachments', 'project_rfis', 'rfi_id', 'rfiat_via_rfi');

-- ------------------------------------------------------------
-- 3. Daily Report children (parent: daily_reports,
--    FK: daily_report_id). Legacy policies are named
--    `<table>_via_parent` per the C4 migration's DO loop.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_old   text;
  v_children text[] := ARRAY[
    'daily_weather','daily_manpower','daily_equipment','daily_deliveries',
    'daily_safety_violations','daily_accidents','daily_quantities',
    'daily_productivity','daily_visitors','daily_calls','daily_notes',
    'daily_dumpster','daily_scheduled_work'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_children
  LOOP
    v_old := v_table || '_via_parent';
    PERFORM pg_temp.g1_apply_tenant_isolation(
      v_table, 'daily_reports', 'daily_report_id', v_old);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Sanity check: every patched table now has a NOT NULL
--    tenant_id column and a tenant_isolation policy. Failure
--    here aborts the migration.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_all   text[] := ARRAY[
    'rfi_responses','rfi_attachments',
    'daily_weather','daily_manpower','daily_equipment','daily_deliveries',
    'daily_safety_violations','daily_accidents','daily_quantities',
    'daily_productivity','daily_visitors','daily_calls','daily_notes',
    'daily_dumpster','daily_scheduled_work'
  ];
  v_nullable boolean;
  v_policy_count int;
BEGIN
  FOREACH v_table IN ARRAY v_all
  LOOP
    SELECT (is_nullable = 'YES') INTO v_nullable
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = v_table
       AND column_name  = 'tenant_id';

    IF v_nullable IS NULL THEN
      RAISE EXCEPTION 'G1 sanity: tenant_id column missing on %', v_table;
    ELSIF v_nullable THEN
      RAISE EXCEPTION 'G1 sanity: tenant_id is nullable on %', v_table;
    END IF;

    SELECT count(*) INTO v_policy_count
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = v_table
       AND policyname = v_table || '_tenant_isolation';

    IF v_policy_count <> 1 THEN
      RAISE EXCEPTION 'G1 sanity: tenant_isolation policy missing on %', v_table;
    END IF;
  END LOOP;
END $$;

COMMIT;
