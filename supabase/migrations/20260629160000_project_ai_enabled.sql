-- Per-client AI switch. Each project is a client engagement, so AI features
-- (Project Log summarize, Otter-transcript ingest, …) are gated per project.
-- Default true; the contractor flips it off for any client that shouldn't get AI.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
