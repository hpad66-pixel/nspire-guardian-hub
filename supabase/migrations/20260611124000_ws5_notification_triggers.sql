-- ============================================================
-- WS-5 · #13 · Populate the notifications bell.
-- ============================================================
-- public.notifications was queried by the bell but nothing ever wrote
-- to it, so it was always empty. Add SECURITY DEFINER triggers that
-- insert a row on key events:
--   • RFI created and assigned        -> notify the assignee
--   • RFI answered (status change)    -> notify the asker (created_by)
--   • Submittal status change         -> notify the submitter (created_by)
--   • Punch item assigned             -> notify the assignee
--
-- Helper avoids self-notification (no row when the actor is the target)
-- and no-ops when the target user is null. SECURITY DEFINER lets the
-- trigger insert a notification owned by another user despite RLS.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_message   text,
  p_entity    text,
  p_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity, p_entity_id);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification(uuid, text, text, text, text, uuid) FROM PUBLIC;

-- ── RFIs ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_rfi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
      PERFORM public.enqueue_notification(
        NEW.assigned_to, 'assignment',
        'New RFI assigned: RFI-' || lpad(NEW.rfi_number::text, 3, '0'),
        NEW.subject, 'rfi', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Answered / status moved → tell the asker.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.created_by IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM COALESCE(NEW.responded_by, NEW.assigned_to) THEN
      PERFORM public.enqueue_notification(
        NEW.created_by, 'status_change',
        'RFI-' || lpad(NEW.rfi_number::text, 3, '0') || ' is now ' || NEW.status,
        NEW.subject, 'rfi', NEW.id);
    END IF;
    -- Re-assigned → tell the new assignee.
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
      PERFORM public.enqueue_notification(
        NEW.assigned_to, 'assignment',
        'RFI assigned to you: RFI-' || lpad(NEW.rfi_number::text, 3, '0'),
        NEW.subject, 'rfi', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rfi ON public.project_rfis;
CREATE TRIGGER trg_notify_rfi
  AFTER INSERT OR UPDATE ON public.project_rfis
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_rfi();

-- ── Submittals ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_submittal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.created_by IS NOT NULL
     AND NEW.created_by IS DISTINCT FROM NEW.reviewed_by THEN
    PERFORM public.enqueue_notification(
      NEW.created_by, 'status_change',
      'Submittal #' || NEW.submittal_number || ' is now ' || NEW.status,
      NEW.title, 'submittal', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_submittal ON public.project_submittals;
CREATE TRIGGER trg_notify_submittal
  AFTER UPDATE ON public.project_submittals
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_submittal();

-- ── Punch items (assignment) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_punch_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
     AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
    PERFORM public.enqueue_notification(
      NEW.assigned_to, 'assignment',
      'Punch item assigned to you',
      NEW.description, 'punch_item', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_punch_assignment ON public.punch_items;
CREATE TRIGGER trg_notify_punch_assignment
  AFTER INSERT OR UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_punch_assignment();

COMMIT;
