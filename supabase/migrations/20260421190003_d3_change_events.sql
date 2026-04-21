-- ============================================================
-- D3 · Change Events — pre-approval exposure ledger.
-- Feeds the Budget "Forecast to Complete" column.
-- Mapping: spec.rfis → public.project_rfis (per CLAUDE.md).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_no int NOT NULL,
  title text NOT NULL,
  description text,
  originator_id uuid REFERENCES auth.users(id),
  reason_code text CHECK (reason_code IN
    ('owner_request','design_change','field_condition','code_change','rfi_response','other')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_review','pending','void','closed')),
  rom_value numeric(14,2),
  event_date date NOT NULL DEFAULT current_date,
  rfi_id uuid REFERENCES public.project_rfis(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, event_no)
);

CREATE INDEX IF NOT EXISTS idx_ce_project ON public.change_events(project_id);
CREATE INDEX IF NOT EXISTS idx_ce_status ON public.change_events(status);

-- change_event_lines.cost_code_id populates the pending_exposure column in Budget
CREATE TABLE IF NOT EXISTS public.change_event_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_event_id uuid NOT NULL REFERENCES public.change_events(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id),
  description text NOT NULL,
  estimated_cost numeric(14,2) NOT NULL DEFAULT 0,
  status_bucket text NOT NULL DEFAULT 'pending'
    CHECK (status_bucket IN ('pending','approved','not_included','void')),
  pco_id uuid,  -- FK added after change_orders ALTER in D4
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cel_event ON public.change_event_lines(change_event_id);
CREATE INDEX IF NOT EXISTS idx_cel_cost_code_pending
  ON public.change_event_lines(cost_code_id) WHERE status_bucket = 'pending';

ALTER TABLE public.change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_event_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY ce_tenant ON public.change_events FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY cel_tenant ON public.change_event_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Auto-increment event_no per project
CREATE OR REPLACE FUNCTION public.assign_change_event_no()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_no IS NULL THEN
    NEW.event_no := COALESCE(
      (SELECT MAX(event_no) FROM public.change_events WHERE project_id = NEW.project_id),
      0
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_change_event_no ON public.change_events;
CREATE TRIGGER trg_change_event_no
  BEFORE INSERT ON public.change_events
  FOR EACH ROW EXECUTE FUNCTION public.assign_change_event_no();

-- Auto-close event when all lines are approved/not_included/void
CREATE OR REPLACE FUNCTION public.auto_close_change_event()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_open_count int;
BEGIN
  SELECT COUNT(*) INTO v_open_count
    FROM public.change_event_lines
    WHERE change_event_id = NEW.change_event_id
      AND status_bucket = 'pending';
  IF v_open_count = 0 THEN
    UPDATE public.change_events
      SET status = 'closed', updated_at = now()
      WHERE id = NEW.change_event_id AND status <> 'closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_auto_close ON public.change_event_lines;
CREATE TRIGGER trg_ce_auto_close
  AFTER INSERT OR UPDATE ON public.change_event_lines
  FOR EACH ROW EXECUTE FUNCTION public.auto_close_change_event();

DROP TRIGGER IF EXISTS trg_ce_updated_at ON public.change_events;
CREATE TRIGGER trg_ce_updated_at BEFORE UPDATE ON public.change_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
