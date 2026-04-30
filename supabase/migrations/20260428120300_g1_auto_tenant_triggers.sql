-- ============================================================
-- G1.1 · Auto-fill tenant_id on RFI + Daily Report children
-- ============================================================
-- Follow-up to G1 (20260428120000). G1 made tenant_id NOT NULL
-- on the 15 patched child tables, but existing client code
-- does not set tenant_id on insert -- e.g. useProcoreRfis.ts:41
-- (rfi_responses) and the generic useDailyCategory.add hook in
-- useDailyLog.ts (all 13 daily_* tabs). Without this migration,
-- every fresh insert from those code paths fails with
-- "null value in column tenant_id ... violates not-null".
--
-- This migration adds BEFORE INSERT triggers that derive
-- tenant_id from the parent row's tenant chain when the client
-- omits it. The trigger only fires when NEW.tenant_id IS NULL,
-- so explicit client-set values pass through untouched. RLS
-- WITH CHECK still validates the resulting NEW.tenant_id
-- against current_tenant_id(), so a spoofed parent_id pointing
-- at another tenant is still rejected at the policy boundary.
--
-- Tenant chain (same as G1's backfill):
--   child -> parent.project_id -> projects.property_id ->
--   properties.workspace_id
--
-- Trigger ordering on rfi_attachments: BEFORE row triggers
-- fire alphabetically. `rfi_attachments_fill_tenant` runs
-- before `rfi_attachments_tenant_boundary` (G2), so the
-- boundary check sees the filled value and validates it
-- against the document/photo/drawing_markup parent's tenant.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helper for rfi_* children (parent FK: rfi_id).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_tenant_from_rfi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT p.workspace_id INTO v_tenant
    FROM public.project_rfis r
    JOIN public.projects     pr ON pr.id = r.project_id
    JOIN public.properties    p ON p.id = pr.property_id
   WHERE r.id = NEW.rfi_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION
      'fill_tenant_from_rfi: cannot resolve tenant for rfi_id=%',
      NEW.rfi_id
      USING ERRCODE = '23502';
  END IF;

  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fill_tenant_from_rfi() FROM PUBLIC;

-- ------------------------------------------------------------
-- Helper for daily_* children (parent FK: daily_report_id).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_tenant_from_daily_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT p.workspace_id INTO v_tenant
    FROM public.daily_reports d
    JOIN public.projects      pr ON pr.id = d.project_id
    JOIN public.properties     p ON p.id = pr.property_id
   WHERE d.id = NEW.daily_report_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION
      'fill_tenant_from_daily_report: cannot resolve tenant for daily_report_id=%',
      NEW.daily_report_id
      USING ERRCODE = '23502';
  END IF;

  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fill_tenant_from_daily_report() FROM PUBLIC;

-- ------------------------------------------------------------
-- Per-table triggers, re-runnable.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_rfi_children text[] := ARRAY['rfi_responses','rfi_attachments'];
  v_dr_children  text[] := ARRAY[
    'daily_weather','daily_manpower','daily_equipment','daily_deliveries',
    'daily_safety_violations','daily_accidents','daily_quantities',
    'daily_productivity','daily_visitors','daily_calls','daily_notes',
    'daily_dumpster','daily_scheduled_work'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_rfi_children LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                   v_table || '_fill_tenant', v_table);
    EXECUTE format($q$
      CREATE TRIGGER %I
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        WHEN (NEW.tenant_id IS NULL)
        EXECUTE FUNCTION public.fill_tenant_from_rfi()
    $q$, v_table || '_fill_tenant', v_table);
  END LOOP;

  FOREACH v_table IN ARRAY v_dr_children LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                   v_table || '_fill_tenant', v_table);
    EXECUTE format($q$
      CREATE TRIGGER %I
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        WHEN (NEW.tenant_id IS NULL)
        EXECUTE FUNCTION public.fill_tenant_from_daily_report()
    $q$, v_table || '_fill_tenant', v_table);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Sanity check: every patched table now carries the auto-fill
-- trigger.
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
BEGIN
  FOREACH v_table IN ARRAY v_all LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgname  = v_table || '_fill_tenant'
         AND tgrelid = ('public.'||v_table)::regclass
    ) THEN
      RAISE EXCEPTION 'G1.1 sanity: fill_tenant trigger missing on %', v_table;
    END IF;
  END LOOP;
END $$;

COMMIT;
