-- ============================================================
-- C3 · Punch List — enhance existing punch_items + location tree.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.project_locations(id) ON DELETE CASCADE,
  level int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_project ON public.project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_pl_parent ON public.project_locations(parent_id);

CREATE TABLE IF NOT EXISTS public.punch_item_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_priority text,
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.project_locations(id),
  ADD COLUMN IF NOT EXISTS item_type_id uuid REFERENCES public.punch_item_types(id),
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS final_approver_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS drawing_markup_id uuid REFERENCES public.drawing_markups(id),
  ADD COLUMN IF NOT EXISTS evidence_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_item_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY ploc_tenant ON public.project_locations FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pit_tenant ON public.punch_item_types FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Enforce evidence_required: cannot close without an attached photo
CREATE OR REPLACE FUNCTION public.punch_require_evidence_on_close()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.evidence_required AND NEW.closed_at IS NOT NULL AND OLD.closed_at IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.photo_links pl
      WHERE pl.linked_record_id = NEW.id AND pl.linked_record_type = 'punch_item'
    ) THEN
      RAISE EXCEPTION 'Cannot close punch item %: evidence photo required', NEW.id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_punch_require_evidence ON public.punch_items;
CREATE TRIGGER trg_punch_require_evidence
  BEFORE UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.punch_require_evidence_on_close();
