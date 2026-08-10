-- ────────────────────────────────────────────────────────────────────────────
-- Make program identity unique for every row kind, not just projects.
--
-- 20260809230000 added a unique index on (program_key, project_key) guarded by
-- `WHERE program_meta ? 'project_key'`. That covers the leaf projects and leaves
-- the two kinds above them — the program row and the bucket rows — completely
-- unprotected, because neither carries a project_key.
--
-- The consequence is not a harmless duplicate. Re-running the importer created a
-- second program and a second set of buckets, then re-parented all 31 projects
-- onto the new ones, leaving the originals behind as empty shells. The tree
-- still looked correct while the workspace quietly held two of everything.
--
-- Each kind is now unique on the key it is actually addressed by.
-- ────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.projects_program_key_unique;

-- One project per (program, project key).
CREATE UNIQUE INDEX IF NOT EXISTS projects_program_project_key_unique
  ON public.projects ((program_meta->>'program_key'), (program_meta->>'project_key'))
  WHERE program_meta->>'kind' = 'project';

-- One bucket per (program, bucket key).
CREATE UNIQUE INDEX IF NOT EXISTS projects_program_bucket_key_unique
  ON public.projects ((program_meta->>'program_key'), (program_meta->>'bucket_key'))
  WHERE program_meta->>'kind' = 'bucket';

-- One program row per program key.
CREATE UNIQUE INDEX IF NOT EXISTS projects_program_root_unique
  ON public.projects ((program_meta->>'program_key'))
  WHERE program_meta->>'kind' = 'program';
