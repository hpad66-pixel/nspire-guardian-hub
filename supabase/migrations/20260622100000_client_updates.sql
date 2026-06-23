-- ─────────────────────────────────────────────────────────────────────────────
-- Client updates — the value-added briefing the GC publishes to the owner/client.
--
-- Each update is a periodic (e.g. weekly) status briefing: an overall health,
-- a narrative summary, and structured lists of accomplishments, risks, decisions
-- needed/made, action items, and next steps — plus an optional uploaded weekly
-- financial statement (PDF). The owner portal shows PUBLISHED updates; drafts are
-- the GC's working copy.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_updates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  period_label    text,                                   -- e.g. "Week of Jun 16–22, 2026"
  health          text NOT NULL DEFAULT 'on_track' CHECK (health IN ('on_track', 'at_risk', 'delayed')),
  summary         text,
  accomplishments jsonb NOT NULL DEFAULT '[]'::jsonb,      -- string[]
  risks           jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ text, severity }]
  decisions       jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ text, status }]
  action_items    jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ text, owner, done }]
  next_steps      jsonb NOT NULL DEFAULT '[]'::jsonb,      -- string[]
  statement_pdf_path text,                                 -- uploaded weekly financial statement (public URL)
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    timestamptz,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_updates_project ON public.client_updates(project_id, status, published_at DESC);

ALTER TABLE public.client_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_updates_tenant_isolation ON public.client_updates;
CREATE POLICY client_updates_tenant_isolation ON public.client_updates
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.touch_client_updates_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_client_updates ON public.client_updates;
CREATE TRIGGER trg_touch_client_updates
  BEFORE UPDATE ON public.client_updates
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_updates_updated_at();
