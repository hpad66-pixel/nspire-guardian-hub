-- Re-seed Glorieta Stores with 6 months of mock traffic + enable Voice Agent module.
-- Fixes voice-agent WO priority mapping (urgent was invalid on work_order_priority).
-- Super-admin can call seed_stores_demo_data() / seed_voice_agent_demo() from the UI.

-- ─── 1. Fix voice → work-order priority (urgent is not a valid enum) ─────────

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
  IF NEW.is_emergency OR NEW.urgency_level IN ('emergency', 'urgent') THEN
    v_severity := 'severe';
    v_wo_priority := 'emergency';
  ELSE
    v_severity := 'low';
    v_wo_priority := 'routine';
  END IF;

  INSERT INTO public.issues (
    property_id, unit_id, source_module, title, description,
    severity, status, deadline, maintenance_request_id
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
    'Maint Request #' || NEW.ticket_number || ': ' || NEW.issue_category,
    'Voice agent request from ' || NEW.caller_name ||
    E'\nPhone: ' || NEW.caller_phone ||
    E'\nIssue: ' || NEW.issue_description ||
    CASE WHEN NEW.special_access_instructions IS NOT NULL
      THEN E'\nAccess: ' || NEW.special_access_instructions ELSE '' END,
    v_wo_priority,
    'pending_approval',
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
      ELSE (CURRENT_DATE + INTERVAL '30 days')::date
    END
  ) RETURNING id INTO v_wo_id;

  NEW.work_order_id := v_wo_id;
  RETURN NEW;
END;
$$;

-- ─── 2. Demo flag on maintenance_requests ───────────────────────────────────

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS demo_seed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_demo
  ON public.maintenance_requests (property_id)
  WHERE demo_seed = true;

-- ─── 3. Resolve Glorieta property helper ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_glorieta_stores_target(
  OUT o_project_id uuid,
  OUT o_property_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  o_project_id := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;

  IF EXISTS (SELECT 1 FROM public.projects WHERE id = o_project_id) THEN
    SELECT property_id INTO o_property_id FROM public.projects WHERE id = o_project_id;
  ELSE
    o_project_id := NULL;
  END IF;

  IF o_property_id IS NULL THEN
    SELECT id INTO o_property_id
      FROM public.properties
     WHERE name ILIKE '%glorieta%'
     ORDER BY created_at
     LIMIT 1;
  END IF;

  -- If we found a property but no project, keep project null (seed still works at property scope)
  IF o_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = o_project_id) THEN
    o_project_id := NULL;
  END IF;
END;
$$;

-- ─── 4. Expand reset to clear voice demo tickets ────────────────────────────

CREATE OR REPLACE FUNCTION public.reset_stores_demo_data(p_property_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx int := 0;
  v_lines int := 0;
  v_receipts int := 0;
  v_items int := 0;
  v_wos int := 0;
  v_units int := 0;
  v_mrs int := 0;
  v_issues int := 0;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reset stores demo data';
  END IF;

  -- Voice demo tickets (and orphan issues created from them if still open)
  DELETE FROM public.issues i
   WHERE i.source_module = 'voice_agent'
     AND EXISTS (
       SELECT 1 FROM public.maintenance_requests m
        WHERE m.id = i.maintenance_request_id
          AND m.demo_seed = true
          AND (p_property_id IS NULL OR m.property_id = p_property_id)
     );
  GET DIAGNOSTICS v_issues = ROW_COUNT;

  DELETE FROM public.maintenance_requests m
   WHERE m.demo_seed = true
     AND (p_property_id IS NULL OR m.property_id = p_property_id);
  GET DIAGNOSTICS v_mrs = ROW_COUNT;

  DELETE FROM public.inventory_transactions t
   WHERE t.demo_seed = true
     AND (p_property_id IS NULL OR t.property_id = p_property_id);
  GET DIAGNOSTICS v_tx = ROW_COUNT;

  DELETE FROM public.property_material_receipt_lines l
   WHERE l.demo_seed = true
     AND (
       p_property_id IS NULL
       OR EXISTS (
         SELECT 1 FROM public.property_material_receipts r
          WHERE r.id = l.receipt_id AND r.property_id = p_property_id
       )
     );
  GET DIAGNOSTICS v_lines = ROW_COUNT;

  DELETE FROM public.property_material_receipts r
   WHERE r.demo_seed = true
     AND (p_property_id IS NULL OR r.property_id = p_property_id);
  GET DIAGNOSTICS v_receipts = ROW_COUNT;

  DELETE FROM public.work_orders w
   WHERE w.demo_seed = true
     AND (p_property_id IS NULL OR w.property_id = p_property_id);
  GET DIAGNOSTICS v_wos = ROW_COUNT;

  DELETE FROM public.property_inventory_items i
   WHERE i.demo_seed = true
     AND (p_property_id IS NULL OR i.property_id = p_property_id);
  GET DIAGNOSTICS v_items = ROW_COUNT;

  DELETE FROM public.units u
   WHERE COALESCE(u.demo_seed, false) = true
     AND (p_property_id IS NULL OR u.property_id = p_property_id);
  GET DIAGNOSTICS v_units = ROW_COUNT;

  RETURN jsonb_build_object(
    'transactions', v_tx,
    'receipt_lines', v_lines,
    'receipts', v_receipts,
    'work_orders', v_wos,
    'items', v_items,
    'units', v_units,
    'maintenance_requests', v_mrs,
    'voice_issues', v_issues
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_stores_demo_data(uuid) TO authenticated;

-- ─── 5. Seed Stores (6 months) ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_stores_demo_data(
  p_property_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project uuid;
  v_property uuid;
  v_cfg jsonb;
  v_item_ids uuid[] := ARRAY[]::uuid[];
  v_unit_ids uuid[] := ARRAY[]::uuid[];
  v_wo_ids uuid[] := ARRAY[]::uuid[];
  v_receipt uuid;
  v_item uuid;
  v_unit uuid;
  v_wo uuid;
  i int;
  d date;
  v_month_offset int;
  v_qty numeric;
  cats text[] := ARRAY[
    'plumbing','plumbing','plumbing','plumbing','plumbing',
    'electrical','electrical','electrical','electrical',
    'hvac','hvac','hvac',
    'hardware','hardware','hardware',
    'paint','paint',
    'appliances','appliances',
    'safety','cleaning','grounds'
  ];
  names text[] := ARRAY[
    'Faucet cartridge (Moen 1225)','Toilet flapper 3"','Braided supply line 12"',
    'P-trap kit 1-1/2"','Shower cartridge','Duplex outlet 15A','GFCI outlet 20A',
    'Single-pole light switch','LED A19 bulb 60W','HVAC filter 16x20x1','Thermostat (digital)',
    'Condensate pan tabs','Deadbolt keyed alike','Strike plate heavy','Door closer arm',
    'Interior latex white (gal)','Patch compound 1qt','Stove drip pan set','Fridge door gasket',
    'Smoke / CO detector','Contractor trash bags 55gal','Irrigation spray head'
  ];
  skus text[] := ARRAY[
    'PL-FC-1225','PL-FL-3','PL-SL-12','PL-PT-15','PL-SH-CRT',
    'EL-OUT-15','EL-GFCI-20','EL-SW-SP','EL-LED-60',
    'HV-FIL-1620','HV-THERM','HV-COND',
    'HW-DB-KA','HW-STRIKE','HW-CLOSER',
    'PT-WHT-GAL','PT-PATCH',
    'AP-DRIP','AP-GASKET',
    'SF-SMOKE','CL-BAG-55','GR-IRR-HD'
  ];
  costs numeric[] := ARRAY[
    18.50, 8.25, 9.99, 12.40, 42.00,
    2.49, 18.99, 1.89, 3.29,
    6.49, 34.00, 7.99,
    28.00, 4.50, 55.00,
    32.00, 9.50,
    14.00, 48.00,
    29.99, 22.00, 6.75
  ];
  mins numeric[] := ARRAY[
    4, 6, 8, 4, 2,
    10, 4, 10, 12,
    8, 1, 4,
    3, 6, 1,
    2, 3,
    2, 1,
    2, 4, 6
  ];
  tech_names text[] := ARRAY['James Rivera','Greg Ortiz','Vanessa Cruz','Mike Alvarez'];
  requester_names text[] := ARRAY[
    'Tenant — Apt 204','Front desk (PM)','Maintenance lead','Tenant — Apt 512',
    'Tenant — Apt 308','Property manager','Tenant — Apt 115','Tenant — Apt 601'
  ];
  reasons text[] := ARRAY[
    'Leaking faucet','Toilet running','No hot water','Outlet sparking','AC not cooling',
    'Lock failure','Leak under sink','Broken switch','Smoke detector chirp','Door not latching',
    'Clogged drain','Filter replacement','Appliance drip','Irrigation head broken'
  ];
  v_issue_count int := 0;
  v_receipt_count int := 0;
BEGIN
  -- Allow migration (no JWT) and super-admins only
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can seed stores demo data';
  END IF;

  v_project := p_project_id;
  v_property := p_property_id;

  IF v_property IS NULL OR v_project IS NULL THEN
    SELECT o_project_id, o_property_id
      INTO v_project, v_property
      FROM public.resolve_glorieta_stores_target();
    IF p_property_id IS NOT NULL THEN v_property := p_property_id; END IF;
    IF p_project_id IS NOT NULL THEN v_project := p_project_id; END IF;
  END IF;

  IF v_property IS NULL THEN
    RAISE EXCEPTION 'No Glorieta property found to seed Stores demo';
  END IF;

  -- Ensure project points at property + enable modules
  IF v_project IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    UPDATE public.projects
       SET property_id = COALESCE(property_id, v_property)
     WHERE id = v_project;

    SELECT COALESCE(module_config, '{}'::jsonb) INTO v_cfg FROM public.projects WHERE id = v_project;
    v_cfg := v_cfg || jsonb_build_object('stores', true, 'voice-agent', true);
    UPDATE public.projects SET module_config = v_cfg WHERE id = v_project;
  END IF;

  -- Wipe prior demo for this property, then rebuild
  PERFORM public.reset_stores_demo_data(v_property);

  -- Units
  FOR i IN 1..12 LOOP
    INSERT INTO public.units (property_id, unit_number, status, bedrooms, bathrooms, demo_seed)
    VALUES (
      v_property,
      CASE
        WHEN i <= 4 THEN 'B3-' || lpad((100 + i)::text, 3, '0')
        WHEN i <= 8 THEN 'B5-' || lpad((200 + i - 4)::text, 3, '0')
        ELSE 'B6-' || lpad((300 + i - 8)::text, 3, '0')
      END,
      'occupied', 2, 1, true
    )
    RETURNING id INTO v_unit;
    v_unit_ids := array_append(v_unit_ids, v_unit);
  END LOOP;

  -- Catalog
  FOR i IN 1..array_length(names, 1) LOOP
    INSERT INTO public.property_inventory_items (
      property_id, name, sku, category, description, unit_of_measure,
      current_quantity, minimum_quantity, unit_cost, preferred_vendor,
      storage_location, is_active, demo_seed, linked_project_id
    ) VALUES (
      v_property, names[i], skus[i], cats[i],
      'Affordable housing maintenance stock — Glorieta Gardens 6-month stores demo',
      'each', 0, mins[i], costs[i], 'Home Depot',
      CASE
        WHEN cats[i] IN ('plumbing','hvac') THEN 'Cage A — Wet trades'
        WHEN cats[i] IN ('electrical','safety') THEN 'Cage B — Electrical / Life safety'
        ELSE 'Cage C — General / Finishes'
      END,
      true, true, v_project
    )
    RETURNING id INTO v_item;
    v_item_ids := array_append(v_item_ids, v_item);
  END LOOP;

  -- Six monthly Home Depot receipts (opening + replenishment)
  FOR v_month_offset IN 0..5 LOOP
    d := (date_trunc('month', CURRENT_DATE) - (v_month_offset || ' months')::interval)::date + 3;
    INSERT INTO public.property_material_receipts (
      property_id, project_id, vendor, receipt_number, purchased_at,
      total_amount, file_name, notes, demo_seed
    ) VALUES (
      v_property, v_project, 'Home Depot',
      'HD-26' || lpad((900 + v_month_offset)::text, 3, '0'),
      d, 0,
      'HD_receipt_' || to_char(d, 'YYYY_MM') || '.pdf',
      CASE WHEN v_month_offset = 5 THEN 'Opening stock — Glorieta maintenance cage'
           ELSE 'Monthly replenishment — burn-rate restock' END,
      true
    ) RETURNING id INTO v_receipt;
    v_receipt_count := v_receipt_count + 1;

    FOR i IN 1..array_length(v_item_ids, 1) LOOP
      -- Opening month: full stock; later months: top-movers + random top-ups
      IF v_month_offset = 5 OR i IN (1, 2, 5, 10, 13, 20) OR (i + v_month_offset) % 4 = 0 THEN
        v_qty := CASE
          WHEN v_month_offset = 5 THEN mins[i] * 4 + 8
          WHEN i = 1 THEN 12   -- faucet cartridges burn hard
          WHEN i = 10 THEN 16  -- filters
          ELSE 6
        END;
        INSERT INTO public.property_material_receipt_lines (
          receipt_id, item_id, description, quantity, unit_cost, line_total, demo_seed
        ) VALUES (
          v_receipt, v_item_ids[i], names[i], v_qty, costs[i], v_qty * costs[i], true
        );
        INSERT INTO public.inventory_transactions (
          item_id, property_id, transaction_type, quantity, unit_cost,
          linked_project_id, receipt_id, reference_number, vendor, notes,
          transaction_date, demo_seed
        ) VALUES (
          v_item_ids[i], v_property, 'received', v_qty, costs[i],
          v_project, v_receipt,
          'HD-26' || lpad((900 + v_month_offset)::text, 3, '0'),
          'Home Depot',
          'Demo receive ' || to_char(d, 'Mon YYYY'),
          d, true
        );
      END IF;
    END LOOP;

    UPDATE public.property_material_receipts r
       SET total_amount = (
         SELECT COALESCE(SUM(line_total), 0)
           FROM public.property_material_receipt_lines l
          WHERE l.receipt_id = r.id
       )
     WHERE r.id = v_receipt;
  END LOOP;

  -- Work orders across the window (keep some open for live issue demos)
  FOR i IN 1..24 LOOP
    INSERT INTO public.work_orders (
      property_id, unit_id, title, description, priority, status,
      due_date, requester_name, notes, demo_seed, linked_project_id, created_at
    ) VALUES (
      v_property,
      v_unit_ids[((i - 1) % array_length(v_unit_ids, 1)) + 1],
      reasons[((i - 1) % array_length(reasons, 1)) + 1] || ' — WO ' || i::text,
      'Demo maintenance work order for 6-month Stores analytics / owner report',
      CASE WHEN i % 7 = 0 THEN 'emergency'::public.work_order_priority
           ELSE 'routine'::public.work_order_priority END,
      CASE
        WHEN i <= 16 THEN 'completed'::public.work_order_status
        WHEN i <= 20 THEN 'in_progress'::public.work_order_status
        ELSE 'assigned'::public.work_order_status
      END,
      CURRENT_DATE - (180 - i * 7),
      requester_names[((i - 1) % array_length(requester_names, 1)) + 1],
      'Assigned tech: ' || tech_names[((i - 1) % array_length(tech_names, 1)) + 1],
      true,
      v_project,
      now() - ((190 - i * 7) || ' days')::interval
    )
    RETURNING id INTO v_wo;
    v_wo_ids := array_append(v_wo_ids, v_wo);
  END LOOP;

  -- ~180 issue events over 6 months with intentional red flags
  FOR i IN 1..180 LOOP
    d := CURRENT_DATE - (180 - i);
    -- Base rotation
    v_item := v_item_ids[((i - 1) % array_length(v_item_ids, 1)) + 1];
    v_unit := v_unit_ids[((i - 1) % array_length(v_unit_ids, 1)) + 1];

    -- RED FLAG: faucet cartridge repeatedly in B5-201 (unit index 5 = B5-201)
    IF i % 6 = 0 THEN
      v_item := v_item_ids[1];
      v_unit := v_unit_ids[5];
    END IF;
    -- RED FLAG: HVAC filters climbing in B3-101
    IF i % 9 = 0 THEN
      v_item := v_item_ids[10];
      v_unit := v_unit_ids[1];
    END IF;
    -- Secondary: shower cartridges in B6-301
    IF i % 11 = 0 THEN
      v_item := v_item_ids[5];
      v_unit := v_unit_ids[9];
    END IF;

    v_wo := v_wo_ids[((i - 1) % array_length(v_wo_ids, 1)) + 1];

    INSERT INTO public.inventory_transactions (
      item_id, property_id, transaction_type, quantity, unit_cost,
      linked_work_order_id, linked_project_id, unit_id, unit_label,
      deployed_at, requester_name, reason, issued_to_name,
      notes, transaction_date, demo_seed
    )
    SELECT
      v_item,
      v_property,
      'used',
      -1,
      (SELECT unit_cost FROM public.property_inventory_items WHERE id = v_item),
      v_wo,
      v_project,
      v_unit,
      (SELECT unit_number FROM public.units WHERE id = v_unit),
      d,
      (SELECT requester_name FROM public.work_orders WHERE id = v_wo),
      (SELECT title FROM public.work_orders WHERE id = v_wo),
      tech_names[((i - 1) % array_length(tech_names, 1)) + 1],
      '6-month demo issue for owner analytics',
      d,
      true;

    v_issue_count := v_issue_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'property_id', v_property,
    'project_id', v_project,
    'items', array_length(v_item_ids, 1),
    'units', array_length(v_unit_ids, 1),
    'work_orders', array_length(v_wo_ids, 1),
    'receipts', v_receipt_count,
    'issues', v_issue_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_stores_demo_data(uuid, uuid) TO authenticated;

-- ─── 6. Seed Voice Agent demo complaints ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_voice_agent_demo(
  p_property_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property uuid;
  v_project uuid;
  v_cfg jsonb;
  v_unit_ids uuid[];
  v_unit uuid;
  i int;
  d timestamptz;
  v_count int := 0;
  callers text[] := ARRAY[
    'Maria Lopez','James Chen','Aisha Patel','Robert Diaz','Keisha Brown',
    'Luis Gomez','Angela White','Chris Solomon','Airia Austin','Tom Nguyen'
  ];
  phones text[] := ARRAY[
    '+17815550101','+17815550102','+17815550103','+17815550104','+17815550105',
    '+17815550106','+17815550107','+17815550108','+17815550109','+17815550110'
  ];
  categories text[] := ARRAY[
    'Plumbing','Plumbing','HVAC','Electrical','Appliance',
    'Doors/Locks','Plumbing','HVAC','Safety','Grounds'
  ];
  subcats text[] := ARRAY[
    'Faucet leak','Toilet running','No cooling','Outlet sparking','Fridge leak',
    'Deadbolt jammed','Clogged drain','Filter request','Smoke detector','Irrigation'
  ];
  descriptions text[] := ARRAY[
    'Kitchen faucet keeps dripping even after shutoff. Water under the sink.',
    'Toilet runs all night — water bill concern for the unit.',
    'AC blowing warm air since yesterday afternoon. Unit is very hot.',
    'Living room outlet sparked when plugging in a lamp. Breaker tripped.',
    'Fridge dripping onto the floor near the freezer gasket.',
    'Front door deadbolt will not latch. Security concern after dark.',
    'Bathroom sink drains slowly and backs up after showers.',
    'Filter is filthy and AC is loud. Requesting filter replacement.',
    'Smoke detector chirping every few minutes overnight.',
    'Spray head by the walkway is broken and flooding the sidewalk.'
  ];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can seed voice-agent demo data';
  END IF;

  SELECT o_project_id, o_property_id INTO v_project, v_property
    FROM public.resolve_glorieta_stores_target();
  IF p_property_id IS NOT NULL THEN
    v_property := p_property_id;
  END IF;
  IF v_property IS NULL THEN
    RAISE EXCEPTION 'No Glorieta property found to seed Voice Agent demo';
  END IF;

  IF v_project IS NOT NULL THEN
    SELECT COALESCE(module_config, '{}'::jsonb) INTO v_cfg FROM public.projects WHERE id = v_project;
    v_cfg := v_cfg || jsonb_build_object('voice-agent', true, 'stores', true);
    UPDATE public.projects SET module_config = v_cfg, property_id = COALESCE(property_id, v_property)
     WHERE id = v_project;
  END IF;

  -- Clear prior voice demo tickets for this property
  DELETE FROM public.issues i
   WHERE i.source_module = 'voice_agent'
     AND EXISTS (
       SELECT 1 FROM public.maintenance_requests m
        WHERE m.id = i.maintenance_request_id
          AND m.demo_seed = true
          AND m.property_id = v_property
     );
  DELETE FROM public.maintenance_requests
   WHERE demo_seed = true AND property_id = v_property;

  SELECT COALESCE(array_agg(id ORDER BY unit_number), ARRAY[]::uuid[])
    INTO v_unit_ids
    FROM public.units
   WHERE property_id = v_property
     AND COALESCE(demo_seed, false) = true;

  IF array_length(v_unit_ids, 1) IS NULL THEN
    SELECT COALESCE(array_agg(id ORDER BY unit_number), ARRAY[]::uuid[])
      INTO v_unit_ids
      FROM (
        SELECT id, unit_number FROM public.units
         WHERE property_id = v_property
         ORDER BY unit_number
         LIMIT 12
      ) u;
  END IF;

  -- Avoid auto WO/issue during seed (we want controlled demo tickets; live calls still create them)
  ALTER TABLE public.maintenance_requests
    DISABLE TRIGGER auto_create_issue_wo_from_maintenance_request;

  FOR i IN 1..24 LOOP
    d := now() - ((180 - i * 7) || ' days')::interval - ((i % 5) || ' hours')::interval;
    v_unit := CASE
      WHEN array_length(v_unit_ids, 1) IS NULL THEN NULL
      ELSE v_unit_ids[((i - 1) % array_length(v_unit_ids, 1)) + 1]
    END;

    INSERT INTO public.maintenance_requests (
      caller_name, caller_phone, caller_email, caller_unit_number,
      property_id, unit_id,
      issue_category, issue_subcategory, issue_description, issue_location,
      urgency_level, is_emergency,
      call_id, call_duration_seconds, call_transcript,
      call_started_at, call_ended_at,
      status, demo_seed, created_at, updated_at
    ) VALUES (
      callers[((i - 1) % array_length(callers, 1)) + 1],
      phones[((i - 1) % array_length(phones, 1)) + 1],
      lower(replace(callers[((i - 1) % array_length(callers, 1)) + 1], ' ', '.')) || '@example.com',
      COALESCE((SELECT unit_number FROM public.units WHERE id = v_unit), 'B5-20' || (i % 4 + 1)::text),
      v_property,
      v_unit,
      categories[((i - 1) % array_length(categories, 1)) + 1],
      subcats[((i - 1) % array_length(subcats, 1)) + 1],
      descriptions[((i - 1) % array_length(descriptions, 1)) + 1],
      CASE WHEN i % 3 = 0 THEN 'Kitchen' WHEN i % 3 = 1 THEN 'Bathroom' ELSE 'Living room' END,
      CASE WHEN i % 8 = 0 THEN 'emergency' WHEN i % 5 = 0 THEN 'urgent' ELSE 'normal' END,
      (i % 8 = 0),
      'demo-call-' || i::text || '-' || to_char(d, 'YYYYMMDD'),
      90 + (i * 7) % 120,
      'Agent: Thank you for calling Glorieta Gardens maintenance.' || E'\n' ||
      'Caller: ' || descriptions[((i - 1) % array_length(descriptions, 1)) + 1] || E'\n' ||
      'Agent: I have logged ticket for unit ' ||
      COALESCE((SELECT unit_number FROM public.units WHERE id = v_unit), 'unknown') || '.',
      d,
      d + ((2 + i % 4) || ' minutes')::interval,
      CASE
        WHEN i <= 10 THEN 'completed'
        WHEN i <= 16 THEN 'in_progress'
        WHEN i <= 20 THEN 'assigned'
        ELSE 'new'
      END,
      true,
      d,
      d
    );
    v_count := v_count + 1;
  END LOOP;

  ALTER TABLE public.maintenance_requests
    ENABLE TRIGGER auto_create_issue_wo_from_maintenance_request;

  -- Ensure voice_agent_config exists for Glorieta
  IF NOT EXISTS (
    SELECT 1 FROM public.voice_agent_config WHERE property_id = v_property
  ) THEN
    INSERT INTO public.voice_agent_config (
      property_id, agent_name, greeting_message
    ) VALUES (
      v_property,
      'Glorieta Gardens Concierge',
      'Thank you for calling Glorieta Gardens maintenance. How can I help with your unit today?'
    );
  ELSE
    UPDATE public.voice_agent_config
       SET agent_name = COALESCE(NULLIF(agent_name, ''), 'Glorieta Gardens Concierge'),
           greeting_message = COALESCE(
             NULLIF(greeting_message, ''),
             'Thank you for calling Glorieta Gardens maintenance. How can I help with your unit today?'
           )
     WHERE property_id = v_property;
  END IF;

  RETURN jsonb_build_object(
    'property_id', v_property,
    'project_id', v_project,
    'maintenance_requests', v_count
  );
EXCEPTION WHEN others THEN
  -- Always re-enable trigger if we disabled it
  BEGIN
    ALTER TABLE public.maintenance_requests
      ENABLE TRIGGER auto_create_issue_wo_from_maintenance_request;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_voice_agent_demo(uuid) TO authenticated;

-- ─── 7. Apply seeds now (migration-time, no auth.uid) ───────────────────────

DO $$
DECLARE
  v_stores jsonb;
  v_voice jsonb;
BEGIN
  BEGIN
    v_stores := public.seed_stores_demo_data(NULL, NULL);
    RAISE NOTICE 'Stores 6-month seed: %', v_stores;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Stores seed skipped: %', SQLERRM;
  END;

  BEGIN
    v_voice := public.seed_voice_agent_demo(NULL);
    RAISE NOTICE 'Voice agent demo seed: %', v_voice;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Voice seed skipped: %', SQLERRM;
  END;
END $$;
