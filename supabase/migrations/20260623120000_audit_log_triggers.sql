-- ─────────────────────────────────────────────────────────────────────────────
-- Audit log capture (QA #4). The activity_log table + read UI already existed, but
-- almost nothing wrote to it. This adds a generic AFTER INSERT/UPDATE/DELETE trigger
-- that records who did what, when, to which record — on the financial + operational
-- tables.
--
-- Safety: the trigger is SECURITY DEFINER (writes regardless of RLS) and wraps its
-- INSERT in an exception block, so a logging failure can NEVER abort or block the
-- underlying business write. Tenant comes from workspace_id or tenant_id (whichever
-- the table uses); actor from auth.uid().
--
-- Retention: events are kept indefinitely for now (a retention job can be added
-- later). Logging starts as of this migration — prior history can't be reconstructed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_activity_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec   jsonb;
  ws    uuid;
  eid   uuid;   -- activity_log.entity_id is uuid; cast (not text) or the insert fails
  etype text;
  act   text;
BEGIN
  IF TG_OP = 'DELETE' THEN rec := to_jsonb(OLD); act := 'delete';
  ELSIF TG_OP = 'UPDATE' THEN rec := to_jsonb(NEW); act := 'update';
  ELSE rec := to_jsonb(NEW); act := 'create';
  END IF;

  -- Tenant + record id, tolerant of whichever columns the table uses.
  BEGIN ws := NULLIF(COALESCE(rec->>'workspace_id', rec->>'tenant_id'), '')::uuid;
  EXCEPTION WHEN OTHERS THEN ws := NULL; END;

  BEGIN eid := NULLIF(rec->>'id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN eid := NULL; END;
  IF eid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  etype := CASE TG_TABLE_NAME
    WHEN 'change_orders'              THEN 'change_order'
    WHEN 'prime_contract_pay_apps'   THEN 'pay_app'
    WHEN 'prime_contract_payments'   THEN 'payment'
    WHEN 'commitment_payments'       THEN 'payment'
    WHEN 'prime_payment_allocations' THEN 'payment_allocation'
    WHEN 'commitments'               THEN 'commitment'
    WHEN 'lien_releases'             THEN 'lien_release'
    WHEN 'client_updates'            THEN 'client_update'
    WHEN 'issues'                    THEN 'issue'
    WHEN 'work_orders'               THEN 'work_order'
    WHEN 'daily_reports'             THEN 'daily_report'
    WHEN 'projects'                  THEN 'project'
    WHEN 'project_meetings'          THEN 'meeting'
    ELSE TG_TABLE_NAME
  END;

  -- Auditing must never break the business write. activity_log has no tenant
  -- column, so the originating tenant (when present on the row) is kept in `changes`.
  BEGIN
    INSERT INTO public.activity_log (action, entity_type, entity_id, user_id, changes, created_at)
    VALUES (act, etype, eid, auth.uid(),
            CASE WHEN ws IS NOT NULL THEN jsonb_build_object('tenant_id', ws) ELSE NULL END,
            now());
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to the financial + operational tables — only the ones that actually exist.
DO $$
DECLARE
  t     text;
  tbls  text[] := ARRAY[
    'change_orders', 'prime_contract_pay_apps', 'prime_contract_payments',
    'commitments', 'commitment_payments', 'prime_payment_allocations',
    'lien_releases', 'client_updates',
    'issues', 'work_orders', 'daily_reports', 'projects', 'project_meetings'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.log_activity_event()', t, t);
    END IF;
  END LOOP;
END $$;

-- The read/stats queries order by created_at desc with a limit.
CREATE INDEX IF NOT EXISTS idx_activity_log_created
  ON public.activity_log (created_at DESC);
