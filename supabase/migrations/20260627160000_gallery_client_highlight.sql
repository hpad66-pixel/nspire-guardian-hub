-- Client highlights: a "feature this for the client" flag on gallery photos,
-- distinct from hide/archive. Hidden/archived control what the client may NOT
-- see; highlight curates a hand-picked reel the client sees first on the portal.
-- Additive + backwards-compatible (default false, existing flows untouched).

ALTER TABLE public.photo_gallery
  ADD COLUMN IF NOT EXISTS is_client_highlight boolean NOT NULL DEFAULT false;

-- Fast lookup of the curated reel per project (partial: only featured rows).
CREATE INDEX IF NOT EXISTS photo_gallery_project_highlight_idx
  ON public.photo_gallery (project_id, taken_at DESC)
  WHERE is_client_highlight = true;
