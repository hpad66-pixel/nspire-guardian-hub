-- Remove all related data for Glorieta Gardens Apartments while keeping the property record
DO $$
DECLARE
  prop_ids UUID[];
BEGIN
  SELECT array_agg(id)
  INTO prop_ids
  FROM public.properties
  WHERE lower(name) = lower('Glorieta Gardens Apartments');

  IF prop_ids IS NULL OR array_length(prop_ids, 1) = 0 THEN
    RAISE NOTICE 'No properties found with name "Glorieta Gardens Apartments".';
    RETURN;
  END IF;

  -- Delete child data in safe order, only if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_order_comments') THEN
    EXECUTE 'DELETE FROM public.work_order_comments WHERE work_order_id IN (
      SELECT id FROM public.work_orders WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_order_activity') THEN
    EXECUTE 'DELETE FROM public.work_order_activity WHERE work_order_id IN (
      SELECT id FROM public.work_orders WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_items') THEN
    EXECUTE 'DELETE FROM public.inspection_items WHERE daily_inspection_id IN (
      SELECT id FROM public.daily_inspections WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_inspections') THEN
    EXECUTE 'DELETE FROM public.daily_inspections WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'defects') THEN
    EXECUTE 'DELETE FROM public.defects WHERE inspection_id IN (
      SELECT id FROM public.inspections WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspections') THEN
    EXECUTE 'DELETE FROM public.inspections WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_orders') THEN
    EXECUTE 'DELETE FROM public.work_orders WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'issues') THEN
    EXECUTE 'DELETE FROM public.issues WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'report_emails') THEN
    EXECUTE 'DELETE FROM public.report_emails WHERE property_id = ANY($1)
      OR project_id IN (SELECT id FROM public.projects WHERE property_id = ANY($1))'
    USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    EXECUTE 'DELETE FROM public.documents WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_documents') THEN
    EXECUTE 'DELETE FROM public.project_documents WHERE project_id IN (
      SELECT id FROM public.projects WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    EXECUTE 'DELETE FROM public.projects WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permits') THEN
    EXECUTE 'DELETE FROM public.permits WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    EXECUTE 'DELETE FROM public.contracts WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_request_activity') THEN
    EXECUTE 'DELETE FROM public.maintenance_request_activity WHERE request_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_requests') THEN
    EXECUTE 'DELETE FROM public.maintenance_requests WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_agent_config') THEN
    EXECUTE 'DELETE FROM public.voice_agent_config WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_contacts') THEN
    EXECUTE 'DELETE FROM public.crm_contacts WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    EXECUTE 'DELETE FROM public.assets WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    EXECUTE 'DELETE FROM public.tenants WHERE unit_id IN (
      SELECT id FROM public.units WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') THEN
    EXECUTE 'DELETE FROM public.units WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_invitations') THEN
    EXECUTE 'DELETE FROM public.user_invitations WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_archives') THEN
    EXECUTE 'DELETE FROM public.property_archives WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_team_members') THEN
    EXECUTE 'DELETE FROM public.property_team_members WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_status_history') THEN
    EXECUTE 'DELETE FROM public.user_status_history WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  -- Add more deletes here if other property-linked tables exist
END $$;
