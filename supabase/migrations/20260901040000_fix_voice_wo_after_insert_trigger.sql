-- Voice agent → maintenance_request → work_order was silently failing.
-- The auto-create trigger ran BEFORE INSERT and tried to set
-- issues.maintenance_request_id = NEW.id while the MR row did not exist yet,
-- so the FK check aborted the whole insert (no ticket, no WO).
-- Switch to AFTER INSERT and link work_order_id via UPDATE.

CREATE OR REPLACE FUNCTION public.create_issue_and_wo_from_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_issue_id UUID;
  v_wo_id UUID;
  v_wo_priority work_order_priority;
  v_severity severity_level;
  v_caller TEXT;
  v_phone TEXT;
BEGIN
  -- Skip if a work order is already linked (e.g. re-seed paths)
  IF NEW.work_order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Demo seed inserts disable this trigger; keep a belt-and-suspenders skip.
  IF COALESCE(NEW.demo_seed, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_emergency OR NEW.urgency_level IN ('emergency', 'urgent') THEN
    v_severity := 'severe';
    v_wo_priority := 'emergency';
  ELSE
    v_severity := 'low';
    v_wo_priority := 'routine';
  END IF;

  -- property_id is required on issues / work_orders
  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'maintenance_requests.property_id is required to create a work order';
  END IF;

  v_caller := COALESCE(NULLIF(BTRIM(NEW.caller_name), ''), 'Resident');
  v_phone := COALESCE(NULLIF(BTRIM(NEW.caller_phone), ''), 'not provided');

  INSERT INTO public.issues (
    property_id, unit_id, source_module, title, description,
    severity, status, deadline, maintenance_request_id
  ) VALUES (
    NEW.property_id,
    NEW.unit_id,
    'voice_agent',
    COALESCE(NULLIF(BTRIM(NEW.issue_category), ''), 'Maintenance') || ': ' || COALESCE(NEW.issue_subcategory, 'General'),
    'Caller: ' || v_caller || ' (' || v_phone || ')' ||
    E'\nUnit: ' || COALESCE(NEW.caller_unit_number, 'N/A') ||
    E'\nDescription: ' || COALESCE(NEW.issue_description, '') ||
    CASE WHEN NEW.issue_location IS NOT NULL THEN E'\nLocation: ' || NEW.issue_location ELSE '' END,
    v_severity,
    'open',
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END,
    NEW.id
  ) RETURNING id INTO v_issue_id;

  INSERT INTO public.work_orders (
    property_id, unit_id, issue_id, title, description,
    priority, status, due_date
  ) VALUES (
    NEW.property_id,
    NEW.unit_id,
    v_issue_id,
    'Maint Request #' || COALESCE(NEW.ticket_number::text, '—') || ': ' || COALESCE(NULLIF(BTRIM(NEW.issue_category), ''), 'Maintenance'),
    'Voice agent request from ' || v_caller ||
    E'\nPhone: ' || v_phone ||
    E'\nIssue: ' || COALESCE(NEW.issue_description, '') ||
    CASE WHEN NEW.special_access_instructions IS NOT NULL
      THEN E'\nAccess: ' || NEW.special_access_instructions ELSE '' END,
    v_wo_priority,
    'pending_approval',
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END
  ) RETURNING id INTO v_wo_id;

  UPDATE public.maintenance_requests
  SET work_order_id = v_wo_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_issue_wo_from_maintenance_request ON public.maintenance_requests;

CREATE TRIGGER auto_create_issue_wo_from_maintenance_request
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_issue_and_wo_from_maintenance_request();
