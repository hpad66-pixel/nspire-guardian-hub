-- Project hierarchy: a project can be a subproject of another (program ▸ project
-- ▸ subproject, any depth). A subproject is a full project with its own scope,
-- schedule and budget; the parent rolls its children up. null parent = top level.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_parent_idx ON public.projects (parent_project_id);

-- Prevent cycles (A ▸ B ▸ A) and self-parenting — otherwise rollups recurse forever.
CREATE OR REPLACE FUNCTION public.projects_prevent_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur uuid;
  depth int := 0;
BEGIN
  IF NEW.parent_project_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_project_id = NEW.id THEN
    RAISE EXCEPTION 'A project cannot be its own parent';
  END IF;
  cur := NEW.parent_project_id;
  WHILE cur IS NOT NULL AND depth < 100 LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'Circular project hierarchy is not allowed';
    END IF;
    SELECT parent_project_id INTO cur FROM public.projects WHERE id = cur;
    depth := depth + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_prevent_cycle_trg ON public.projects;
CREATE TRIGGER projects_prevent_cycle_trg
  BEFORE INSERT OR UPDATE OF parent_project_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_prevent_cycle();

NOTIFY pgrst, 'reload schema';
