-- Per-project module inheritance for sub-projects.
-- When true, a child project uses the parent's module_config (unless the child
-- has an explicit override for a given slug). Admins toggle this from Project Admin.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS module_inherit_from_parent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.module_inherit_from_parent IS
  'When true, unresolved module_config slugs inherit visibility from the parent project.';
