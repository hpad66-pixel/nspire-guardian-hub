-- Unit turnover lifecycle + audit log. A "turn" opens when a unit turns over
-- (tenant moves out, unit goes vacant, or a manual "Start turn"). When the
-- property has NSPIRE on, the turn carries a pending inspection until it's done.
-- The audit log records every step so a turn can be closed out and audited.

CREATE TABLE IF NOT EXISTS public.unit_turns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  unit_id            uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  property_id        uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open','inspecting','closed')),
  trigger_source     text NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('tenant_moved_out','unit_vacant','manual')),
  nspire_required    boolean NOT NULL DEFAULT false,   -- property had NSPIRE on
  nspire_pending     boolean NOT NULL DEFAULT false,   -- deferred ("conduct later")
  inspection_id      uuid REFERENCES public.inspections(id) ON DELETE SET NULL,
  vacated_at         timestamptz,
  turned_over_at     timestamptz NOT NULL DEFAULT now(),
  inspection_done_at timestamptz,
  findings_count     int NOT NULL DEFAULT 0,
  findings_addressed boolean NOT NULL DEFAULT false,
  closed_at          timestamptz,
  closed_by          uuid,
  notes              text,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_turns_unit ON public.unit_turns(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_unit_turns_property ON public.unit_turns(property_id, status);

ALTER TABLE public.unit_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY unit_turns_tenant ON public.unit_turns FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.unit_turn_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  turn_id       uuid NOT NULL REFERENCES public.unit_turns(id) ON DELETE CASCADE,
  kind          text NOT NULL,   -- vacated | turn_started | inspection_triggered | inspection_deferred | inspection_done | finding_addressed | equipment | document | signed_off | closed | note
  body          text,
  actor_name    text,
  artifact_path text,            -- uploaded doc (invoice / warranty / manual) in 'unit-photos'
  meta          jsonb,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_turn_log_turn ON public.unit_turn_log(turn_id, created_at);

ALTER TABLE public.unit_turn_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY unit_turn_log_tenant ON public.unit_turn_log FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Open a turn for a unit if one isn't already open. SECURITY DEFINER so the
-- status-change triggers can write regardless of the actor's table grants.
CREATE OR REPLACE FUNCTION public.open_unit_turn(p_unit_id uuid, p_source text, p_vacated timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_prop   uuid;
  v_nspire boolean := false;
  v_turn   uuid;
BEGIN
  IF v_tenant IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.unit_turns WHERE unit_id = p_unit_id AND status <> 'closed') THEN RETURN; END IF;
  SELECT property_id INTO v_prop FROM public.units WHERE id = p_unit_id;
  SELECT COALESCE(nspire_enabled, false) INTO v_nspire FROM public.properties WHERE id = v_prop;
  INSERT INTO public.unit_turns (tenant_id, unit_id, property_id, status, trigger_source, nspire_required, nspire_pending, vacated_at, created_by)
  VALUES (v_tenant, p_unit_id, v_prop, 'open', p_source, v_nspire, v_nspire, p_vacated, auth.uid())
  RETURNING id INTO v_turn;
  INSERT INTO public.unit_turn_log (tenant_id, turn_id, kind, body, created_by)
  VALUES (v_tenant, v_turn, 'turn_started', 'Turn opened (' || p_source || ')', auth.uid());
END;
$$;

-- Auto-open on tenant move-out.
CREATE OR REPLACE FUNCTION public.trg_tenant_moveout_turn() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'moved_out' AND (OLD.status IS DISTINCT FROM 'moved_out') AND NEW.unit_id IS NOT NULL THEN
    PERFORM public.open_unit_turn(NEW.unit_id, 'tenant_moved_out', COALESCE(NEW.move_out_date::timestamptz, now()));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tenant_moveout_turn ON public.tenants;
CREATE TRIGGER trg_tenant_moveout_turn AFTER UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.trg_tenant_moveout_turn();

-- Auto-open on unit going vacant.
CREATE OR REPLACE FUNCTION public.trg_unit_vacant_turn() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'vacant' AND (OLD.status IS DISTINCT FROM 'vacant') THEN
    PERFORM public.open_unit_turn(NEW.id, 'unit_vacant', now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_unit_vacant_turn ON public.units;
CREATE TRIGGER trg_unit_vacant_turn AFTER UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.trg_unit_vacant_turn();

GRANT EXECUTE ON FUNCTION public.open_unit_turn(uuid, text, timestamptz) TO authenticated;
