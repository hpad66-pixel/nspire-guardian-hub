-- Work order maintenance flow:
-- complaint/voice/manual → assign to supervisor → assign to crew
-- → assign parts from stores → before/after Field Camera photos
-- → mark installed (inventory deducts) → block complete without photos.

BEGIN;

-- ─── 1. Two-tier assignment on work_orders ───────────────────────────────────

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crew_assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crew_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS intake_source text;

COMMENT ON COLUMN public.work_orders.supervisor_id IS
  'Maintenance supervisor (ops_pm) who owns the WO before crew dispatch.';
COMMENT ON COLUMN public.work_orders.crew_assigned_to IS
  'Maintenance crew tech who will execute the work.';
COMMENT ON COLUMN public.work_orders.intake_source IS
  'manual | voice | nspire | stores — how the WO was created.';

CREATE INDEX IF NOT EXISTS work_orders_supervisor_id_idx
  ON public.work_orders(supervisor_id)
  WHERE supervisor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS work_orders_crew_assigned_to_idx
  ON public.work_orders(crew_assigned_to)
  WHERE crew_assigned_to IS NOT NULL;

-- ─── 2. work_order_parts (assigned → installed with before/after photos) ─────

CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id              uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  property_id                uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inventory_item_id          uuid NOT NULL REFERENCES public.property_inventory_items(id) ON DELETE RESTRICT,
  quantity                   numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_id                    uuid REFERENCES public.units(id) ON DELETE SET NULL,
  unit_label                 text,
  status                     text NOT NULL DEFAULT 'assigned'
                             CHECK (status IN ('assigned', 'installed', 'cancelled')),
  before_photo_url           text,
  after_photo_url            text,
  catalog_photo_url          text,
  issued_to_name             text,
  assigned_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at                timestamptz NOT NULL DEFAULT now(),
  installed_at               timestamptz,
  installed_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  inventory_transaction_id   uuid REFERENCES public.inventory_transactions(id) ON DELETE SET NULL,
  reason                     text,
  notes                      text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_order_parts_wo_idx
  ON public.work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS work_order_parts_property_idx
  ON public.work_order_parts(property_id);
CREATE INDEX IF NOT EXISTS work_order_parts_status_idx
  ON public.work_order_parts(status);

ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_order_parts_select ON public.work_order_parts;
CREATE POLICY work_order_parts_select ON public.work_order_parts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (
          p.workspace_id = public.get_my_workspace_id()
          OR public.is_super_admin()
          OR EXISTS (
            SELECT 1 FROM public.portal_memberships pm
            WHERE pm.user_id = auth.uid()
              AND pm.portal_kind = 'ops'
              AND pm.is_active = true
              AND pm.property_id = p.id
          )
        )
    )
  );

DROP POLICY IF EXISTS work_order_parts_insert ON public.work_order_parts;
CREATE POLICY work_order_parts_insert ON public.work_order_parts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (
          p.workspace_id = public.get_my_workspace_id()
          OR public.is_super_admin()
          OR EXISTS (
            SELECT 1 FROM public.portal_memberships pm
            WHERE pm.user_id = auth.uid()
              AND pm.portal_kind = 'ops'
              AND pm.is_active = true
              AND pm.property_id = p.id
              AND pm.role IN ('ops_pm', 'ops_owner', 'ops_tech')
          )
        )
    )
  );

DROP POLICY IF EXISTS work_order_parts_update ON public.work_order_parts;
CREATE POLICY work_order_parts_update ON public.work_order_parts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (
          p.workspace_id = public.get_my_workspace_id()
          OR public.is_super_admin()
          OR EXISTS (
            SELECT 1 FROM public.portal_memberships pm
            WHERE pm.user_id = auth.uid()
              AND pm.portal_kind = 'ops'
              AND pm.is_active = true
              AND pm.property_id = p.id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (
          p.workspace_id = public.get_my_workspace_id()
          OR public.is_super_admin()
          OR EXISTS (
            SELECT 1 FROM public.portal_memberships pm
            WHERE pm.user_id = auth.uid()
              AND pm.portal_kind = 'ops'
              AND pm.is_active = true
              AND pm.property_id = p.id
          )
        )
    )
  );

-- ─── 3. Resolve default maintenance supervisor for a property ───────────────

CREATE OR REPLACE FUNCTION public.resolve_property_ops_supervisor(p_property_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.user_id
  FROM public.portal_memberships pm
  WHERE pm.portal_kind = 'ops'
    AND pm.is_active = true
    AND pm.property_id = p_property_id
    AND pm.role IN ('ops_pm', 'ops_owner')
  ORDER BY
    CASE pm.role WHEN 'ops_pm' THEN 0 ELSE 1 END,
    pm.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_property_ops_supervisor(uuid) TO authenticated;

-- ─── 4. On install: require before+after photos, deduct inventory ───────────

CREATE OR REPLACE FUNCTION public.install_work_order_part()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.property_inventory_items%ROWTYPE;
  v_wo public.work_orders%ROWTYPE;
  v_txn_id uuid;
  v_on_hand numeric;
BEGIN
  IF NEW.status = 'installed' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'installed' THEN
    IF NEW.before_photo_url IS NULL OR BTRIM(NEW.before_photo_url) = '' THEN
      RAISE EXCEPTION 'WO_PART_BEFORE_PHOTO_REQUIRED: Capture a BEFORE photo of the removed/failed part before marking installed.';
    END IF;
    IF NEW.after_photo_url IS NULL OR BTRIM(NEW.after_photo_url) = '' THEN
      RAISE EXCEPTION 'WO_PART_AFTER_PHOTO_REQUIRED: Capture an AFTER photo of the installed part before marking installed.';
    END IF;

    SELECT * INTO v_wo FROM public.work_orders WHERE id = NEW.work_order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WO_PART_WO_MISSING: Work order not found.';
    END IF;
    IF v_wo.status IN ('verified', 'closed', 'rejected') THEN
      RAISE EXCEPTION 'WO_PART_WO_CLOSED: Cannot install parts on a closed work order.';
    END IF;

    SELECT * INTO v_item FROM public.property_inventory_items WHERE id = NEW.inventory_item_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WO_PART_ITEM_MISSING: Inventory item not found.';
    END IF;

    v_on_hand := COALESCE(v_item.current_quantity, 0);
    IF v_on_hand < NEW.quantity THEN
      RAISE EXCEPTION 'WO_PART_INSUFFICIENT_STOCK: Only % on hand for %.', v_on_hand, v_item.name;
    END IF;

    IF NEW.inventory_transaction_id IS NULL THEN
      INSERT INTO public.inventory_transactions (
        item_id,
        property_id,
        transaction_type,
        quantity,
        unit_cost,
        linked_work_order_id,
        unit_id,
        unit_label,
        deployed_at,
        requester_name,
        reason,
        issued_to_name,
        notes,
        transaction_date,
        created_by
      ) VALUES (
        NEW.inventory_item_id,
        NEW.property_id,
        'used',
        -ABS(NEW.quantity),
        v_item.unit_cost,
        NEW.work_order_id,
        NEW.unit_id,
        COALESCE(NEW.unit_label, ''),
        CURRENT_DATE,
        v_wo.requester_name,
        COALESCE(NEW.reason, 'Installed on work order'),
        NEW.issued_to_name,
        'Installed via work order parts — before/after photos on file',
        CURRENT_DATE,
        COALESCE(NEW.installed_by, auth.uid())
      )
      RETURNING id INTO v_txn_id;

      NEW.inventory_transaction_id := v_txn_id;
    END IF;

    NEW.installed_at := COALESCE(NEW.installed_at, now());
    NEW.installed_by := COALESCE(NEW.installed_by, auth.uid());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_install_work_order_part ON public.work_order_parts;
CREATE TRIGGER trg_install_work_order_part
  BEFORE UPDATE ON public.work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.install_work_order_part();

-- ─── 5. Block WO complete/verify until every part is installed with photos ──

CREATE OR REPLACE FUNCTION public.enforce_work_order_parts_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending int;
  v_missing_photos int;
BEGIN
  IF NEW.status IN ('completed', 'verified')
     AND COALESCE(OLD.status, '') NOT IN ('completed', 'verified') THEN

    SELECT COUNT(*) INTO v_pending
    FROM public.work_order_parts p
    WHERE p.work_order_id = NEW.id
      AND p.status = 'assigned';

    IF v_pending > 0 THEN
      RAISE EXCEPTION
        'WO_PARTS_NOT_INSTALLED: % part(s) still assigned — capture before/after photos and mark each installed before completing.',
        v_pending;
    END IF;

    SELECT COUNT(*) INTO v_missing_photos
    FROM public.work_order_parts p
    WHERE p.work_order_id = NEW.id
      AND p.status = 'installed'
      AND (
        p.before_photo_url IS NULL OR BTRIM(p.before_photo_url) = ''
        OR p.after_photo_url IS NULL OR BTRIM(p.after_photo_url) = ''
      );

    IF v_missing_photos > 0 THEN
      RAISE EXCEPTION
        'WO_PARTS_PHOTOS_REQUIRED: % installed part(s) are missing before/after photos.',
        v_missing_photos;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_work_order_parts_complete ON public.work_orders;
CREATE TRIGGER trg_enforce_work_order_parts_complete
  BEFORE UPDATE OF status ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_work_order_parts_complete();

-- ─── 6. Voice → WO: auto-assign maintenance supervisor ──────────────────────

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
  v_supervisor UUID;
BEGIN
  IF NEW.work_order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'maintenance_requests.property_id is required to create a work order';
  END IF;

  v_caller := COALESCE(NULLIF(BTRIM(NEW.caller_name), ''), 'Resident');
  v_phone := COALESCE(NULLIF(BTRIM(NEW.caller_phone), ''), 'not provided');
  v_supervisor := public.resolve_property_ops_supervisor(NEW.property_id);

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
    priority, status, due_date,
    requester_name, supervisor_id, assigned_to, assigned_at, intake_source
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
    CASE WHEN v_supervisor IS NOT NULL THEN 'assigned' ELSE 'pending_approval' END,
    CASE
      WHEN v_severity = 'severe' THEN (CURRENT_DATE + INTERVAL '1 day')::date
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

COMMIT;
