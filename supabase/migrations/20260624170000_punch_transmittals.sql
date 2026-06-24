-- ─────────────────────────────────────────────────────────────────────────────
-- Punch list → subcontractor transmittals + per-item response tracking.
--
-- A "transmittal" is one punch list emailed to one subcontractor. It carries a
-- secure respond_token so the sub can open a public (no-login) page and set a
-- status per item. Responses are appended to punch_item_responses (full history /
-- audit trail). punch_items gains a light sub-assignment + latest-status cache.
-- ─────────────────────────────────────────────────────────────────────────────

-- Sub assignment + latest sub-reported status cached on the item for quick reads.
ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS commitment_id     uuid REFERENCES public.commitments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_status        text,
  ADD COLUMN IF NOT EXISTS sub_responded_at  timestamptz;

-- ── Transmittals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.punch_transmittals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commitment_id  uuid REFERENCES public.commitments(id) ON DELETE SET NULL,
  recipient_name  text,
  recipient_email text NOT NULL,
  subject         text,
  message         text,
  status          text NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('draft', 'sent', 'viewed', 'responded', 'closed')),
  respond_token   text NOT NULL UNIQUE
                    DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  item_count      int NOT NULL DEFAULT 0,
  sent_by         uuid,
  sent_at         timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_punch_transmittals_project ON public.punch_transmittals(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_transmittals_token   ON public.punch_transmittals(respond_token);

ALTER TABLE public.punch_transmittals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS punch_transmittals_tenant_isolation ON public.punch_transmittals;
CREATE POLICY punch_transmittals_tenant_isolation ON public.punch_transmittals
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Transmittal ↔ punch_item link ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.punch_transmittal_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  transmittal_id uuid NOT NULL REFERENCES public.punch_transmittals(id) ON DELETE CASCADE,
  punch_item_id  uuid NOT NULL REFERENCES public.punch_items(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transmittal_id, punch_item_id)
);
CREATE INDEX IF NOT EXISTS idx_punch_tx_items_tx ON public.punch_transmittal_items(transmittal_id);

ALTER TABLE public.punch_transmittal_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS punch_transmittal_items_tenant_isolation ON public.punch_transmittal_items;
CREATE POLICY punch_transmittal_items_tenant_isolation ON public.punch_transmittal_items
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Per-item responses (history / audit) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.punch_item_responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  transmittal_id uuid REFERENCES public.punch_transmittals(id) ON DELETE CASCADE,
  punch_item_id  uuid NOT NULL REFERENCES public.punch_items(id) ON DELETE CASCADE,
  responder_name  text,
  responder_email text,
  sub_status     text NOT NULL
                  CHECK (sub_status IN ('acknowledged', 'in_progress', 'completed', 'disputed')),
  comment        text,
  responded_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_punch_item_responses_item ON public.punch_item_responses(punch_item_id);
CREATE INDEX IF NOT EXISTS idx_punch_item_responses_tx   ON public.punch_item_responses(transmittal_id);

ALTER TABLE public.punch_item_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS punch_item_responses_tenant_isolation ON public.punch_item_responses;
CREATE POLICY punch_item_responses_tenant_isolation ON public.punch_item_responses
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Rule 8: the link table joins two tables — enforce same project + same tenant.
-- (punch_items has no tenant_id, so the project match is the real boundary.)
CREATE OR REPLACE FUNCTION public.guard_punch_transmittal_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_project uuid;
  tx_tenant  uuid;
  it_project uuid;
BEGIN
  SELECT project_id, tenant_id INTO tx_project, tx_tenant
  FROM public.punch_transmittals WHERE id = NEW.transmittal_id;
  SELECT project_id INTO it_project FROM public.punch_items WHERE id = NEW.punch_item_id;

  IF tx_project IS NULL OR it_project IS NULL THEN
    RAISE EXCEPTION 'Transmittal or punch item not found';
  END IF;
  IF tx_project <> it_project THEN
    RAISE EXCEPTION 'Punch item belongs to a different project than the transmittal';
  END IF;
  IF NEW.tenant_id <> tx_tenant THEN
    RAISE EXCEPTION 'Link tenant does not match its transmittal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_punch_transmittal_item ON public.punch_transmittal_items;
CREATE TRIGGER trg_guard_punch_transmittal_item
  BEFORE INSERT OR UPDATE ON public.punch_transmittal_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_punch_transmittal_item();
