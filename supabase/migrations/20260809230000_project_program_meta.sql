-- ────────────────────────────────────────────────────────────────────────────
-- Program provenance on projects.
--
-- The Glorieta Gardens Program of Work (docs/glorieta-program) describes 31
-- projects with far more structure than `projects` carries natively: per-project
-- deliverables, commercial terms (budget basis, authorisation model, APAS role),
-- the regulatory driver, the responsible parties, and a predecessor/successor
-- graph. Native columns take what they can — name, description, scope, phase —
-- and the rest lands here rather than being flattened into prose and lost.
--
-- `program_meta->>'project_key'` ("STM-01") is the stable identity the importer
-- upserts on, which is what makes re-running it safe. The partial unique index
-- enforces that: one row per program key, and rows without a key are unaffected.
--
-- Shape (all optional; the importer writes what the source provides):
--   {
--     "program_key": "GLORIETA",
--     "bucket_key":  "STM",
--     "project_key": "STM-01",
--     "kind":        "program" | "bucket" | "project",
--     "type":        "Planning · Engineering",
--     "status_label":"First deliverable",
--     "flag":        "FIRST DELIVERABLE",
--     "headline":    "...",
--     "deliverables":[...],
--     "commercial":  {...},
--     "parties":     "...",
--     "regulatory_driver": "...",
--     "sequence":    {"predecessors": [...], "successors": [...]},
--     "source":      "docs/glorieta-program/data/Glorieta-ProjOS-Import.json"
--   }
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS program_meta jsonb;

COMMENT ON COLUMN public.projects.program_meta IS
  'Program-of-work provenance: bucket, stable project key, deliverables, commercial terms, regulatory driver and dependency graph. Written by the program importer; see docs/glorieta-program.';

-- One project per program key. Partial, so the 99% of projects with no program
-- key are untouched and can still share a NULL.
CREATE UNIQUE INDEX IF NOT EXISTS projects_program_key_unique
  ON public.projects ((program_meta->>'program_key'), (program_meta->>'project_key'))
  WHERE program_meta ? 'project_key';

-- Bucket lookups ("everything under STM") and program rollups.
CREATE INDEX IF NOT EXISTS projects_program_bucket_idx
  ON public.projects ((program_meta->>'program_key'), (program_meta->>'bucket_key'))
  WHERE program_meta ? 'program_key';
