-- Environmental Compliance — Obligations. Project-scoped permit conditions /
-- recurring deadlines (DMR submittals, quarterly sampling, annual reports…).
-- Mirrors the proven permit_requirements pattern (frequency + next_due_date +
-- roll-forward + status) but attaches to the PROJECT, because consulting
-- engagements have no property to hang the existing property-scoped permits off.
CREATE TABLE IF NOT EXISTS public.permit_obligations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  permit_ref      text,                       -- permit number / name (free text; consulting has no permits row)
  agency          text,
  description     text,
  frequency       text NOT NULL DEFAULT 'one_time', -- one_time | monthly | quarterly | semi_annual | annual
  next_due_date   date,
  responsible     text,
  status          text NOT NULL DEFAULT 'open',     -- open | complete | waived
  last_completed_at date,
  notes           text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permit_obligations_project_idx ON public.permit_obligations (project_id);
CREATE INDEX IF NOT EXISTS permit_obligations_due_idx     ON public.permit_obligations (next_due_date);

ALTER TABLE public.permit_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY permit_obligations_tenant ON public.permit_obligations
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
