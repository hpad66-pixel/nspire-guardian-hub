-- Optional scheduling dependency between subprojects: "this one starts after
-- that one." Drives the program timeline's sequencing (in-order vs parallel).
-- Separate from parent_project_id (that's containment; this is ordering).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS depends_on_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_depends_on_idx ON public.projects (depends_on_project_id);

NOTIFY pgrst, 'reload schema';
