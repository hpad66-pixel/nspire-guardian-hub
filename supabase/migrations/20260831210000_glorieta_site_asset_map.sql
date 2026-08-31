-- Glorieta Gardens site asset map seed.
-- Source of truth: 3TCI sanitary sewer as-builts (Buildings 3, 5 & 6).
-- Manholes S-1…S-8 + 24 cleanouts (CO-01…CO-24 assigned clockwise; sheets
-- label them only as “3" CLEANOUT”). Retention pond POND-1 included because
-- the owner confirmed it on site. No catch basins / pump station — not on sheets.

DO $$
DECLARE
  v_project uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  v_property uuid;
  v_existing integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE NOTICE 'Glorieta Conveyance project not found — skipping site map seed';
    RETURN;
  END IF;

  SELECT property_id INTO v_property FROM public.projects WHERE id = v_project;
  IF v_property IS NULL THEN
    -- Fall back to a Glorieta-named property if the project link is missing.
    SELECT id INTO v_property
      FROM public.properties
     WHERE name ILIKE '%glorieta%'
     ORDER BY created_at
     LIMIT 1;
  END IF;

  IF v_property IS NULL THEN
    RAISE NOTICE 'Glorieta property not found — skipping site map asset seed';
  ELSE
    SELECT COUNT(*) INTO v_existing
      FROM public.assets
     WHERE property_id = v_property
       AND name ~ '^(S-[1-8]|CO-[0-9]{2}|POND-1)$';

    IF v_existing > 0 THEN
      RAISE NOTICE 'Glorieta site-map assets already present (% rows) — skipping insert', v_existing;
    ELSE
      -- Manholes S-1…S-8 (drawing numbers preserved)
      INSERT INTO public.assets (property_id, name, asset_type, location_description, latitude, longitude, status)
      VALUES
        (v_property, 'S-1', 'manhole', 'Building 3 · New san. manhole S-1 · Line 1 · Rim ~5.08''', 25.9097, -80.2428, 'active'),
        (v_property, 'S-2', 'manhole', 'Building 3 · New san. manhole S-2 · Line 1 · Rim ~6.05''', 25.9076, -80.2416, 'active'),
        (v_property, 'S-3', 'manhole', 'Building 3 · New san. manhole S-3 · Line 2 · Rim ~5.38''', 25.9073, -80.2448, 'active'),
        (v_property, 'S-4', 'manhole', 'Building 3 / 7 · New san. manhole S-4 · Line 2 · Rim ~5.80''', 25.9060, -80.2460, 'active'),
        (v_property, 'S-5', 'manhole', 'Alexandria / Line 3 · New san. manhole S-5', 25.9099, -80.2580, 'active'),
        (v_property, 'S-6', 'manhole', 'Building 5 north · New san. manhole S-6 · Rim 6.21'' · Inv. 0.86''', 25.9096, -80.2520, 'active'),
        (v_property, 'S-7', 'manhole', 'Building 5 / 6 west · New san. manhole S-7 · Rim 5.80''', 25.9087, -80.2564, 'active'),
        (v_property, 'S-8', 'manhole', 'Building 5 east · New san. manhole S-8 · Rim 5.83'' · Inv. 2.26''', 25.9084, -80.2484, 'active');

      -- Cleanouts CO-01…CO-24 (assigned clockwise; sheets say “3" CLEANOUT” without numbers)
      INSERT INTO public.assets (property_id, name, asset_type, location_description, latitude, longitude, status)
      SELECT
        v_property,
        'CO-' || lpad(g.i::text, 2, '0'),
        'cleanout',
        CASE WHEN g.i <= 12
          THEN 'Building 5 · 3" cleanout — sanitary lateral (as-built) · CO-' || lpad(g.i::text, 2, '0')
          ELSE 'Building 6 · 3" cleanout — sanitary lateral (as-built) · CO-' || lpad(g.i::text, 2, '0')
        END,
        25.9058 - ((g.i % 12) * 0.00004),
        -80.2504 + ((g.i - 12.5) * 0.00005),
        'active'
      FROM generate_series(1, 24) AS g(i);

      -- Retention pond — confirmed on site by owner (not on sanitary as-built sheets)
      INSERT INTO public.assets (property_id, name, asset_type, location_description, latitude, longitude, status)
      VALUES (
        v_property,
        'POND-1',
        'retention_pond',
        'Retention Pond · primary stormwater storage — location confirmed on site; survey pending',
        25.9027,
        -80.2428,
        'active'
      );

      RAISE NOTICE 'Seeded Glorieta site-map assets on property %', v_property;
    END IF;
  END IF;

  -- Enable Site Map module on Conveyance + owner portal surface
  UPDATE public.projects
     SET module_config = COALESCE(module_config, '{}'::jsonb)
       || jsonb_build_object('site-map', true, 'permits', true)
   WHERE id = v_project;

  RAISE NOTICE 'Enabled site-map module on Conveyance project';
END
$$;
