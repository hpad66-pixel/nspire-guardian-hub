-- Incremental photos on the Project Log: each timestamped update can carry
-- images, so an item builds up a visual history the client follows.
ALTER TABLE public.tracker_updates
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
