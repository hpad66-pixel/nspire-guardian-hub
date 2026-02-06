-- Remove all related data for Glorieta Garden while keeping the property record
DO $$
DECLARE
  prop_ids UUID[];
BEGIN
  SELECT array_agg(id)
  INTO prop_ids
  FROM public.properties
  WHERE name = 'Glorieta Garden';

  IF prop_ids IS NULL OR array_length(prop_ids, 1) = 0 THEN
    RAISE NOTICE 'No properties found with name "Glorieta Garden".';
    RETURN;
  END IF;

  -- Delete child data in safe order, only if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_items') THEN
    EXECUTE 'DELETE FROM public.inspection_items WHERE daily_inspection_id IN (
      SELECT id FROM public.daily_inspections WHERE property_id = ANY($1)
    )' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_inspections') THEN
    EXECUTE 'DELETE FROM public.daily_inspections WHERE property_id = ANY($1)' USING prop_ids;
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    EXECUTE 'DELETE FROM public.assets WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') THEN
    EXECUTE 'DELETE FROM public.units WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_team_members') THEN
    EXECUTE 'DELETE FROM public.property_team_members WHERE property_id = ANY($1)' USING prop_ids;
  END IF;

  -- Add more deletes here if other property-linked tables exist
END $$;
