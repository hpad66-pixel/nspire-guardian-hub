-- Correspondence inbound sync (PR3c) — pulls a project's Gmail threads onto the
-- Correspondence tab, scoped to the project's parties and AI-classified by topic
-- so an engagement only ingests the conversations that belong to it.
--
--   • project_emails.topic          — water_billing | water_meters | sewer_extension | stormwater | other
--   • correspondence_settings       — per-project sync config (which parties, which topics)
--   • correspondence_classify skill — the model prompt that tags each thread's topic
--
-- Rationale for topics: on Glorieta, "Formal Dispute of Water and Sewer CHARGES"
-- is a billing dispute (water_billing, in-scope) while "Sanitary Sewer Replacement"
-- is the separate sewer-extension job — a keyword filter can't tell them apart, so
-- we classify and import only the chosen topics.

-- ── Topic tag on each correspondence row ─────────────────────────────────────
ALTER TABLE public.project_emails ADD COLUMN IF NOT EXISTS topic text;  -- classifier output; null = unclassified
CREATE INDEX IF NOT EXISTS project_emails_topic_idx ON public.project_emails (project_id, topic);

-- ── Per-project sync configuration ───────────────────────────────────────────
-- One row per project. Seeded on first sync with sensible defaults (the edge
-- function fills party_domains from the project's known parties). Tenant-isolated
-- like every user-data table; editable later from the tab's sync settings.
CREATE TABLE IF NOT EXISTS public.correspondence_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  party_domains  text[] NOT NULL DEFAULT '{}',                       -- e.g. {r4cap.com,opalockafl.gov,atwell.com}
  party_emails   text[] NOT NULL DEFAULT '{}',                       -- extra specific addresses to include
  import_topics  text[] NOT NULL DEFAULT '{water_billing,water_meters}', -- topics to ingest
  extra_terms    text,                                               -- optional extra keyword OR-group for the Gmail query
  lookback_days  integer NOT NULL DEFAULT 365,
  last_synced_at timestamptz,
  last_result    jsonb,                                              -- {scanned,imported,byTopic} of the last run
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
ALTER TABLE public.correspondence_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondence_settings_tenant ON public.correspondence_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Topic classification skill ───────────────────────────────────────────────
-- Tunable from Settings → AI Skills like every other skill. The system prompt is
-- authoritative; the edge function only supplies the candidate threads.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES (
  'correspondence_classify',
  'Correspondence topic classifier',
  'Tags each email thread with the project topic it belongs to, so sync only imports in-scope conversations.',
  '',
  'claude-sonnet-4-6',
  true
)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
