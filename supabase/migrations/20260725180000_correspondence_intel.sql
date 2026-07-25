-- Correspondence intelligence (PR3d) — one analyzed row per email THREAD, holding
-- the AI-extracted meaning that turns the raw trail into knowledge:
--   summary · status · ball-in-court · action items · entities (people/orgs/$/dates/refs).
-- The correspondence-intel edge function reads a thread's messages from
-- project_emails and upserts one row here. Downstream: action items feed
-- project_action_items (PR3e), and the composer drafts from this context (PR3f).

CREATE TABLE IF NOT EXISTS public.correspondence_threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gmail_thread_id  text NOT NULL,
  subject          text,
  topic            text,                       -- mirrors the messages' topic (water_billing, …)
  summary          text,                       -- 1–2 sentence plain-English state of the thread
  status           text,                       -- awaiting_us | awaiting_them | in_progress | resolved | fyi
  ball_in_court    text,                       -- who owes the next move (short, e.g. "You", "R4 — Chris Sullivan")
  urgency          text,                       -- low | normal | high
  action_items     jsonb NOT NULL DEFAULT '[]',-- [{title, owner, due_hint}]
  entities         jsonb NOT NULL DEFAULT '{}',-- {people:[],orgs:[],amounts:[],dates:[],refs:[]}
  message_count    integer NOT NULL DEFAULT 0,
  last_message_at  timestamptz,
  analyzed_at      timestamptz,
  model            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, gmail_thread_id)
);
CREATE INDEX IF NOT EXISTS correspondence_threads_project_idx ON public.correspondence_threads (project_id, last_message_at DESC);

ALTER TABLE public.correspondence_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondence_threads_tenant ON public.correspondence_threads
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Link an accepted action item back to the thread it came from (so the loop can
-- close). project_action_items already has linked_entity_type/linked_entity_id;
-- we use ('correspondence_thread', correspondence_threads.id). Track which thread
-- action items have been pushed so we don't double-create.
ALTER TABLE public.correspondence_threads ADD COLUMN IF NOT EXISTS action_items_pushed_at timestamptz;

-- Thread intelligence extraction skill (tunable in Settings → AI Skills).
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES (
  'correspondence_intel',
  'Correspondence thread intelligence',
  'Reads an email thread and extracts its summary, status, ball-in-court, action items, and key entities.',
  '',
  'claude-sonnet-4-6',
  true
)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
