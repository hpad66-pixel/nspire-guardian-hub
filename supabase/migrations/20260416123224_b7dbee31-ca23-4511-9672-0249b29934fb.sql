
-- Trigger function: auto-create issue + work order from new maintenance request
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
BEGIN
  -- Map urgency to severity and WO priority
  IF NEW.is_emergency OR NEW.urgency_level = 'emergency' THEN
    v_severity := 'severe';
    v_wo_priority := 'emergency';
  ELSIF NEW.urgency_level = 'urgent' THEN
    v_severity := 'moderate';
    v_wo_priority := 'urgent';
  ELSE
    v_severity := 'low';
    v_wo_priority := 'routine';
  END IF;

  -- Create issue
  INSERT INTO public.issues (
    property_id,
    unit_id,
    source_module,
    title,
    description,
    severity,
    status,
    deadline,
    maintenance_request_id
  ) VALUES (
    NEW.property_id,
    NEW.unit_id,
    'voice_agent',
    NEW.issue_category || ': ' || COALESCE(NEW.issue_subcategory, 'General'),
    'Caller: ' || NEW.caller_name || ' (' || NEW.caller_phone || ')' ||
    E'\nUnit: ' || COALESCE(NEW.caller_unit_number, 'N/A') ||
    E'\nDescription: ' || NEW.issue_description ||
    CASE WHEN NEW.issue_location IS NOT NULL THEN E'\nLocation: ' || NEW.issue_location ELSE '' END,
    v_severity,
    'open',
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
      WHEN v_severity = 'moderate' THEN (CURRENT_DATE + INTERVAL '7 days')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END,
    NEW.id
  ) RETURNING id INTO v_issue_id;

  -- Create work order
  INSERT INTO public.work_orders (
    property_id,
    unit_id,
    issue_id,
    title,
    description,
    priority,
    status,
    due_date
  ) VALUES (
    NEW.property_id,
    NEW.unit_id,
    v_issue_id,
    'Maint Request #' || NEW.ticket_number || ': ' || NEW.issue_category,
    'Voice agent request from ' || NEW.caller_name ||
    E'\nPhone: ' || NEW.caller_phone ||
    E'\nIssue: ' || NEW.issue_description ||
    CASE WHEN NEW.special_access_instructions IS NOT NULL THEN E'\nAccess: ' || NEW.special_access_instructions ELSE '' END,
    v_wo_priority,
    'pending_approval',
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
      WHEN v_severity = 'moderate' THEN (CURRENT_DATE + INTERVAL '7 days')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END
  ) RETURNING id INTO v_wo_id;

  -- Link work order back to maintenance request
  NEW.work_order_id := v_wo_id;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER auto_create_issue_wo_from_maintenance_request
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_issue_and_wo_from_maintenance_request();
