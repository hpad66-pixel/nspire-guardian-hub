-- Per-project module visibility.
--
-- Each project can hide/show any sidebar module independently. The stored map
-- is a partial override: { "<module_slug>": true|false }. A missing key means
-- "use the default for this project_type" (see src/lib/projects/moduleVisibility.ts).
-- Empty '{}' therefore preserves existing behaviour for every current project.
--
-- No new RLS needed: projects already carries tenant isolation, and this is a
-- plain additive column on that table.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS module_config jsonb NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
