-- Project lifecycle closeout: audited closure, administrator-only reopen, and
-- a database-enforced read-only boundary for project-owned records.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS close_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS pre_close_status public.project_status,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reopen_reason text;

COMMENT ON COLUMN public.projects.close_reason IS
  'Required administrator certification explaining why the project was closed.';
COMMENT ON COLUMN public.projects.close_snapshot IS
  'Immutable-at-close project and financial snapshot shown on the closed-project certificate.';

CREATE TABLE IF NOT EXISTS public.project_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('closed', 'reopened')),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 5),
  from_status public.project_status NOT NULL,
  to_status public.project_status NOT NULL,
  financial_snapshot jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_lifecycle_events_project_idx
  ON public.project_lifecycle_events(project_id, performed_at DESC);

ALTER TABLE public.project_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_lifecycle_events_select ON public.project_lifecycle_events;
CREATE POLICY project_lifecycle_events_select
  ON public.project_lifecycle_events FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR workspace_id = public.get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.project_team_members ptm
      WHERE ptm.project_id = project_lifecycle_events.project_id
        AND ptm.user_id = auth.uid()
    )
  );

-- Lifecycle events are written only by the security-definer close/reopen RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.project_lifecycle_events FROM authenticated;

ALTER TABLE public.consulting_financial_closeouts
  ADD COLUMN IF NOT EXISTS is_reconciled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed_with_exception boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closure_reason text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.can_close_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
      FROM public.projects p
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
     WHERE p.id = p_project_id
       AND ur.role::text IN ('admin', 'owner', 'administrator')
       AND (
         public.is_super_admin()
         OR p.workspace_id = public.get_my_workspace_id()
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_reopen_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
      FROM public.projects p
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
     WHERE p.id = p_project_id
       AND ur.role::text = 'admin'
       AND p.workspace_id = public.get_my_workspace_id()
  );
$$;

REVOKE ALL ON FUNCTION public.can_close_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_reopen_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_close_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_reopen_project(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_project(
  p_project_id uuid,
  p_reason text,
  p_allow_unreconciled boolean DEFAULT false
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_result public.projects%ROWTYPE;
  v_position public.v_consulting_financial_position%ROWTYPE;
  v_has_position boolean := false;
  v_snapshot jsonb;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  SELECT * INTO v_project
    FROM public.projects
   WHERE id = p_project_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT public.can_close_project(p_project_id) THEN
    RAISE EXCEPTION 'Only an authorized project administrator can close this project';
  END IF;
  IF length(v_reason) < 5 THEN
    RAISE EXCEPTION 'Enter a closeout reason of at least 5 characters';
  END IF;
  IF v_project.status = 'closed' THEN
    RETURN v_project;
  END IF;

  IF v_project.project_type IN ('consulting', 'client') THEN
    SELECT * INTO v_position
      FROM public.v_consulting_financial_position
     WHERE project_id = p_project_id;
    v_has_position := FOUND;

    IF v_has_position
       AND NOT COALESCE(v_position.is_reconciled, false)
       AND NOT COALESCE(p_allow_unreconciled, false) THEN
      RAISE EXCEPTION 'Financials are not fully reconciled. Resolve the open checks or use the administrator exception with a recorded reason.';
    END IF;
  END IF;

  v_snapshot := jsonb_build_object(
    'project_name', v_project.name,
    'project_type', v_project.project_type,
    'closed_at', now(),
    'closed_by', auth.uid(),
    'reason', v_reason,
    'closed_with_exception', v_has_position AND NOT COALESCE(v_position.is_reconciled, false),
    'financial_position', CASE WHEN v_has_position THEN to_jsonb(v_position) ELSE NULL END
  );

  IF v_has_position THEN
    INSERT INTO public.consulting_financial_closeouts (
      tenant_id, project_id, approved_revenue, invoiced_revenue, cash_received,
      total_costs, cash_paid, net_profit, margin_pct, notes, closed_by,
      is_reconciled, closed_with_exception, closure_reason, is_active,
      reopened_at, reopened_by
    ) VALUES (
      v_project.workspace_id, p_project_id, v_position.approved_revenue,
      v_position.invoiced_revenue, v_position.cash_received, v_position.total_costs,
      v_position.cash_paid, v_position.net_profit, v_position.margin_pct, v_reason,
      auth.uid(), COALESCE(v_position.is_reconciled, false),
      NOT COALESCE(v_position.is_reconciled, false), v_reason, true, NULL, NULL
    )
    ON CONFLICT (project_id) DO UPDATE SET
      approved_revenue = EXCLUDED.approved_revenue,
      invoiced_revenue = EXCLUDED.invoiced_revenue,
      cash_received = EXCLUDED.cash_received,
      total_costs = EXCLUDED.total_costs,
      cash_paid = EXCLUDED.cash_paid,
      net_profit = EXCLUDED.net_profit,
      margin_pct = EXCLUDED.margin_pct,
      notes = EXCLUDED.notes,
      reconciled_at = now(),
      closed_at = now(),
      closed_by = auth.uid(),
      is_reconciled = EXCLUDED.is_reconciled,
      closed_with_exception = EXCLUDED.closed_with_exception,
      closure_reason = EXCLUDED.closure_reason,
      is_active = true,
      reopened_at = NULL,
      reopened_by = NULL;
  END IF;

  PERFORM set_config('app.project_lifecycle_change', 'on', true);
  UPDATE public.projects
     SET status = 'closed',
         actual_end_date = COALESCE(actual_end_date, current_date),
         pre_close_status = v_project.status,
         closed_at = now(),
         closed_by = auth.uid(),
         close_reason = v_reason,
         close_snapshot = v_snapshot,
         reopened_at = NULL,
         reopened_by = NULL,
         reopen_reason = NULL,
         updated_at = now()
   WHERE id = p_project_id
   RETURNING * INTO v_result;

  INSERT INTO public.project_lifecycle_events (
    project_id, workspace_id, event_type, reason, from_status, to_status,
    financial_snapshot, performed_by
  ) VALUES (
    p_project_id, v_project.workspace_id, 'closed', v_reason,
    v_project.status, 'closed', v_snapshot, auth.uid()
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_project(
  p_project_id uuid,
  p_reason text
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_result public.projects%ROWTYPE;
  v_restore_status public.project_status;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  SELECT * INTO v_project
    FROM public.projects
   WHERE id = p_project_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT public.can_reopen_project(p_project_id) THEN
    RAISE EXCEPTION 'Only a workspace administrator can reopen a closed project';
  END IF;
  IF v_project.status <> 'closed' THEN
    RAISE EXCEPTION 'Only a closed project can be reopened';
  END IF;
  IF length(v_reason) < 5 THEN
    RAISE EXCEPTION 'Enter a reopen reason of at least 5 characters';
  END IF;

  v_restore_status := CASE
    WHEN v_project.pre_close_status IN ('planning', 'active', 'on_hold')
      THEN v_project.pre_close_status
    ELSE 'active'::public.project_status
  END;

  PERFORM set_config('app.project_lifecycle_change', 'on', true);
  UPDATE public.projects
     SET status = v_restore_status,
         reopened_at = now(),
         reopened_by = auth.uid(),
         reopen_reason = v_reason,
         updated_at = now()
   WHERE id = p_project_id
   RETURNING * INTO v_result;

  UPDATE public.consulting_financial_closeouts
     SET is_active = false,
         reopened_at = now(),
         reopened_by = auth.uid()
   WHERE project_id = p_project_id
     AND is_active;

  INSERT INTO public.project_lifecycle_events (
    project_id, workspace_id, event_type, reason, from_status, to_status,
    financial_snapshot, performed_by
  ) VALUES (
    p_project_id, v_project.workspace_id, 'reopened', v_reason,
    'closed', v_restore_status, v_project.close_snapshot, auth.uid()
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.close_project(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_project(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_project(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_project(uuid, text) TO authenticated;

-- Preserve the existing API while routing it through the authoritative project
-- lifecycle close. Existing bookmarks and callers continue to work.
CREATE OR REPLACE FUNCTION public.close_consulting_project(
  p_project_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.consulting_financial_closeouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.consulting_financial_closeouts%ROWTYPE;
BEGIN
  PERFORM public.close_project(p_project_id, p_notes, false);
  SELECT * INTO v_result
    FROM public.consulting_financial_closeouts
   WHERE project_id = p_project_id
     AND is_active;
  RETURN v_result;
END;
$$;

-- A closed project may be read and reported on, but not silently mutated.
CREATE OR REPLACE FUNCTION public.guard_closed_project_child_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_project_id uuid;
  v_new_project_id uuid;
  v_is_closed boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_project_id := OLD.project_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_project_id := NEW.project_id;
  END IF;

  IF v_old_project_id IS NOT NULL THEN
    SELECT p.status = 'closed' INTO v_is_closed
      FROM public.projects p
     WHERE p.id = v_old_project_id;

    IF COALESCE(v_is_closed, false) THEN
      RAISE EXCEPTION 'This project is closed and read-only. An administrator must reopen it before changes can be made.';
    END IF;
  END IF;

  IF v_new_project_id IS NOT NULL AND v_new_project_id IS DISTINCT FROM v_old_project_id THEN
    SELECT p.status = 'closed' INTO v_is_closed
      FROM public.projects p
     WHERE p.id = v_new_project_id;

    IF COALESCE(v_is_closed, false) THEN
      RAISE EXCEPTION 'This project is closed and read-only. An administrator must reopen it before changes can be made.';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_closed_project_row_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'This project is closed and read-only. Use the administrator reopen action first.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'closed' THEN
    IF NEW.status <> 'closed'
       AND public.can_reopen_project(OLD.id)
       AND NEW.reopened_at IS NOT NULL
       AND NEW.reopened_by IS NOT DISTINCT FROM auth.uid()
       AND length(btrim(COALESCE(NEW.reopen_reason, ''))) >= 5 THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'This project is closed and read-only. Use the administrator reopen action first.';
  END IF;

  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    -- Preserve the existing platform-super-admin tombstone workflow. This is
    -- a protected removal path, not a user-visible lifecycle closeout. A
    -- project that was already certified closed must still be reopened first.
    IF public.is_super_admin()
       AND NEW.deleted_at IS NOT NULL
       AND NEW.deleted_by IS NOT DISTINCT FROM auth.uid() THEN
      RETURN NEW;
    END IF;

    IF public.can_close_project(OLD.id)
       AND NEW.closed_at IS NOT NULL
       AND NEW.closed_by IS NOT DISTINCT FROM auth.uid()
       AND length(btrim(COALESCE(NEW.close_reason, ''))) >= 5
       AND NEW.close_snapshot IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Use the certified project closeout action to close this project.';
  END IF;

  RETURN NEW;
END;
$$;

-- Covers second-level records such as proposal lines, invoice lines, invoice
-- payments, cost payments, and other children whose parent owns project_id.
CREATE OR REPLACE FUNCTION public.guard_closed_project_indirect_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_table text := TG_ARGV[0];
  v_foreign_key text := TG_ARGV[1];
  v_old_parent_id text;
  v_new_parent_id text;
  v_is_closed boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_parent_id := to_jsonb(OLD) ->> v_foreign_key;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_parent_id := to_jsonb(NEW) ->> v_foreign_key;
  END IF;

  IF v_old_parent_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT p.status = ''closed'' FROM public.%I parent_row JOIN public.projects p ON p.id = parent_row.project_id WHERE parent_row.id::text = $1',
      v_parent_table
    ) INTO v_is_closed USING v_old_parent_id;
    IF COALESCE(v_is_closed, false) THEN
      RAISE EXCEPTION 'This project is closed and read-only. An administrator must reopen it before changes can be made.';
    END IF;
  END IF;

  IF v_new_parent_id IS NOT NULL AND v_new_parent_id IS DISTINCT FROM v_old_parent_id THEN
    EXECUTE format(
      'SELECT p.status = ''closed'' FROM public.%I parent_row JOIN public.projects p ON p.id = parent_row.project_id WHERE parent_row.id::text = $1',
      v_parent_table
    ) INTO v_is_closed USING v_new_parent_id;
    IF COALESCE(v_is_closed, false) THEN
      RAISE EXCEPTION 'This project is closed and read-only. An administrator must reopen it before changes can be made.';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_closed_project_row_write_trg ON public.projects;
CREATE TRIGGER guard_closed_project_row_write_trg
  BEFORE UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_project_row_write();

DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'project_id'
       AND c.udt_name = 'uuid'
       AND t.table_type = 'BASE TABLE'
       AND c.table_name NOT IN ('projects', 'project_lifecycle_events')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_closed_project_write_trg ON public.%I', v_table.table_name);
    EXECUTE format(
      'CREATE TRIGGER guard_closed_project_write_trg BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_closed_project_child_write()',
      v_table.table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_fk record;
  v_trigger_name text;
BEGIN
  FOR v_fk IN
    SELECT
      con.oid,
      child.relname AS child_table,
      parent.relname AS parent_table,
      child_col.attname AS child_foreign_key
    FROM pg_constraint con
    JOIN pg_class child ON child.oid = con.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN pg_attribute child_col
      ON child_col.attrelid = con.conrelid
     AND child_col.attnum = con.conkey[1]
    JOIN pg_attribute parent_col
      ON parent_col.attrelid = con.confrelid
     AND parent_col.attnum = con.confkey[1]
    WHERE con.contype = 'f'
      AND child_ns.nspname = 'public'
      AND parent_ns.nspname = 'public'
      AND child.relkind IN ('r', 'p')
      AND cardinality(con.conkey) = 1
      AND cardinality(con.confkey) = 1
      AND parent_col.attname = 'id'
      AND EXISTS (
        SELECT 1 FROM pg_attribute project_col
         WHERE project_col.attrelid = parent.oid
           AND project_col.attname = 'project_id'
           AND NOT project_col.attisdropped
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute direct_project_col
         WHERE direct_project_col.attrelid = child.oid
           AND direct_project_col.attname = 'project_id'
           AND NOT direct_project_col.attisdropped
      )
  LOOP
    v_trigger_name := 'guard_closed_project_indirect_' || substr(md5(v_fk.oid::text), 1, 12);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_trigger_name, v_fk.child_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_closed_project_indirect_write(%L, %L)',
      v_trigger_name,
      v_fk.child_table,
      v_fk.parent_table,
      v_fk.child_foreign_key
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
