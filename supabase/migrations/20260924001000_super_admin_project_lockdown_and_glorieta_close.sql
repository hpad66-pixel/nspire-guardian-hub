-- Super-admin project lockdown and Glorieta Conveyance closeout.
--
-- Closed projects are authoritative records. The app already blocks writes to
-- closed project-owned rows; this migration tightens close/reopen authority to
-- platform super admins and marks the finalized Glorieta Conveyance project as
-- completed and locked without changing its underlying financial records.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_close_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.can_reopen_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin();
$$;

REVOKE ALL ON FUNCTION public.can_close_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_reopen_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_close_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_reopen_project(uuid) TO authenticated;

DO $$
DECLARE
  v_project_id uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  v_project public.projects%ROWTYPE;
  v_reason text := 'Glorieta Gardens Conveyance and Close-Out is finalized. Project records are locked for read-only review; any change request must be routed to hardeep@apas.ai.';
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_project
    FROM public.projects
   WHERE id = v_project_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Glorieta Conveyance project % not found; skipping closeout lock', v_project_id;
    RETURN;
  END IF;

  IF v_project.status = 'closed' THEN
    RAISE NOTICE 'Glorieta Conveyance project % is already closed; leaving existing closeout intact', v_project_id;
    RETURN;
  END IF;

  v_snapshot := jsonb_build_object(
    'project_name', v_project.name,
    'project_type', v_project.project_type,
    'closed_at', now(),
    'closed_by', NULL,
    'reason', v_reason,
    'lockdown_policy', 'super_admin_only_reopen',
    'administrator_contact', 'hardeep@apas.ai',
    'financial_position', NULL
  );

  -- The row trigger intentionally requires the close RPC for normal app use.
  -- This data migration is a controlled production closeout for one finalized
  -- project, so the trigger is disabled only around this metadata update.
  ALTER TABLE public.projects DISABLE TRIGGER guard_closed_project_row_write_trg;

  UPDATE public.projects
     SET status = 'closed',
         actual_end_date = COALESCE(actual_end_date, current_date),
         pre_close_status = v_project.status,
         closed_at = now(),
         closed_by = NULL,
         close_reason = v_reason,
         close_snapshot = v_snapshot,
         reopened_at = NULL,
         reopened_by = NULL,
         reopen_reason = NULL,
         updated_at = now()
   WHERE id = v_project_id;

  ALTER TABLE public.projects ENABLE TRIGGER guard_closed_project_row_write_trg;

  INSERT INTO public.project_lifecycle_events (
    project_id, workspace_id, event_type, reason, from_status, to_status,
    financial_snapshot, performed_by
  )
  VALUES (
    v_project_id, v_project.workspace_id, 'closed', v_reason,
    v_project.status, 'closed', v_snapshot, NULL
  );

  RAISE NOTICE 'Closed and locked Glorieta Conveyance project %', v_project_id;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.projects ENABLE TRIGGER guard_closed_project_row_write_trg;
  RAISE;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
