-- ============================================================
-- Phase 2 Seed helpers — idempotent demo-data function.
-- Call from the UI (Admin → Seed Phase 2 Demo) or via edge function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_phase2_demo(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant in JWT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- 3 project locations
  INSERT INTO public.project_locations (tenant_id, project_id, name, level)
  SELECT v_tenant, p_project_id, name, 1
  FROM (VALUES ('Floor 1'),('Floor 2'),('Roof')) AS v(name)
  ON CONFLICT DO NOTHING;

  -- 1 drawing set + 5 drawings
  WITH ds AS (
    INSERT INTO public.drawing_sets (tenant_id, project_id, name, status)
    VALUES (v_tenant, p_project_id, 'Issued for Construction', 'active')
    RETURNING id
  ), d AS (
    INSERT INTO public.drawings (tenant_id, project_id, set_id, sheet_number, title)
    SELECT v_tenant, p_project_id, ds.id, 'A-10' || g, 'Plan Sheet A-10' || g
    FROM ds, generate_series(1,5) g
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM d;
  v_result := v_result || jsonb_build_object('drawings', v_count);

  -- 1 spec set + sections
  WITH sps AS (
    INSERT INTO public.specification_sets (tenant_id, project_id, name, status)
    VALUES (v_tenant, p_project_id, 'Project Manual', 'active')
    RETURNING id
  ), sec AS (
    INSERT INTO public.specification_sections (tenant_id, set_id, division, section_number, title)
    SELECT v_tenant, sps.id, d, sn, t
    FROM sps, (VALUES
      ('03 Concrete','03 30 00','Cast-in-Place Concrete'),
      ('05 Metals','05 10 00','Structural Steel'),
      ('09 Finishes','09 20 00','Gypsum Board')
    ) AS v(d, sn, t)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM sec;
  v_result := v_result || jsonb_build_object('spec_sections', v_count);

  -- 3 punch items
  INSERT INTO public.punch_items (project_id, priority, due_date)
  SELECT p_project_id, 'medium', current_date + 7
  FROM generate_series(1,3);

  RETURN v_result;
END;
$$;
