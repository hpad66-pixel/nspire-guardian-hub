-- Project Log — a general, per-project incremental-update tracker.
-- Generalizes the standalone punch-list portal into the app: each item has a
-- status, owner (subcontractor/party), category (punch / decision / division /
-- update / general) and a timestamped UPDATE LOG so the contractor posts running
-- progress the client can follow. Reports/print come free since it's real data.

-- ── 1. tracker_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracker_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code        text,
  owner       text,                                   -- subcontractor / responsible party
  category    text NOT NULL DEFAULT 'punch'           -- punch | decision | division | update | general
              CHECK (category IN ('punch','decision','division','update','general')),
  division    text,                                    -- optional work division / facility
  title       text NOT NULL,
  description text,
  priority    text NOT NULL DEFAULT 'med'  CHECK (priority IN ('high','med','low')),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','progress','scheduled','blocked','done')),
  due_date    date,
  sort_order  integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);
CREATE INDEX IF NOT EXISTS tracker_items_project_idx ON public.tracker_items (project_id, status, priority);
CREATE INDEX IF NOT EXISTS tracker_items_tenant_idx  ON public.tracker_items (tenant_id);

-- ── 2. tracker_updates (the timestamped log) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracker_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  author      text,
  body        text NOT NULL,
  status_to   text,                                    -- status this update set the item to, if any
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracker_updates_item_idx ON public.tracker_updates (item_id, created_at DESC);

-- ── 3. RLS — tenant isolation (CLAUDE.md rule 1) ─────────────────────────────
ALTER TABLE public.tracker_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracker_items_tenant ON public.tracker_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY tracker_updates_tenant ON public.tracker_updates FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── 4. keep updated_at fresh on items ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_tracker_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS tracker_items_touch ON public.tracker_items;
CREATE TRIGGER tracker_items_touch
  BEFORE UPDATE ON public.tracker_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_tracker_items_updated_at();
