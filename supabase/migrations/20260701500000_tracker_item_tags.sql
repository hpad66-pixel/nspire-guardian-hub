-- Custom, per-project trackable categories on Project Log items — e.g. MS4,
-- illicit discharge, lead & copper, consent decree deadlines, commission items.
-- Free-form multi-tag so teams create and track their OWN regulatory / program
-- buckets without a schema change per category. RLS is inherited from the
-- existing tracker_items_tenant policy (this is only a column add).
ALTER TABLE public.tracker_items
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index so "filter by tag" (tags @> ARRAY['MS4']) stays fast.
CREATE INDEX IF NOT EXISTS tracker_items_tags_idx
  ON public.tracker_items USING gin (tags);
