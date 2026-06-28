-- Per-item client visibility for the Project Log. Default true so the client
-- sees everything (like the original portal), but the contractor can hide any
-- specific item — or filter by category and hide a whole category — keeping
-- internal decisions/divisions private.
ALTER TABLE public.tracker_items
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS tracker_items_client_idx
  ON public.tracker_items (project_id, client_visible, status);
