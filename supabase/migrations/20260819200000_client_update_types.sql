-- Give client briefings an explicit presentation type so milestones, decisions,
-- risks, progress reports, and general notes can share one governed workflow.
ALTER TABLE public.client_updates
  ADD COLUMN IF NOT EXISTS update_type text NOT NULL DEFAULT 'general';

ALTER TABLE public.client_updates
  DROP CONSTRAINT IF EXISTS client_updates_update_type_check;

ALTER TABLE public.client_updates
  ADD CONSTRAINT client_updates_update_type_check
  CHECK (update_type IN ('general', 'progress', 'milestone', 'decision', 'risk'));

CREATE INDEX IF NOT EXISTS idx_client_updates_project_type
  ON public.client_updates(project_id, update_type, published_at DESC);
