-- Voice agent work-order creation must use real enum values and explicit casts.
-- Production was failing with:
--   column "status" is of type work_order_status but expression is of type text
-- Also, "pending_approval" is not a valid work_order_status in this schema.

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
  v_wo_status work_order_status;
  v_severity severity_level;
  v_caller TEXT;
  v_phone TEXT;
  v_supervisor UUID;
BEGIN
  IF NEW.work_order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.demo_seed, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_emergency OR NEW.urgency_level IN ('emergency', 'urgent') THEN
    v_severity := 'severe'::severity_level;
    v_wo_priority := 'emergency'::work_order_priority;
  ELSE
    v_severity := 'low'::severity_level;
    v_wo_priority := 'routine'::work_order_priority;
  END IF;

  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'maintenance_requests.property_id is required to create a work order';
  END IF;

  v_caller := COALESCE(NULLIF(BTRIM(NEW.caller_name), ''), 'Resident');
  v_phone := COALESCE(NULLIF(BTRIM(NEW.caller_phone), ''), 'not provided');
  v_supervisor := public.resolve_property_ops_supervisor(NEW.property_id);
  v_wo_status := CASE
    WHEN v_supervisor IS NOT NULL THEN 'assigned'::work_order_status
    ELSE 'pending'::work_order_status
  END;

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
      WHEN v_severity = 'severe'::severity_level THEN (CURRENT_DATE + INTERVAL '1 day')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END,
    NEW.id
  ) RETURNING id INTO v_issue_id;

  INSERT INTO public.work_orders (
    property_id, unit_id, issue_id, title, description,
    priority, status, due_date,
    requester_name, supervisor_id, assigned_to, assigned_at, intake_source
  ) VALUES (
    NEW.property_id,
    NEW.unit_id,
    v_issue_id,
    'Maint Request #' || COALESCE(NEW.ticket_number::text, '-') || ': ' || COALESCE(NULLIF(BTRIM(NEW.issue_category), ''), 'Maintenance'),
    'Voice agent request from ' || v_caller ||
    E'\nPhone: ' || v_phone ||
    E'\nIssue: ' || COALESCE(NEW.issue_description, '') ||
    CASE WHEN NEW.special_access_instructions IS NOT NULL
      THEN E'\nAccess: ' || NEW.special_access_instructions ELSE '' END,
    v_wo_priority,
    v_wo_status,
    CASE
      WHEN v_severity = 'severe'::severity_level THEN (CURRENT_DATE + INTERVAL '1 day')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END,
    v_caller,
    v_supervisor,
    v_supervisor,
    CASE WHEN v_supervisor IS NOT NULL THEN now() ELSE NULL END,
    'voice'
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
