-- Stores & Materials (optional project module)
-- Property-scoped stock room with work-order-gated issue, procurement receipts,
-- unit deployment trail, demo seed for Glorieta, and super-admin reset.

-- ─── 1. Extend inventory tables ─────────────────────────────────────────────

ALTER TABLE public.property_inventory_items
  ADD COLUMN IF NOT EXISTS demo_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_label text,
  ADD COLUMN IF NOT EXISTS deployed_at date,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS issued_to_name text,
  ADD COLUMN IF NOT EXISTS emergency_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_id uuid;

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS demo_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Soft FK for linked_work_order_id if not already constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transactions_linked_work_order_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_transactions
      ADD CONSTRAINT inventory_transactions_linked_work_order_id_fkey
      FOREIGN KEY (linked_work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'WO FK skip: %', SQLERRM;
END $$;

-- ─── 2. Procurement receipts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_material_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor          text NOT NULL DEFAULT 'Home Depot',
  receipt_number  text,
  purchased_at    date NOT NULL DEFAULT CURRENT_DATE,
  total_amount    numeric(12,2),
  file_url        text,
  file_name       text,
  notes           text,
  demo_seed       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_material_receipt_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      uuid NOT NULL REFERENCES public.property_material_receipts(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES public.property_inventory_items(id) ON DELETE SET NULL,
  description     text NOT NULL,
  quantity        numeric(10,2) NOT NULL DEFAULT 1,
  unit_cost       numeric(10,2),
  line_total      numeric(12,2),
  demo_seed       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transactions_receipt_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_transactions
      ADD CONSTRAINT inventory_transactions_receipt_id_fkey
      FOREIGN KEY (receipt_id) REFERENCES public.property_material_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.property_material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_material_receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS property_material_receipts_select ON public.property_material_receipts;
CREATE POLICY property_material_receipts_select ON public.property_material_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS property_material_receipts_insert ON public.property_material_receipts;
CREATE POLICY property_material_receipts_insert ON public.property_material_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS property_material_receipts_update ON public.property_material_receipts;
CREATE POLICY property_material_receipts_update ON public.property_material_receipts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS property_material_receipts_delete ON public.property_material_receipts;
CREATE POLICY property_material_receipts_delete ON public.property_material_receipts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS property_material_receipt_lines_all ON public.property_material_receipt_lines;
CREATE POLICY property_material_receipt_lines_all ON public.property_material_receipt_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.property_material_receipts r
        JOIN public.properties p ON p.id = r.property_id
       WHERE r.id = receipt_id
         AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.property_material_receipts r
        JOIN public.properties p ON p.id = r.property_id
       WHERE r.id = receipt_id
         AND (p.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

CREATE INDEX IF NOT EXISTS idx_material_receipts_property
  ON public.property_material_receipts (property_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_wo
  ON public.inventory_transactions (linked_work_order_id)
  WHERE linked_work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_tx_demo
  ON public.inventory_transactions (property_id)
  WHERE demo_seed = true;

-- ─── 3. Work-order gate on issue (used) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_inventory_issue_controls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo_status text;
  v_wo_requester text;
BEGIN
  IF NEW.transaction_type = 'used' THEN
    IF NEW.linked_work_order_id IS NULL AND COALESCE(NEW.emergency_override, false) = false THEN
      RAISE EXCEPTION 'STORES_WO_REQUIRED: Parts cannot be issued without a work order. Create or select a work order first (or use admin emergency override).';
    END IF;

    IF NEW.linked_work_order_id IS NOT NULL THEN
      SELECT status::text, requester_name
        INTO v_wo_status, v_wo_requester
        FROM public.work_orders
       WHERE id = NEW.linked_work_order_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'STORES_WO_MISSING: Linked work order was not found.';
      END IF;

      IF v_wo_status IN ('verified', 'closed', 'rejected') THEN
        RAISE EXCEPTION 'STORES_WO_CLOSED: Cannot issue parts to a closed/verified work order.';
      END IF;

      -- Prefer requester from the WO when the issue row leaves it blank
      IF NEW.requester_name IS NULL OR btrim(NEW.requester_name) = '' THEN
        NEW.requester_name := COALESCE(v_wo_requester, NEW.requester_name);
      END IF;
    END IF;

    IF (NEW.unit_id IS NULL)
       AND (NEW.unit_label IS NULL OR btrim(NEW.unit_label) = '')
       AND COALESCE(NEW.emergency_override, false) = false THEN
      RAISE EXCEPTION 'STORES_UNIT_REQUIRED: Issue must record the unit where the part was deployed.';
    END IF;

    IF NEW.deployed_at IS NULL THEN
      NEW.deployed_at := COALESCE(NEW.transaction_date, CURRENT_DATE);
    END IF;

    -- Issues consume stock (negative quantity)
    IF NEW.quantity > 0 THEN
      NEW.quantity := -ABS(NEW.quantity);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Name sorts before on_inventory_transaction so the WO gate runs before qty sync.
DROP TRIGGER IF EXISTS trg_enforce_inventory_issue_controls ON public.inventory_transactions;
DROP TRIGGER IF EXISTS aaa_enforce_inventory_issue_controls ON public.inventory_transactions;
CREATE TRIGGER aaa_enforce_inventory_issue_controls
  BEFORE INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inventory_issue_controls();

-- ─── 4. Super-admin reset of demo stores data ───────────────────────────────

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
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reset stores demo data';
  END IF;

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
   WHERE u.demo_seed = true
     AND (p_property_id IS NULL OR u.property_id = p_property_id);
  GET DIAGNOSTICS v_units = ROW_COUNT;

  RETURN jsonb_build_object(
    'transactions', v_tx,
    'receipt_lines', v_lines,
    'receipts', v_receipts,
    'work_orders', v_wos,
    'items', v_items,
    'units', v_units
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_stores_demo_data(uuid) TO authenticated;

-- units.demo_seed may not exist yet
DO $$
BEGIN
  ALTER TABLE public.units ADD COLUMN IF NOT EXISTS demo_seed boolean NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'units.demo_seed: %', SQLERRM;
END $$;

-- Recreate reset with units column guaranteed
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
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reset stores demo data';
  END IF;

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
    'units', v_units
  );
END;
$$;

-- ─── 5. Seed Glorieta catalog + mock traffic + enable module ────────────────

DO $$
DECLARE
  v_project uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
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
    'Tenant — Apt 308','Property manager','Tenant — Apt 115'
  ];
  reasons text[] := ARRAY[
    'Leaking faucet','Toilet running','No hot water','Outlet sparking','AC not cooling',
    'Lock failure','Leak under sink','Broken switch','Smoke detector chirp','Door not latching'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE NOTICE 'Glorieta Conveyance project missing — skipping stores seed';
    RETURN;
  END IF;

  SELECT property_id INTO v_property FROM public.projects WHERE id = v_project;
  IF v_property IS NULL THEN
    SELECT id INTO v_property FROM public.properties WHERE name ILIKE '%glorieta%' ORDER BY created_at LIMIT 1;
  END IF;
  IF v_property IS NULL THEN
    RAISE NOTICE 'Glorieta property missing — skipping stores seed';
    RETURN;
  END IF;

  -- Enable optional stores module on Conveyance (and keep other overrides)
  SELECT COALESCE(module_config, '{}'::jsonb) INTO v_cfg FROM public.projects WHERE id = v_project;
  v_cfg := v_cfg || jsonb_build_object('stores', true);
  UPDATE public.projects SET module_config = v_cfg WHERE id = v_project;

  -- Skip re-seed if demo catalog already present
  IF EXISTS (
    SELECT 1 FROM public.property_inventory_items
     WHERE property_id = v_property AND demo_seed = true
  ) THEN
    RAISE NOTICE 'Stores demo already seeded for property %', v_property;
    RETURN;
  END IF;

  -- Demo units (buildings 3/5/6 style affordable housing)
  FOR i IN 1..12 LOOP
    INSERT INTO public.units (property_id, unit_number, status, bedrooms, bathrooms, demo_seed)
    VALUES (
      v_property,
      CASE
        WHEN i <= 4 THEN 'B3-' || lpad((100 + i)::text, 3, '0')
        WHEN i <= 8 THEN 'B5-' || lpad((200 + i - 4)::text, 3, '0')
        ELSE 'B6-' || lpad((300 + i - 8)::text, 3, '0')
      END,
      'occupied',
      2,
      1,
      true
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
      'Affordable housing maintenance stock — Glorieta Gardens stores demo',
      'each',
      0, mins[i], costs[i], 'Home Depot',
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

  -- Opening stock receipt (Home Depot) + receive transactions
  INSERT INTO public.property_material_receipts (
    property_id, project_id, vendor, receipt_number, purchased_at,
    total_amount, file_name, notes, demo_seed
  ) VALUES (
    v_property, v_project, 'Home Depot', 'HD-884421', CURRENT_DATE - 45,
    0, 'HD_receipt_demo.pdf', 'Opening stock for Glorieta maintenance cage', true
  ) RETURNING id INTO v_receipt;

  FOR i IN 1..array_length(v_item_ids, 1) LOOP
    INSERT INTO public.property_material_receipt_lines (
      receipt_id, item_id, description, quantity, unit_cost, line_total, demo_seed
    ) VALUES (
      v_receipt, v_item_ids[i], names[i], mins[i] * 3 + 5, costs[i],
      (mins[i] * 3 + 5) * costs[i], true
    );

    INSERT INTO public.inventory_transactions (
      item_id, property_id, transaction_type, quantity, unit_cost,
      linked_project_id, receipt_id, reference_number, vendor, notes,
      transaction_date, demo_seed
    ) VALUES (
      v_item_ids[i], v_property, 'received', mins[i] * 3 + 5, costs[i],
      v_project, v_receipt, 'HD-884421', 'Home Depot', 'Opening stock receive',
      CURRENT_DATE - 45, true
    );
  END LOOP;

  UPDATE public.property_material_receipts r
     SET total_amount = (
       SELECT COALESCE(SUM(line_total), 0) FROM public.property_material_receipt_lines l WHERE l.receipt_id = r.id
     )
   WHERE r.id = v_receipt;

  -- Second receipt mid-period (top-up)
  INSERT INTO public.property_material_receipts (
    property_id, project_id, vendor, receipt_number, purchased_at,
    total_amount, file_name, notes, demo_seed
  ) VALUES (
    v_property, v_project, 'Home Depot', 'HD-891002', CURRENT_DATE - 18,
    0, 'HD_receipt_topup.pdf', 'Top-up after faucet / filter burn rate', true
  ) RETURNING id INTO v_receipt;

  FOREACH i IN ARRAY ARRAY[1, 2, 10, 11, 13] LOOP
    INSERT INTO public.property_material_receipt_lines (
      receipt_id, item_id, description, quantity, unit_cost, line_total, demo_seed
    ) VALUES (
      v_receipt, v_item_ids[i], names[i], 8, costs[i], 8 * costs[i], true
    );
    INSERT INTO public.inventory_transactions (
      item_id, property_id, transaction_type, quantity, unit_cost,
      linked_project_id, receipt_id, reference_number, vendor, notes,
      transaction_date, demo_seed
    ) VALUES (
      v_item_ids[i], v_property, 'received', 8, costs[i],
      v_project, v_receipt, 'HD-891002', 'Home Depot', 'Top-up receive',
      CURRENT_DATE - 18, true
    );
  END LOOP;

  UPDATE public.property_material_receipts r
     SET total_amount = (
       SELECT COALESCE(SUM(line_total), 0) FROM public.property_material_receipt_lines l WHERE l.receipt_id = r.id
     )
   WHERE r.id = v_receipt;

  -- Work orders with requesters
  FOR i IN 1..10 LOOP
    INSERT INTO public.work_orders (
      property_id, unit_id, title, description, priority, status,
      due_date, requester_name, notes, demo_seed, linked_project_id, created_at
    ) VALUES (
      v_property,
      v_unit_ids[((i - 1) % array_length(v_unit_ids, 1)) + 1],
      reasons[((i - 1) % array_length(reasons, 1)) + 1] || ' — WO demo ' || i::text,
      'Demo maintenance work order for Stores controls / owner analytics',
      CASE WHEN i IN (1, 4) THEN 'emergency'::public.work_order_priority ELSE 'routine'::public.work_order_priority END,
      CASE
        WHEN i <= 6 THEN 'completed'::public.work_order_status
        WHEN i <= 8 THEN 'in_progress'::public.work_order_status
        ELSE 'assigned'::public.work_order_status
      END,
      CURRENT_DATE - (30 - i * 2),
      requester_names[((i - 1) % array_length(requester_names, 1)) + 1],
      'Assigned tech: ' || tech_names[((i - 1) % array_length(tech_names, 1)) + 1],
      true,
      v_project,
      now() - ((40 - i) || ' days')::interval
    )
    RETURNING id INTO v_wo;
    v_wo_ids := array_append(v_wo_ids, v_wo);
  END LOOP;

  -- Issue traffic over ~45 days (WO-gated, unit-labeled)
  FOR i IN 1..48 LOOP
    d := CURRENT_DATE - (45 - (i % 45));
    v_item := v_item_ids[((i - 1) % array_length(v_item_ids, 1)) + 1];
    -- Bias faucet cartridges + filters (repeat offender story)
    IF i % 5 = 0 THEN v_item := v_item_ids[1]; END IF;
    IF i % 7 = 0 THEN v_item := v_item_ids[10]; END IF;

    v_wo := v_wo_ids[((i - 1) % array_length(v_wo_ids, 1)) + 1];
    v_unit := v_unit_ids[((i - 1) % array_length(v_unit_ids, 1)) + 1];

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
      'Demo issue for owner analytics',
      d,
      true;
  END LOOP;

  RAISE NOTICE 'Seeded Glorieta Stores demo on property % (% items)', v_property, array_length(v_item_ids, 1);
END $$;
